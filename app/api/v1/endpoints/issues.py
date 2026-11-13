
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.enums import Role, AccountStatus
from app.db.session import get_db
from app.models import Issue, Project, User
from app.schemas.issue import (
    IssueCreate,
    IssueResponse,
    ProjectDropdownResponse,
    DeveloperDropdownResponse,
)

router = APIRouter(
    prefix="/issues",
    tags=["Issue Management"],
)


# GET: Load active projects for the Report Issue dropdown
@router.get(
    "/projects",
    response_model=list[ProjectDropdownResponse],
)
def get_issue_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Project)
        .order_by(Project.project_name.asc())
    )

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
def create_issue(
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate selected project
    project = db.get(Project, issue_data.project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected project does not exist.",
        )

    # Validate selected developer, if provided
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

    # Generate a unique issue number
    issue_number = f"ISS-{uuid4().hex[:10].upper()}"

    new_issue = Issue(
        issue_number=issue_number,
        project_id=issue_data.project_id,
        issue_shift=issue_data.issue_shift,
        issue_time=issue_data.issue_time,
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
        return new_issue

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create issue. Please try again.",
        )
