
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, AliasPath

from app.schemas.issue import ProjectDetailResponse


class PreviousIssueResponse(BaseModel):
    issue_id: UUID
    issue_number: str
    project_id: int

    project_name: str = Field(
        validation_alias=AliasPath("project", "project_name")
    )

    issue_shift: str | None = None
    issue_time: datetime | None = None
    issue_title: str
    issue_type: str
    issue_description: str
    rca: str | None = None
    issue_status: str
    issue_priority: str | None = None
    issue_created_by: int
    issue_created_by_name: str | None
    issue_created_at: datetime
    shift_date: date
    assigned_to: int | None = None
    assigned_to_name: str | None = None
    assigned_at: datetime | None = None
    updated_at: datetime
    resolved_at: datetime | None
    project: ProjectDetailResponse

    model_config = ConfigDict(from_attributes=True)
