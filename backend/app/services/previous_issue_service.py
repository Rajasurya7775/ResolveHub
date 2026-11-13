
from datetime import date, datetime, time, timedelta
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session, joinedload

from app.models import Issue, Project


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
    # Validate date range
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="From date cannot be later than To date",
        )

    # Build filters
    filters = []

    if search and search.strip():
        search_value = f"%{search.strip()}%"
        filters.append(
            or_(
                Issue.issue_number.ilike(search_value),
                Issue.issue_title.ilike(search_value),
            )
        )

    if project_name and project_name.strip():
        filters.append(
            Issue.project.has(
                Project.project_name.ilike(project_name.strip())
            )
        )

    if issue_type:
        filters.append(Issue.issue_type == issue_type)

    if shift:
        filters.append(Issue.issue_shift == shift)

    if issue_status:
        filters.append(Issue.issue_status == issue_status)

    if date_from:
        start_datetime = datetime.combine(date_from, time.min)
        filters.append(Issue.issue_created_at >= start_datetime)

    if date_to:
        end_datetime = datetime.combine(
            date_to + timedelta(days=1),
            time.min,
        )
        filters.append(Issue.issue_created_at < end_datetime)

    # Get total count before pagination
    count_query = (
        select(func.count())
        .select_from(Issue)
        .where(*filters)
    )
    total = db.scalar(count_query) or 0

    # Fetch paginated issues
    query = (
        select(Issue)
        .options(joinedload(Issue.project))
        .where(*filters)
        .order_by(Issue.issue_created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    issues = db.scalars(query).unique().all()

    return issues, total
 