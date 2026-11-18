
import json
import logging

import httpx

from app.schemas.report_design import ReportDesign
from app.services.ai_summary_service import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT,
)

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """
You are an enterprise report designer for ResolveHub.

Your task is to design a professional developer weekly
performance report.

Design style:
- Enterprise corporate report.
- White and light grey backgrounds.
- Dark charcoal typography.
- Red and orange accent colors.
- Professional charts and structured tables.
- Clear section hierarchy.
- Modern executive dashboard appearance.

You must use only these section types:

1. hero
2. executive_overview
3. metric_cards
4. priority_chart
5. status_chart
6. issue_table
7. risk_analysis
8. observations
9. recommendations

Rules:
- Select relevant sections based on available data.
- Arrange sections in a logical order.
- Include metric_cards and executive_overview.
- Include recommendations and risk_analysis.
- Do not invent metrics.
- Do not generate HTML, CSS, JavaScript or Python.
- Return valid JSON only.

Expected structure:

{
  "title": "Developer Weekly Report",
  "subtitle": "Weekly Engineering Performance",
  "layout": "dashboard",
  "theme": {
    "name": "enterprise",
    "primary_color": "#333333",
    "accent_color": "#F15A24",
    "background_color": "#F3F4F6",
    "text_color": "#333333"
  },
  "sections": [
    {
      "type": "hero",
      "title": "Developer Weekly Report",
      "description": "Weekly reporting period"
    },
    {
      "type": "metric_cards",
      "title": "Weekly Metrics",
      "description": "Developer performance metrics"
    }
  ]
}
"""


def build_fallback_design() -> ReportDesign:
    return ReportDesign(
        title="Developer Weekly Report",
        subtitle="ResolveHub Engineering Report",
        layout="dashboard",
        sections=[
            {"type": "hero"},
            {"type": "executive_overview"},
            {"type": "metric_cards"},
            {"type": "priority_chart"},
            {"type": "status_chart"},
            {"type": "issue_table"},
            {"type": "risk_analysis"},
            {"type": "observations"},
            {"type": "recommendations"},
        ],
    )


def generate_report_design(report: dict) -> tuple[ReportDesign, str]:
    payload = {
        "developer": report.get("developer", {}),
        "week": report.get("week", {}),
        "metrics": report.get("summary", {}),
        "issues": report.get("issues", {}),
    }

    request_body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "num_predict":350,
        },
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": json.dumps(
                    payload,
                    default=str,
                    ensure_ascii=False,
                ),
            },
        ],
    }

    try:
        response = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=request_body,
            timeout=httpx.Timeout(
    connect=10.0,
    read=600.0,
    write=60.0,
    pool=30.0,
),
        )

        response.raise_for_status()

        content = response.json()["message"]["content"]

        design = ReportDesign.model_validate_json(content)

        return design, "SUCCESS"

    except (
        httpx.HTTPError,
        ValueError,
        KeyError,
        TypeError,
    ):
        logger.exception(
            "AI report design failed. Using fallback design."
        )

        return build_fallback_design(), "FALLBACK"
