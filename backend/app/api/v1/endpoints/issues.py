
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import logging
from datetime import timezone
from app.api.deps import get_current_user
from app.core.enums import Role, AccountStatus
from app.core.websocket_manager import manager
from app.db.session import get_db
from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueResponse,
    ProjectDropdownResponse,
    DeveloperDropdownResponse,
)
from app.models import (
    Issue,
    Project,
    User,
    IssueAssignmentHistory,
    IssueStatusHistory,
)
from app.services.issue_service import update_issue as update_issue_service

router = APIRouter(
    prefix="/issues",
    tags=["Issue Management"],
)
logger = logging.getLogger(__name__)

# GET: Load active projects
@router.get(
    "/projects",
    response_model=list[ProjectDropdownResponse],
)
def get_issue_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Project).order_by(Project.project_name.asc())
    return db.scalars(query).all()


# GET: Load active developers
@router.get(
    "/developers",
    response_model=list[DeveloperDropdownResponse],
)
def get_issue_developers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(User)
        .where(
            User.role == Role.DEVELOPER,
            User.account_status == AccountStatus.ACTIVE,
        )
        .order_by(User.full_name.asc())
    )
    return db.scalars(query).all()


# POST: Create a new issue
@router.post(
    "",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate project
    project = db.get(Project, issue_data.project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected project does not exist.",
        )

    # Validate selected developer
    if issue_data.assigned_to is not None:
        developer = db.get(User, issue_data.assigned_to)

        if (
            developer is None
            or developer.role != Role.DEVELOPER
            or developer.account_status != AccountStatus.ACTIVE
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected developer is not active or valid.",
            )

    # Generate unique issue number
    issue_number = f"ISS-{uuid4().hex[:10].upper()}"

    new_issue = Issue(
        issue_number=issue_number,
        project_id=issue_data.project_id,
        issue_shift=issue_data.issue_shift,
        issue_time=issue_data.issue_time,
        shift_date=issue_data.issue_time.date(),
        issue_title=issue_data.issue_title,
        issue_type=issue_data.issue_type,
        issue_description=issue_data.issue_description,
        rca=issue_data.rca,
        issue_status="OPEN",
        issue_priority=issue_data.issue_priority,
        issue_created_by=current_user.user_id,
        assigned_to=issue_data.assigned_to,
    )

    try:
        db.add(new_issue)

        # Insert issue and retrieve database-generated timestamp
        db.flush()
        db.refresh(
            new_issue,
            attribute_names=["issue_created_at"],
        )

        # Set assigned timestamp equal to creation timestamp
        # Set assigned timestamp equal to creation timestamp
        new_issue.assigned_at = new_issue.issue_created_at

        created_at = new_issue.issue_created_at

        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        # Record initial status history
        db.add(
            IssueStatusHistory(
                issue_id=new_issue.issue_id,
                previous_status=None,
                new_status="OPEN",
                changed_by_user_id=current_user.user_id,
                changed_at=created_at,
            )
        )

        # Record initial assignment history
        if new_issue.assigned_to is not None:
            db.add(
                IssueAssignmentHistory(
                    issue_id=new_issue.issue_id,
                    previous_developer_id=None,
                    new_developer_id=new_issue.assigned_to,
                    changed_by_user_id=current_user.user_id,
                    changed_at=created_at,
                )
        )

        db.commit()
        db.refresh(new_issue)

        return new_issue

    except Exception as e:
        db.rollback()

        print("ISSUE CREATION ERROR:", str(e))

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create issue. Please try again.",
        )

    # Notify connected dashboard clients after successful commit
    await manager.broadcast({
        "event": "dashboard_updated",
        "action": "issue_created",
        "issue_number": new_issue.issue_number,
    })

    return new_issue
# PATCH: Update an existing issue
@router.patch(
    "/{issue_id}",
    response_model=IssueResponse,
)
async def update_issue_endpoint(
    issue_id: UUID,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated_issue = update_issue_service(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
        update_data=issue_data.model_dump(exclude_unset=True),
    )

    await manager.broadcast({
    "event": "dashboard_updated",
    "action": "issue_created",
    "issue_number": new_issue.issue_number,
    })

    return new_issue