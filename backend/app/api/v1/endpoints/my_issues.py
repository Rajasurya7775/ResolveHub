
from datetime import date
from math import ceil
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User, Project
from app.schemas.my_issue import MyIssueResponse
from app.schemas.issue import ProjectDropdownResponse
from app.services.my_issue_service import get_my_issues
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


# Get My Issues with filters and pagination
@router.get("")
def read_my_issues(
    search: str | None = Query(default=None),
    project_name: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    shift: str | None = Query(default=None),
    issue_status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),

    # Pagination
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issues, total = get_my_issues(
        db=db,
        current_user=current_user,
        search=search,
        project_name=project_name,
        issue_type=issue_type,
        shift=shift,
        issue_status=issue_status,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )

    total_pages = ceil(total / page_size) if total else 0

    return {
        "success": True,
        "message": "Issues fetched successfully",
        "data": {
            "items": [MyIssueResponse.model_validate(issue) for issue in issues],
            "pagination": {
                "current_page": page,
                "page_size": page_size,
                "total_items": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1 and total_pages > 0,
            },
        },
    }