
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import IssueStatus
from app.models import Issue, User
from app.utils.shifts import SHIFT_WINDOWS, get_shift


def _count(db: Session, *conditions) -> int:
    stmt = (
        select(func.count())
        .select_from(Issue)
        .where(*conditions)
    )

    return db.execute(stmt).scalar_one()


def get_summary(db: Session, user: User) -> dict:
    user_filter = Issue.issue_created_by == user.user_id

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
