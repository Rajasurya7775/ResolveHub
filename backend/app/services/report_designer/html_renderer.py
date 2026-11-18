
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.schemas.report_design import ReportDesign


APP_DIR = Path(__file__).resolve().parents[2]

TEMPLATE_DIR = APP_DIR / "templates" / "weekly_reports"


environment = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
)


METRIC_LABELS = {
    "previous_week_unresolved": "Previous Week Unresolved",
    "resolved_this_week": "Resolved This Week",
    "still_unresolved": "Still Unresolved",
    "newly_assigned_this_week": "Newly Assigned",
    "total_open_issues": "Total Open Issues",
}


PRIORITY_COLORS = {
    "CRITICAL": "#C00000",
    "HIGH": "#F15A24",
    "MEDIUM": "#F4A261",
    "LOW": "#16A085",
}


STATUS_COLORS = {
    "OPEN": "#F15A24",
    "IN_PROGRESS": "#2878B5",
    "HOLD": "#F4A261",
    "RESOLVED": "#16A085",
    "CLOSED": "#777777",
}


def build_metrics(report: dict) -> list:
    summary = report.get("summary", {})

    return [
        {
            "label": label,
            "value": summary.get(key, 0),
        }
        for key, label in METRIC_LABELS.items()
    ]


def build_chart_data(items: list, field: str, colors: dict) -> list:
    counts = {}

    for item in items:
        if not isinstance(item, dict):
            continue

        value = str(item.get(field) or "UNKNOWN").strip().upper()

        counts[value] = counts.get(value, 0) + 1

    maximum = max(counts.values(), default=0)

    return [
        {
            "label": label,
            "value": value,
            "percentage": max(3, round(value / maximum * 100))
            if maximum else 0,
            "color": colors.get(label, "#777777"),
        }
        for label, value in sorted(counts.items())
    ]


def build_risk_explanation(report: dict) -> str:
    summary = report.get("summary", {})

    return (
        f"There are {summary.get('still_unresolved', 0)} "
        "previously unresolved issues still open, and "
        f"{summary.get('newly_assigned_this_week', 0)} "
        "new issues were assigned during this reporting week. "
        "Prioritize unresolved issues according to their "
        "recorded severity."
    )


def render_weekly_report_html(
    report: dict,
    design: ReportDesign,
) -> str:

    issues = report.get("issues", {})

    # Only current open issues are shown in the main issue table.
    issue_rows = issues.get("total_open_issues", [])

    if not isinstance(issue_rows, list):
        issue_rows = []

    priority_chart = build_chart_data(
        issue_rows,
        "issue_priority",
        PRIORITY_COLORS,
    )

    status_chart = build_chart_data(
        issue_rows,
        "issue_status",
        STATUS_COLORS,
    )

    ai_summary = report.get("ai_summary", {})

    if hasattr(ai_summary, "model_dump"):
        ai_summary = ai_summary.model_dump()

    template = environment.get_template("base.html")

    return template.render(
        design=design.model_dump(),
        developer=report.get("developer", {}),
        week=report.get("week", {}),
        generated_at=report.get("generated_at", ""),
        summary=report.get("summary", {}),
        metrics=build_metrics(report),
        priority_chart=priority_chart,
        status_chart=status_chart,
        issue_rows=issue_rows,
        ai_summary=ai_summary,
        risk_level=report.get("risk_level", "LOW"),
        risk_explanation=build_risk_explanation(report),
    )
