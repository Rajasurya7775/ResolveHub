from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select, or_
from sqlalchemy.orm import Session, joinedload

from app.models import Issue, Project, User


def get_my_issues(
    db: Session,
    current_user: User,
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

    # Identify logged-in user's role
    raw_role = getattr(current_user.role, "value", current_user.role)
    role = str(raw_role).strip().upper()

    # Base query
    query = (
        select(Issue)
        .options(joinedload(Issue.project))
    )

    # Role-based issue filtering
    if role in ("SUPPORT", "SUPPORTER"):
        # Supporter sees issues raised by them
        query = query.where(
            Issue.issue_created_by == current_user.user_id
        )

    elif role == "DEVELOPER":
        # Developer sees issues assigned to them
        query = query.where(
            Issue.assigned_to == current_user.user_id
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view these issues",
        )

    # Search by issue number or title
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

    # Filter from date (inclusive)
    if date_from:
        start_datetime = datetime.combine(date_from, time.min)
        query = query.where(
            Issue.issue_created_at >= start_datetime
        )

    # Filter to date (inclusive)
    if date_to:
        end_datetime = datetime.combine(
            date_to + timedelta(days=1),
            time.min,
        )
        query = query.where(
            Issue.issue_created_at < end_datetime
        )

    # Total count with the same filters (before limit/offset)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    # Paged results: newest first, with project and assignee loaded
    paged_query = (
        query.options(joinedload(Issue.assignee).load_only(User.full_name))
        .order_by(Issue.issue_created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    issues = db.scalars(paged_query).unique().all()

    return issues, total
