
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import User

from app.services.developer_weekly_summary_service import (
    get_developer_weekly_summary,
)

from app.services.ai_summary_service import (
    generate_ai_summary,
    calculate_risk_level,
)

from app.services.report_designer.design_service import (
    generate_report_design,
)


def build_ai_report(
    db: Session,
    current_user: User,
    week_start,
) -> dict:

    # 1. Get the original weekly summary.
    # Do not modify the existing business logic.
    report = get_developer_weekly_summary(
        db=db,
        current_user=current_user,
        week_start=week_start,
    )

    # 2. Generate AI narrative using Ollama.
    ai_summary, generation_status, model = generate_ai_summary(
        report
    )

    # 3. Calculate risk using deterministic Python logic.
    risk_level = calculate_risk_level(report)

    # 4. Generate dynamic PDF design using Ollama.
    report_design, design_status = generate_report_design(
        report
    )

    # 5. Build final AI report.
    return {
        **report,
        "ai_summary": ai_summary.model_dump(),
        "risk_level": risk_level,
        "generation_status": generation_status,
        "design_generation_status": design_status,
        "report_design": report_design.model_dump(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": model,
    }
