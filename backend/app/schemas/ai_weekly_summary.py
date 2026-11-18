from typing import Literal, Any

from pydantic import BaseModel, Field, field_validator


class AIWeeklySummary(BaseModel):
    overview: str = Field(min_length=1)

    key_observations: list[str] = Field(default_factory=list)

    recommendations: list[str] = Field(default_factory=list)

    @field_validator("key_observations", "recommendations", mode="before")
    @classmethod
    def normalize_list(cls, value: Any) -> list[str]:
        if value is None:
            return []

        if isinstance(value, str):
            return [value]

        if not isinstance(value, list):
            raise ValueError("Expected a list of strings")

        normalized = []

        for item in value:
            if isinstance(item, str):
                normalized.append(item)

            elif isinstance(item, dict):
                # Supports Ollama's nested JSON objects.
                text = (
                    item.get("observation")
                    or item.get("recommendation")
                    or item.get("text")
                )

                if text:
                    normalized.append(str(text))

        return normalized


class AIWeeklySummaryResponse(BaseModel):
    developer: dict
    week: dict
    summary: dict
    issues: dict

    ai_summary: AIWeeklySummary

    risk_level: Literal["LOW", "MEDIUM", "HIGH"]

    generation_status: Literal["SUCCESS", "FALLBACK"]

    generated_at: str
    model: str