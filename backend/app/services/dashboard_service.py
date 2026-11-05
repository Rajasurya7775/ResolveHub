from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import IssuePriority, IssueStatus
from app.models import Issue, User
from app.utils.shifts import SHIFT_WINDOWS, get_shift


def _count(db: Session, *conditions) -> int:
    stmt = (
        select(func.count())
        .select_from(Issue)
        .where(Issue.deleted_at.is_(None), *conditions)
    )
    return db.execute(stmt).scalar_one()


def get_summary(db: Session, user: User) -> dict:
    shift, shift_date = get_shift()
    return {
        "total_issues": _count(db),
        "in_progress": _count(db, Issue.issue_status == IssueStatus.IN_PROGRESS),
        "resolved": _count(db, Issue.issue_status == IssueStatus.RESOLVED),
        "hold": _count(db, Issue.issue_status == IssueStatus.HOLD),
        "p1_open": _count(
            db,
            Issue.issue_priority == IssuePriority.P1,
            Issue.issue_status != IssueStatus.RESOLVED,
        ),
        "my_issues": _count(db, Issue.issue_created_by == user.user_id),
        "created_this_shift": _count(
            db, Issue.shift == shift, Issue.shift_date == shift_date
        ),
        "current_shift": shift,
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