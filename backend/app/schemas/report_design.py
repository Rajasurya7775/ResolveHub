
from typing import Literal
from pydantic import BaseModel, Field, field_validator
import re


class ReportTheme(BaseModel):
    name: str = "enterprise"
    primary_color: str = "#333333"
    accent_color: str = "#F15A24"
    background_color: str = "#F3F4F6"
    text_color: str = "#333333"


class ReportSection(BaseModel):
    type: Literal[
        "hero",
        "executive_overview",
        "metric_cards",
        "priority_chart",
        "status_chart",
        "issue_table",
        "risk_analysis",
        "observations",
        "recommendations",
    ]

    title: str = Field(default="", max_length=100)
    description: str = Field(default="", max_length=300)


class ReportDesign(BaseModel):
    title: str = "Developer Weekly Report"
    subtitle: str = "Weekly Engineering Performance"
    layout: Literal[
        "executive",
        "dashboard",
        "analytics",
    ] = "dashboard"

    theme: ReportTheme = Field(default_factory=ReportTheme)

    sections: list[ReportSection] = Field(
        min_length=1,
        max_length=12,
    )

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, theme):
        color_pattern = re.compile(r"^#[0-9A-Fa-f]{6}$")

        for color in (
            theme.primary_color,
            theme.accent_color,
            theme.background_color,
            theme.text_color,
        ):
            if not color_pattern.fullmatch(color):
                raise ValueError("Invalid theme color")

        return theme
