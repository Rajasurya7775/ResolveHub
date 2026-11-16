
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User, Project
from app.schemas.my_issue import MyIssueResponse
from app.schemas.issue import ProjectDropdownResponse, IssueUpdate
from app.services.my_issue_service import get_my_issues
from app.services.issue_service import (
    get_issue_details,
    update_issue,
    delete_issue,
)
from app.api.deps import get_current_user


router = APIRouter(
    prefix="/my-issues",
    tags=["My Issues"],
)


# Get all projects for My Issues dropdown
@router.get("/projects", response_model=list[ProjectDropdownResponse])
def get_my_issue_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Project).order_by(Project.project_name.asc())
    return db.scalars(query).all()


# Get My Issues with filters
@router.get("", response_model=list[MyIssueResponse])
def read_my_issues(
    search: str | None = Query(default=None),
    project_name: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    shift: str | None = Query(default=None),
    issue_status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_issues(
        db=db,
        current_user=current_user,
        search=search,
        project_name=project_name,
        issue_type=issue_type,
        shift=shift,
        issue_status=issue_status,
        date_from=date_from,
        date_to=date_to,
    )


# Get detailed issue when user clicks an issue
@router.get("/{issue_id}", response_model=MyIssueResponse)
def read_my_issue_details(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_issue_details(db, current_user, issue_id)


# Update issue
@router.patch("/{issue_id}", response_model=MyIssueResponse)
def edit_my_issue(
    issue_id: UUID,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_issue(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
        update_data=issue_data.model_dump(exclude_unset=True),
    )


# Delete issue
@router.delete("/{issue_id}")
def remove_my_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return delete_issue(db, current_user, issue_id)
