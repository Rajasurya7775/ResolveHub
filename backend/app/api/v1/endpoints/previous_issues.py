
from math import ceil
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Project
from app.schemas.previous_issue import PreviousIssueResponse
from app.services.previous_issue_service import get_previous_issues

router = APIRouter(
    prefix="/previous-issues",
    tags=["Previous Issues"],
)


# GET: Fetch all issues with filters and pagination
@router.get("")
def read_previous_issues(
    search: str | None = Query(default=None),
    project_name: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    shift: str | None = Query(default=None),
    issue_status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    issues, total = get_previous_issues(
        db=db,
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
            "items": [
                PreviousIssueResponse.model_validate(issue)
                for issue in issues
            ],
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


# GET: Load project names for filters
@router.get("/projects", response_model=list[str])
def get_project_names(db: Session = Depends(get_db)):
    query = (
        select(Project.project_name)
        .distinct()
        .order_by(Project.project_name)
    )

    return db.scalars(query).all()
