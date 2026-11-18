
import json
import logging
import os
from typing import Any

import httpx

from app.schemas.ai_weekly_summary import AIWeeklySummary

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434",
).rstrip("/")

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b",
)

OLLAMA_TIMEOUT = float(
    os.getenv("OLLAMA_TIMEOUT", "180")
)


def calculate_risk_level(report: dict[str, Any]) -> str:
    """
    Calculate risk using Python, not the AI model.
    """

    issues = report.get("issues", {})
    open_issues = issues.get("total_open_issues", [])

    if not isinstance(open_issues, list):
        open_issues = []

    priorities = {
        str(issue.get("issue_priority", "")).upper()
        for issue in open_issues
        if isinstance(issue, dict)
    }

    if priorities.intersection({"CRITICAL", "HIGH"}):
        return "HIGH"

    if "MEDIUM" in priorities:
        return "MEDIUM"

    return "LOW"


def build_fallback_summary(
    report: dict[str, Any],
) -> AIWeeklySummary:
    """
    Generate a deterministic summary if Ollama fails.
    """

    summary = report.get("summary", {})

    previous = summary.get("previous_week_unresolved", 0)
    resolved = summary.get("resolved_this_week", 0)
    unresolved = summary.get("still_unresolved", 0)
    newly_assigned = summary.get("newly_assigned_this_week", 0)

    return AIWeeklySummary(
        overview=(
            f"This week, {resolved} issues were resolved, "
            f"{newly_assigned} new issues were assigned, "
            f"and {unresolved} issues remain unresolved."
        ),
        key_observations=[
            f"{previous} issues were unresolved at the start of the week.",
            f"{resolved} issues were resolved during the week.",
            f"{unresolved} issues remain unresolved.",
        ],
        recommendations=[
            "Prioritize unresolved issues based on their severity.",
            "Review newly assigned issues and plan the next actions.",
            "Continue monitoring unresolved issues until closure.",
        ],
    )


def prepare_ai_input(report: dict[str, Any]) -> dict[str, Any]:
    """
    Send only relevant report information to Ollama.
    """

    return {
        "week": report.get("week", {}),
        "metrics": report.get("summary", {}),
        "issues": report.get("issues", {}),
    }


def generate_ai_summary(
    report: dict[str, Any],
) -> tuple[AIWeeklySummary, str, str]:
    """
    Generate an AI summary using Ollama.

    Returns:
        (summary, generation_status, model_name)
    """

    fallback = build_fallback_summary(report)

    system_prompt = """
You are a professional software engineering reporting assistant.

Generate a concise developer weekly performance summary.

Rules:
1. Use only the supplied report data.
2. Never invent issue counts, names, statuses, or priorities.
3. Do not modify or recalculate the supplied metrics.
4. Explain completed and unresolved work clearly.
5. Provide practical recommendations.
6. Return valid JSON only.
7. Use exactly this structure:

{
  "overview": "A concise summary",
  "key_observations": [
    "Observation 1",
    "Observation 2"
  ],
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}

The overview must be a string.
The other two fields must be arrays of strings.
"""

    ai_input = prepare_ai_input(report)

    request_body = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.2,
            "num_predict": 400,
        },
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": json.dumps(
                    ai_input,
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
            timeout=OLLAMA_TIMEOUT,
        )

        response.raise_for_status()

        result = response.json()

        content = result["message"]["content"]

        ai_summary = AIWeeklySummary.model_validate_json(content)

        return ai_summary, "SUCCESS", OLLAMA_MODEL

    except (
        httpx.HTTPError,
        KeyError,
        ValueError,
        TypeError,
    ):
        logger.exception(
            "Ollama summary generation failed. Using fallback."
        )

        return fallback, "FALLBACK", OLLAMA_MODEL
