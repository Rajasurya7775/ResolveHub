
from io import BytesIO
from xml.sax.saxutils import escape
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)

from app.schemas.ai_weekly_summary import AIWeeklySummary


def safe_text(value: Any) -> str:
    """Escape dynamic text before inserting it into ReportLab Paragraphs."""
    return escape(str(value if value is not None else ""))


def generate_weekly_report_pdf(report: dict) -> BytesIO:
    """
    Generate a developer weekly summary PDF in memory.
    """

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Developer Weekly Summary",
        author="ResolveHub",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=20,
        leading=25,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17365D"),
        spaceAfter=12,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#17365D"),
        spaceBefore=12,
        spaceAfter=7,
    )

    normal_style = ParagraphStyle(
        "ReportNormal",
        parent=styles["BodyText"],
        fontSize=9,
        leading=14,
        spaceAfter=5,
    )

    small_style = ParagraphStyle(
        "ReportSmall",
        parent=styles["BodyText"],
        fontSize=8,
        leading=11,
    )

    story = []

    developer = report.get("developer", {})
    week = report.get("week", {})
    summary = report.get("summary", {})
    issues = report.get("issues", {})
    ai_summary = report.get("ai_summary", {})

    if isinstance(ai_summary, AIWeeklySummary):
        ai_summary = ai_summary.model_dump()

    # Report title
    story.append(
        Paragraph(
            "Developer Weekly Summary",
            title_style,
        )
    )

    story.append(
        Paragraph(
            "<b>ResolveHub</b>",
            ParagraphStyle(
                "Brand",
                parent=normal_style,
                alignment=TA_CENTER,
            ),
        )
    )

    story.append(Spacer(1, 10))

    # Developer information
    developer_name = safe_text(developer.get("name", "N/A"))
    employee_id = safe_text(developer.get("employee_id", "N/A"))

    week_start = safe_text(week.get("start", "N/A"))
    week_end = safe_text(week.get("end", "N/A"))

    developer_data = [
        [
            Paragraph("<b>Developer</b>", normal_style),
            Paragraph(developer_name, normal_style),
        ],
        [
            Paragraph("<b>Employee ID</b>", normal_style),
            Paragraph(employee_id, normal_style),
        ],
        [
            Paragraph("<b>Week Start</b>", normal_style),
            Paragraph(week_start, normal_style),
        ],
        [
            Paragraph("<b>Week End</b>", normal_style),
            Paragraph(week_end, normal_style),
        ],
    ]

    developer_table = Table(
        developer_data,
        colWidths=[45 * mm, 120 * mm],
    )

    developer_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F8")),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D5DDE8")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    story.append(developer_table)

    # Weekly metrics
    story.append(
        Paragraph("Weekly Metrics", heading_style)
    )

    metric_items = [
        ("Previous Week Unresolved", "previous_week_unresolved"),
        ("Resolved This Week", "resolved_this_week"),
        ("Still Unresolved", "still_unresolved"),
        ("Newly Assigned This Week", "newly_assigned_this_week"),
        ("Total Open Issues", "total_open_issues"),
    ]

    metric_data = [
        [
            Paragraph("<b>Metric</b>", normal_style),
            Paragraph("<b>Count</b>", normal_style),
        ]
    ]

    for label, key in metric_items:
        value = summary.get(key, 0)

        # Issue lists are represented by their count.
        if isinstance(value, list):
            value = len(value)

        metric_data.append([
            Paragraph(safe_text(label), normal_style),
            Paragraph(safe_text(value), normal_style),
        ])

    metric_table = Table(
        metric_data,
        colWidths=[125 * mm, 40 * mm],
        repeatRows=1,
    )

    metric_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17365D")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D5DDE8")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                colors.white,
                colors.HexColor("#F4F7FB"),
            ]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )

    story.append(metric_table)

    # Risk level
    risk_level = safe_text(report.get("risk_level", "N/A"))

    story.append(
        Paragraph("Risk Assessment", heading_style)
    )

    story.append(
        Paragraph(
            f"<b>Risk Level:</b> {risk_level}",
            normal_style,
        )
    )

    # AI overview
    story.append(
        Paragraph("AI-Generated Overview", heading_style)
    )

    overview = safe_text(
        ai_summary.get("overview", "No AI overview available.")
    )

    story.append(
        Paragraph(overview, normal_style)
    )

    # Observations
    story.append(
        Paragraph("Key Observations", heading_style)
    )

    observations = ai_summary.get("key_observations", [])

    if observations:
        for observation in observations:
            story.append(
                Paragraph(
                    f"&bull; {safe_text(observation)}",
                    normal_style,
                )
            )
    else:
        story.append(
            Paragraph("No observations available.", normal_style)
        )

    # Recommendations
    story.append(
        Paragraph("Recommendations", heading_style)
    )

    recommendations = ai_summary.get("recommendations", [])

    if recommendations:
        for index, recommendation in enumerate(recommendations, start=1):
            story.append(
                Paragraph(
                    f"{index}. {safe_text(recommendation)}",
                    normal_style,
                )
            )
    else:
        story.append(
            Paragraph("No recommendations available.", normal_style)
        )

    # Issue details, if present
    story.append(
        Paragraph("Issue Details", heading_style)
    )

    issue_sections = [
        ("Previous Week Unresolved", "previous_week_unresolved"),
        ("Resolved This Week", "resolved_this_week"),
        ("Still Unresolved", "still_unresolved"),
        ("Newly Assigned This Week", "newly_assigned_this_week"),
        ("Total Open Issues", "total_open_issues"),
    ]

    for label, key in issue_sections:
        issue_list = issues.get(key, [])

        if not isinstance(issue_list, list):
            continue

        if not issue_list:
            continue

        story.append(
            Paragraph(f"<b>{safe_text(label)}</b>", normal_style)
        )

        for issue in issue_list:
            if not isinstance(issue, dict):
                continue

            issue_title = safe_text(issue.get("title", "Untitled issue"))
            issue_id = safe_text(issue.get("issue_id", "N/A"))
            status = safe_text(issue.get("status", "N/A"))
            priority = safe_text(issue.get("priority", "N/A"))

            story.append(
                Paragraph(
                    f"&bull; {issue_id} - {issue_title} "
                    f"(Status: {status}, Priority: {priority})",
                    small_style,
                )
            )

    # Generation metadata
    story.append(Spacer(1, 15))

    generation_status = safe_text(
        report.get("generation_status", "N/A")
    )
    model = safe_text(report.get("model", "N/A"))
    generated_at = safe_text(report.get("generated_at", "N/A"))

    story.append(
        Paragraph(
            f"<b>Generation Status:</b> {generation_status}",
            small_style,
        )
    )

    story.append(
        Paragraph(
            f"<b>AI Model:</b> {model}",
            small_style,
        )
    )

    story.append(
        Paragraph(
            f"<b>Generated At:</b> {generated_at}",
            small_style,
        )
    )

    story.append(Spacer(1, 12))

    story.append(
        Paragraph(
            "This report was generated by ResolveHub. "
            "Weekly metrics are calculated by the application; "
            "AI-generated content is provided as supporting analysis.",
            small_style,
        )
    )

    document.build(story)

    buffer.seek(0)

    return buffer
