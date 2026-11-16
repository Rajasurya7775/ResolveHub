
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import logging

from app.api.deps import get_current_user
from app.core.enums import Role, AccountStatus
from app.core.websocket_manager import manager
from app.db.session import get_db
from app.models import Issue, Project, User
from app.schemas.issue import (
    IssueCreate,
    IssueUpdate,
    IssueResponse,
    ProjectDropdownResponse,
    DeveloperDropdownResponse,
)
from app.services.issue_service import update_issue as update_issue_service

router = APIRouter(
    prefix="/issues",
    tags=["Issue Management"],
)
logger = logging.getLogger(__name__)

# GET: Load active projects for the Report Issue dropdown
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


# GET: Load only active developers for the Assigned To dropdown
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
    project = db.get(Project, issue_data.project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected project does not exist.",
        )

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
        db.commit()
        db.refresh(new_issue)

    except Exception:
        db.rollback()
        logger.exception("Create issue failed")
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
    issue = db.get(Issue, issue_id)

    if issue is None or issue.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found.",
        )

    update_data = issue_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    try:
        updated_issue = update_issue_service(
            db=db,
            issue=issue,
            update_data=update_data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # Broadcast only after successful database update
    await manager.broadcast({
        "event": "dashboard_updated",
        "action": "issue_updated",
        "issue_number": updated_issue.issue_number,
    })

    return updated_issue