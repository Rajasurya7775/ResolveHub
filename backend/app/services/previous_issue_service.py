
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session, joinedload

from app.models import Issue, Project, User


def get_previous_issues(
    db: Session,
    search: str | None = None,
    project_name: str | None = None,
    issue_type: str | None = None,
    shift: str | None = None,
    issue_status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 10,
):
    # Validate pagination
    if page < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page must be greater than or equal to 1",
        )

    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Page size must be between 1 and 100",
        )

    # Validate date range
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="From date cannot be later than To date",
        )

    # Start with all issues
    query = select(Issue).options(joinedload(Issue.project))

    # Search by issue number OR issue title
    if search and search.strip():
        search_value = f"%{search.strip()}%"
        query = query.where(
            or_(
                Issue.issue_number.ilike(search_value),
                Issue.issue_title.ilike(search_value),
            )
        )

    # Filter by project name
    if project_name and project_name.strip():
        query = query.join(Issue.project).where(
            Project.project_name.ilike(project_name.strip())
        )

    # Filter by issue type
    if issue_type:
        query = query.where(Issue.issue_type == issue_type)

    # Filter by shift
    if shift:
        query = query.where(Issue.issue_shift == shift)

    # Filter by status
    if issue_status:
        query = query.where(Issue.issue_status == issue_status)

    # Filter from date
    if date_from:
        start_datetime = datetime.combine(date_from, time.min)
        query = query.where(
            Issue.issue_created_at >= start_datetime
        )

    # Filter to date (include entire day)
    if date_to:
        end_datetime = datetime.combine(
            date_to + timedelta(days=1),
            time.min,
        )
        query = query.where(
            Issue.issue_created_at < end_datetime
        )

    # Count all matching issues before pagination
    total = db.scalar(
        select(func.count()).select_from(
            query.order_by(None).subquery()
        )
    ) or 0

    # Apply pagination
    paged_query = (
        query.options(joinedload(Issue.assignee).load_only(User.full_name))
        .order_by(
            Issue.issue_created_at.desc(),
            Issue.issue_id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    issues = db.scalars(paged_query).unique().all()

    return issues, total
