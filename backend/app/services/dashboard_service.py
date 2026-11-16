
from datetime import date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import IssueStatus, Role
from app.models import Issue, User
from app.utils.shifts import SHIFT_WINDOWS, get_shift


def get_user_issue_filter(user: User):
    role = getattr(user.role, "value", user.role)
    role = str(role).strip().upper()

    if role in ("SUPPORT", "SUPPORTER"):
        return Issue.issue_created_by == user.user_id

    if role == "DEVELOPER":
        return Issue.assigned_to == user.user_id

    raise ValueError(f"Unsupported dashboard role: {role}")


def _count(db: Session, *conditions) -> int:
    stmt = (
        select(func.count())
        .select_from(Issue)
        .where(*conditions)
    )

    return db.execute(stmt).scalar_one()


def get_summary(db: Session, user: User) -> dict:
    user_filter = get_user_issue_filter(user)

    return {
        "total_logged_issues": _count(
            db,
            user_filter
        ),
        "active_issues": _count(
            db,
            user_filter,
            Issue.issue_status != IssueStatus.RESOLVED
        ),
        "resolved_issues": _count(
            db,
            user_filter,
            Issue.issue_status == IssueStatus.RESOLVED
        ),
        "in_progress_issues": _count(
            db,
            user_filter,
            Issue.issue_status == IssueStatus.IN_PROGRESS
        ),
        "open_issues": _count(
            db,
            user_filter,
            Issue.issue_status == IssueStatus.OPEN
        ),
    }


def get_current_shift() -> dict:
    shift, shift_date = get_shift()
    starts_at, ends_at = SHIFT_WINDOWS[shift]

    return {
        "shift": shift,
        "shift_date": shift_date.isoformat(),
        "starts_at": starts_at,
        "ends_at": ends_at,
    }


def get_weekly_priority_distribution(
    db: Session,
    user: User
) -> dict:

    # Current week's Monday
    today = date.today()
    current_monday = today - timedelta(days=today.weekday())

    # Current week + previous 3 weeks
    first_week_monday = current_monday - timedelta(weeks=3)
    next_monday = current_monday + timedelta(weeks=1)

    start_datetime = datetime.combine(
        first_week_monday,
        datetime.min.time()
    )

    end_datetime = datetime.combine(
        next_monday,
        datetime.min.time()
    )

    # Fetch assignments belonging to the logged-in developer.
    # Resolved issues are included because they were assigned.
    stmt = (
        select(
            Issue.issue_priority,
            Issue.assigned_at
        )
        .where(
            Issue.assigned_to == user.user_id,
            Issue.assigned_at >= start_datetime,
            Issue.assigned_at < end_datetime
        )
    )

    rows = db.execute(stmt).all()

    # Four weeks, oldest to newest
    weekly_counts = [
        {
            "high": 0,
            "medium": 0,
            "low": 0
        }
        for _ in range(4)
    ]

    total_assigned = 0
    high_priority = 0
    medium_priority = 0
    low_priority = 0

    for priority, assigned_at in rows:

        if assigned_at is None:
            continue

        assigned_date = assigned_at.date()

        week_index = (
            assigned_date - first_week_monday
        ).days // 7

        if week_index < 0 or week_index > 3:
            continue

        total_assigned += 1

        priority_value = getattr(
            priority,
            "value",
            priority
        )

        priority_value = str(priority_value).strip().upper()

        if priority_value == "P1":
            weekly_counts[week_index]["high"] += 1
            high_priority += 1

        elif priority_value == "P2":
            weekly_counts[week_index]["medium"] += 1
            medium_priority += 1

        elif priority_value == "P3":
            weekly_counts[week_index]["low"] += 1
            low_priority += 1

    return {
        "labels": [
            "Week 1",
            "Week 2",
            "Week 3",
            "Week 4"
        ],
        "high": [
            week["high"] for week in weekly_counts
        ],
        "medium": [
            week["medium"] for week in weekly_counts
        ],
        "low": [
            week["low"] for week in weekly_counts
        ],
        "stats": {
            "total_assigned": total_assigned,
            "high_priority": high_priority,
            "medium_priority": medium_priority,
            "low_priority": low_priority
        }
    }
