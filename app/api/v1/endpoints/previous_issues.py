from sqlalchemy import select
from app.models import Project
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.previous_issue import PreviousIssueResponse
from app.services.previous_issue_service import get_previous_issues

router = APIRouter(
    prefix="/previous-issues",
    tags=["Previous Issues"],
)


@router.get("", response_model=list[PreviousIssueResponse])
def read_previous_issues(
    search: str | None = Query(default=None),
    project_name: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    shift: str | None = Query(default=None),
    issue_status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_previous_issues(
        db=db,
        search=search,
        project_name=project_name,
        issue_type=issue_type,
        shift=shift,
        issue_status=issue_status,
        date_from=date_from,
        date_to=date_to,
    )
@router.get("/projects", response_model=list[str])
def get_project_names(db: Session = Depends(get_db)):
    query = (
        select(Project.project_name)
        .distinct()
        .order_by(Project.project_name)
    )

    return db.scalars(query).all()