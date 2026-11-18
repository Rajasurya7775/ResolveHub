from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Issue,
    User,
    IssueAssignmentHistory,
    IssueStatusHistory,
)


OPEN_STATUSES = {"OPEN", "IN_PROGRESS", "HOLD"}


def as_utc(value):
    """Normalize database timestamps to UTC-aware datetimes."""
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def get_developer_weekly_summary(
    db: Session,
    current_user: User,
    week_start: date,
):
    role = str(
        getattr(current_user.role, "value", current_user.role)
    ).strip().upper()

    if role != "DEVELOPER":
        raise HTTPException(
            status_code=403,
            detail="Only developers can access weekly summaries.",
        )

    if week_start.weekday() != 0:
        raise HTTPException(
            status_code=400,
            detail="Week start must be a Monday.",
        )

    week_end = week_start + timedelta(days=6)

    start_dt = datetime.combine(
        week_start, time.min, tzinfo=timezone.utc
    )
    next_week_dt = datetime.combine(
        week_end + timedelta(days=1),
        time.min,
        tzinfo=timezone.utc,
    )
    end_dt = next_week_dt - timedelta(microseconds=1)

    issues = db.scalars(
        select(Issue)
        .options(joinedload(Issue.project))
        .order_by(Issue.issue_created_at)
    ).unique().all()

    assignments = db.scalars(
        select(IssueAssignmentHistory)
        .order_by(IssueAssignmentHistory.changed_at)
    ).all()

    status_events = db.scalars(
        select(IssueStatusHistory)
        .order_by(IssueStatusHistory.changed_at)
    ).all()

    assignment_by_issue = {}
    status_by_issue = {}

    for event in assignments:
        assignment_by_issue.setdefault(event.issue_id, []).append(event)

    for event in status_events:
        status_by_issue.setdefault(event.issue_id, []).append(event)

    def assignment_at(issue, moment):
        events = assignment_by_issue.get(issue.issue_id, [])

        previous = None
        for event in events:
            changed_at = as_utc(event.changed_at)
            if changed_at <= moment:
                previous = event.new_developer_id
            else:
                break

        return previous

    def status_at(issue, moment):
        events = status_by_issue.get(issue.issue_id, [])

        previous = None
        for event in events:
            changed_at = as_utc(event.changed_at)
            if changed_at <= moment:
                previous = event.new_status
            else:
                break

        # Fallback for legacy issues without status history
        if previous is None:
            previous = issue.issue_status

        return str(previous).strip().upper()

    def serialize(issue):
        return {
            "issue_id": str(issue.issue_id),
            "issue_number": issue.issue_number,
            "issue_title": issue.issue_title,
            "issue_type": issue.issue_type,
            "issue_status": status_at(issue, end_dt),
            "issue_priority": issue.issue_priority,
            "project_name": (
                issue.project.project_name if issue.project else None
            ),
        }

    previous_unresolved = []
    resolved_this_week = []
    still_unresolved = []
    newly_assigned = []
    total_open = []

    for issue in issues:
        events = assignment_by_issue.get(issue.issue_id, [])
        status_events_for_issue = status_by_issue.get(issue.issue_id, [])

        # Was this issue assigned to this developer at the beginning
        # of the reporting week?
        developer_at_start = assignment_at(issue, start_dt)

        # What was its status at the beginning of the reporting week?
        status_at_start = status_at(issue, start_dt)

        if (
            developer_at_start == current_user.user_id
            and status_at_start in OPEN_STATUSES
        ):
            previous_unresolved.append(issue)

        # Was it resolved during this reporting week?
        for event in status_events_for_issue:
            changed_at = as_utc(event.changed_at)

            if (
                start_dt <= changed_at < next_week_dt
                and str(event.new_status).strip().upper() == "RESOLVED"
                and assignment_at(issue, changed_at) == current_user.user_id
            ):
                resolved_this_week.append(issue)
                break

        # Was this issue assigned to the developer during the week?
        for event in events:
            changed_at = as_utc(event.changed_at)

            if (
                start_dt <= changed_at < next_week_dt
                and event.new_developer_id == current_user.user_id
            ):
                newly_assigned.append(issue)
                break

        # Was it still assigned to the developer and open at week end?
        developer_at_end = assignment_at(issue, end_dt)
        status_at_end = status_at(issue, end_dt)

        if (
            developer_at_end == current_user.user_id
            and status_at_end in OPEN_STATUSES
        ):
            total_open.append(issue)

            if issue in previous_unresolved:
                still_unresolved.append(issue)

    # Ensure unique issue IDs in every report section
    def unique(items):
        return list({
            issue.issue_id: issue for issue in items
        }.values())

    previous_unresolved = unique(previous_unresolved)
    resolved_this_week = unique(resolved_this_week)
    still_unresolved = unique(still_unresolved)
    newly_assigned = unique(newly_assigned)
    total_open = unique(total_open)

    return {
        "developer": {
            "user_id": current_user.user_id,
            "employee_id": current_user.employee_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
        },
        "week": {
            "week_start": week_start,
            "week_end": week_end,
        },
        "summary": {
            "previous_week_unresolved": len(previous_unresolved),
            "resolved_this_week": len(resolved_this_week),
            "still_unresolved": len(still_unresolved),
            "newly_assigned_this_week": len(newly_assigned),
            "total_open_issues": len(total_open),
        },
        "issues": {
            "previous_week_unresolved": [
                serialize(issue) for issue in previous_unresolved
            ],
            "resolved_this_week": [
                serialize(issue) for issue in resolved_this_week
            ],
            "still_unresolved": [
                serialize(issue) for issue in still_unresolved
            ],
            "newly_assigned_this_week": [
                serialize(issue) for issue in newly_assigned
            ],
            "total_open_issues": [
                serialize(issue) for issue in total_open
            ],
        },
    }