from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.enums import IssuePriority, IssueType
from app.models.issue import Issue
from app.models.project import Project
from app.schemas.issue import IssueCreate
from app.utils.issue_code import generate_issue_number
from app.utils.shifts import APP_TZ, get_shift, previous_shift


# --------------------------------------------------
# CREATE ISSUE
# --------------------------------------------------

def create_issue(
    db: Session,
    issue_data: IssueCreate,
    user_id: int
) -> Issue:

    project = db.get(Project, issue_data.project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    now = datetime.now(APP_TZ)
    shift, shift_date = get_shift(now)

    issue_number = generate_issue_number(db)

    new_issue = Issue(
        issue_number=issue_number,
        project_id=issue_data.project_id,
        issue_shift=shift,
        shift_date=shift_date,
        issue_time=now.replace(tzinfo=None),
        issue_title=issue_data.issue_title,
        issue_type=issue_data.issue_type.value,
        issue_description=issue_data.issue_description,
        issue_priority=issue_data.issue_priority.value,
        issue_status="OPEN",
        issue_created_by=user_id
    )

    try:
        db.add(new_issue)
        db.commit()
        db.refresh(new_issue)
    except Exception:
        db.rollback()
        raise

    return new_issue


# --------------------------------------------------
# COMMON FILTERING FUNCTION
# --------------------------------------------------

def apply_issue_filters(
    query,
    project_id: int | None = None,
    issue_status: str | None = None,
    issue_priority: str | None = None,
    issue_type: str | None = None,
    search: str | None = None,
):

    if project_id is not None:
        query = query.filter(Issue.project_id == project_id)

    if issue_status:
        query = query.filter(Issue.issue_status == issue_status)

    if issue_priority:
        query = query.filter(Issue.issue_priority == issue_priority)

    if issue_type:
        query = query.filter(Issue.issue_type == issue_type)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Issue.issue_number.ilike(search_term),
                Issue.issue_title.ilike(search_term)
            )
        )

    return query


# --------------------------------------------------
# COMMON PAGINATION FUNCTION
# --------------------------------------------------

def paginate_issues(
    query,
    page: int = 1,
    page_size: int = 10
) -> tuple[list[Issue], int]:

    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be greater than 0"
        )

    if not 1 <= page_size <= 100:
        raise HTTPException(
            status_code=400,
            detail="Page size must be between 1 and 100"
        )

    total = query.count()

    issues = (
        query
        .order_by(Issue.issue_created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return issues, total


# --------------------------------------------------
# MY ISSUES
# --------------------------------------------------

def get_my_issues(
    db: Session,
    user_id: int,
    project_id: int | None = None,
    issue_status: str | None = None,
    issue_priority: str | None = None,
    issue_type: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10
) -> tuple[list[Issue], int]:

    query = db.query(Issue).filter(
        Issue.issue_created_by == user_id,
        Issue.deleted_at.is_(None)
    )

    query = apply_issue_filters(
        query,
        project_id,
        issue_status,
        issue_priority,
        issue_type,
        search
    )

    return paginate_issues(query, page, page_size)


# --------------------------------------------------
# PREVIOUS SHIFT ISSUES
# --------------------------------------------------

def get_previous_shift_issues(
    db: Session,
    project_id: int | None = None,
    issue_status: str | None = None,
    issue_priority: str | None = None,
    issue_type: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20
) -> tuple[list[Issue], int]:

    now = datetime.now(APP_TZ)

    current_shift, current_shift_date = get_shift(now)

    previous_shift_name, previous_shift_date = previous_shift(
        current_shift,
        current_shift_date
    )

    query = db.query(Issue).filter(
        Issue.issue_shift == previous_shift_name,
        Issue.shift_date == previous_shift_date,
        Issue.deleted_at.is_(None)
    )

    query = apply_issue_filters(
        query,
        project_id,
        issue_status,
        issue_priority,
        issue_type,
        search
    )

    return paginate_issues(query, page, page_size)


# --------------------------------------------------
# OVERALL ISSUES
# --------------------------------------------------

def get_overall_issues(
    db: Session,
    project_id: int | None = None,
    issue_status: str | None = None,
    issue_priority: str | None = None,
    issue_type: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 10
) -> tuple[list[Issue], int]:

    query = db.query(Issue).filter(
        Issue.deleted_at.is_(None)
    )

    query = apply_issue_filters(
        query,
        project_id,
        issue_status,
        issue_priority,
        issue_type,
        search
    )

    return paginate_issues(query, page, page_size)


# --------------------------------------------------
# GET ISSUE BY ID
# --------------------------------------------------

def get_issue_by_id(
    db: Session,
    issue_id: UUID
) -> Issue | None:

    return db.query(Issue).filter(
        Issue.issue_id == issue_id,
        Issue.deleted_at.is_(None)
    ).first()


# --------------------------------------------------
# UPDATE ISSUE
# --------------------------------------------------

def update_issue(
    db: Session,
    issue: Issue,
    update_data: dict[str, Any]
) -> Issue:

    allowed_fields = {
        "issue_title",
        "issue_type",
        "issue_description",
        "issue_priority",
        "rca"
    }

    for field, value in update_data.items():
        if field not in allowed_fields:
            raise ValueError(f"Field cannot be updated: {field}")

        if field in {"issue_type", "issue_priority"} and value is not None:
            value = value.value if hasattr(value, "value") else value

        setattr(issue, field, value)

    try:
        db.commit()
        db.refresh(issue)
    except Exception:
        db.rollback()
        raise

    return issue


# --------------------------------------------------
# SOFT DELETE ISSUE
# --------------------------------------------------

def delete_issue(
    db: Session,
    issue: Issue,
    deleted_by: int
) -> Issue:

    issue.deleted_at = datetime.now(APP_TZ).replace(tzinfo=None)
    issue.deleted_by = deleted_by

    try:
        db.commit()
        db.refresh(issue)
    except Exception:
        db.rollback()
        raise

    return issue