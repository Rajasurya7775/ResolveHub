
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, AliasPath


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
    issue_created_at: datetime
    assigned_to: int | None = None
    assigned_at: datetime | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
