
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.enums import Role
from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User, Issue
from app.schemas.dashboard import CurrentShiftResponse, DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPPORTER)),
):
    return dashboard_service.get_summary(db, current_user)


@router.get("/current-shift", response_model=CurrentShiftResponse)
def current_shift(
    current_user: User = Depends(require_roles(Role.SUPPORTER)),
):
    return dashboard_service.get_current_shift()


@router.get("/issue-trends")
def issue_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPPORTER)),
):
    # Calculate current calendar week (Monday to Sunday)
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    start_datetime = datetime.combine(week_start, time.min)
    end_datetime = datetime.combine(week_end, time.min)

    # Count issues by issue_time and current status
    results = (
        db.query(
            func.date(Issue.issue_time).label("issue_day"),
            func.sum(
                case(
                    (
                        Issue.issue_status.in_(
                            ["OPEN", "IN_PROGRESS", "HOLD"]
                        ),
                        1,
                    ),
                    else_=0,
                )
            ).label("open_tickets"),
            func.sum(
                case(
                    (Issue.issue_status == "RESOLVED", 1),
                    else_=0,
                )
            ).label("resolved_tickets"),
        )
        .filter(
            Issue.issue_created_by == current_user.user_id,
            Issue.issue_time >= start_datetime,
            Issue.issue_time < end_datetime,
        )
        .group_by(func.date(Issue.issue_time))
        .all()
    )

    # Initialize all seven days with zero values
    daily_counts = {
        week_start + timedelta(days=i): {
            "open_tickets": 0,
            "resolved_tickets": 0,
        }
        for i in range(7)
    }

    # Fill in actual database counts
    for row in results:
        daily_counts[row.issue_day] = {
            "open_tickets": int(row.open_tickets or 0),
            "resolved_tickets": int(row.resolved_tickets or 0),
        }

    # Prepare chart data
    labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    open_tickets = [
        daily_counts[week_start + timedelta(days=i)]["open_tickets"]
        for i in range(7)
    ]

    resolved_tickets = [
        daily_counts[week_start + timedelta(days=i)]["resolved_tickets"]
        for i in range(7)
    ]

    # 1. Peak Day
    peak_index = open_tickets.index(max(open_tickets))
    peak_day = labels[peak_index]
    peak_day_count = open_tickets[peak_index]

    # 2. Resolution Rate
    total_open = sum(open_tickets)
    total_resolved = sum(resolved_tickets)
    total_logged = total_open + total_resolved

    resolution_rate = (
        round((total_resolved / total_logged) * 100, 2)
        if total_logged > 0
        else 0
    )

    # 3. Net Backlog Trend
    net_backlog = total_open - total_resolved

    if net_backlog > 0:
        backlog_direction = "increased"
    elif net_backlog < 0:
        backlog_direction = "decreased"
    else:
        backlog_direction = "unchanged"

    return {
        "labels": labels,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved_tickets,
        "stats": {
            "peak_day": peak_day,
            "peak_day_open_count": peak_day_count,
            "resolution_rate": resolution_rate,
            "total_resolved": total_resolved,
            "total_logged": total_logged,
            "net_backlog": net_backlog,
            "net_backlog_direction": backlog_direction,
        },
    }


@router.get("/issue-type-distribution")
def issue_type_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPPORTER)),
):
    from datetime import datetime, timedelta, timezone

    # Category configuration
    categories = ["Front-end", "Backend", "Database", "Others"]

    def normalize_type(issue_type):
        value = (issue_type or "").strip().upper()

        if value == "FRONT-END":
            return "Front-end"
        elif value == "BACKEND":
            return "Backend"
        elif value == "DATABASE":
            return "Database"
        else:
            return "Others"

    # Fetch issues belonging to the logged-in user
    issues = (
        db.query(Issue)
        .filter(Issue.issue_created_by == current_user.user_id)
        .all()
    )

    # Initialize counters
    counts = {category: 0 for category in categories}
    current_week = {category: 0 for category in categories}
    previous_week = {category: 0 for category in categories}

    resolution_times = {category: [] for category in categories}

    # Use UTC for consistent datetime comparisons
    now = datetime.now(timezone.utc)
    current_period_start = now - timedelta(days=7)
    previous_period_start = now - timedelta(days=14)

    # Process issues
    for issue in issues:
        category = normalize_type(issue.issue_type)

        # All-time category count
        counts[category] += 1

        # Compare the latest 7 days with the previous 7 days
        if issue.issue_time is not None:
            issue_time = issue.issue_time

            if issue_time.tzinfo is None:
                issue_time = issue_time.replace(tzinfo=timezone.utc)
            else:
                issue_time = issue_time.astimezone(timezone.utc)

            if current_period_start <= issue_time <= now:
                current_week[category] += 1

            elif previous_period_start <= issue_time < current_period_start:
                previous_week[category] += 1

        # Calculate resolution duration in hours
        if (
            issue.issue_status == "RESOLVED"
            and issue.issue_created_at is not None
            and issue.resolved_at is not None
        ):
            created_at = issue.issue_created_at
            resolved_at = issue.resolved_at

            # Convert both timestamps to UTC
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            else:
                created_at = created_at.astimezone(timezone.utc)

            if resolved_at.tzinfo is None:
                resolved_at = resolved_at.replace(tzinfo=timezone.utc)
            else:
                resolved_at = resolved_at.astimezone(timezone.utc)

            duration = (
                resolved_at - created_at
            ).total_seconds() / 3600

            if duration >= 0:
                resolution_times[category].append(duration)

    # 1. Top Category
    total_issues = sum(counts.values())

    if total_issues > 0:
        top_category = max(categories, key=lambda c: counts[c])
        top_percentage = round(
            (counts[top_category] / total_issues) * 100, 2
        )
    else:
        top_category = None
        top_percentage = 0

    # 2. Fastest-growing Type
    growth = {
        category: current_week[category] - previous_week[category]
        for category in categories
    }

    fastest_growing_type = max(categories, key=lambda c: growth[c])
    growth_value = growth[fastest_growing_type]

    if growth_value > 0:
        growth_direction = "increased"
    elif growth_value < 0:
        growth_direction = "decreased"
    else:
        growth_direction = "unchanged"

    # 3. Slowest to Resolve
    average_resolution = {}

    for category in categories:
        times = resolution_times[category]

        average_resolution[category] = (
            round(sum(times) / len(times), 2)
            if times
            else None
        )

    categories_with_resolution = {
        category: average_resolution[category]
        for category in categories
        if average_resolution[category] is not None
    }

    if categories_with_resolution:
        slowest_category = max(
            categories_with_resolution,
            key=categories_with_resolution.get,
        )
        slowest_hours = categories_with_resolution[slowest_category]
    else:
        slowest_category = None
        slowest_hours = None

    return {
        "labels": categories,
        "counts": [counts[category] for category in categories],
        "stats": {
            "top_category": top_category,
            "top_category_count": counts[top_category] if top_category else 0,
            "top_category_percentage": top_percentage,
            "fastest_growing_type": fastest_growing_type,
            "growth_count": growth_value,
            "growth_direction": growth_direction,
            "current_week_counts": current_week,
            "previous_week_counts": previous_week,
            "slowest_to_resolve": slowest_category,
            "average_resolution_hours": slowest_hours,
            "average_resolution_by_type": average_resolution,
        },
    }
