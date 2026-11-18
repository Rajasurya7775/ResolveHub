
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User

from app.services.developer_weekly_summary_service import (
    get_developer_weekly_summary,
)
import asyncio
from io import BytesIO

from app.schemas.report_design import ReportDesign

from app.services.report_designer.html_renderer import (
    render_weekly_report_html,
)

from app.services.report_designer.pdf_service import (
    generate_pdf_bytes,
)
from app.services.ai_weekly_report_service import build_ai_report

from app.utils.weekly_report_pdf import generate_weekly_report_pdf


router = APIRouter(
    prefix="/developer/weekly-summary",
    tags=["Developer Weekly Summary"],
)


# Existing endpoint — unchanged
@router.get("")
def weekly_summary(
    week_start: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("DEVELOPER")),
):
    return get_developer_weekly_summary(
        db=db,
        current_user=current_user,
        week_start=week_start,
    )


# New endpoint — AI JSON report

@router.get("/ai/pdf")
def ai_weekly_summary_pdf(
    week_start: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("DEVELOPER")),
):
    # 1. Build AI report.
    report = build_ai_report(
        db=db,
        current_user=current_user,
        week_start=week_start,
    )

    # 2. Convert the AI-generated design into a validated model.
    design = ReportDesign.model_validate(
        report["report_design"]
    )

    # 3. Adapt existing response keys for the HTML template.
    pdf_report = {
        **report,
        "developer": {
            **report["developer"],
            "name": report["developer"]["full_name"],
        },
        "week": {
            **report["week"],
            "start": report["week"]["week_start"],
            "end": report["week"]["week_end"],
        },
    }

    # 4. Render dynamic HTML.
    html = render_weekly_report_html(
        report=pdf_report,
        design=design,
    )

    # 5. Convert HTML into PDF using Playwright.
    pdf_bytes = asyncio.run(
        generate_pdf_bytes(html)
    )

    filename = (
        f"resolvehub_weekly_report_"
        f"{week_start.isoformat()}.pdf"
    )

    # 6. Return downloadable PDF.
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )



# New endpoint — AI PDF download
@router.get("/ai/pdf")
def ai_weekly_summary_pdf(
    week_start: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("DEVELOPER")),
):
    report = build_ai_report(
        db=db,
        current_user=current_user,
        week_start=week_start,
    )

    # Adapt the existing response keys to the PDF generator.
    pdf_report = {
        **report,
        "developer": {
            **report["developer"],
            "name": report["developer"]["full_name"],
        },
        "week": {
            **report["week"],
            "start": report["week"]["week_start"],
            "end": report["week"]["week_end"],
        },
    }

    pdf_buffer = generate_weekly_report_pdf(pdf_report)

    filename = (
        f"developer_weekly_summary_"
        f"{week_start.isoformat()}.pdf"
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )
