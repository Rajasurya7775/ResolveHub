
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class IssueCreate(BaseModel):
    project_id: int
    issue_shift: str
    issue_time: datetime
    issue_title: str = Field(min_length=1, max_length=255)
    issue_type: str
    issue_description: str = Field(min_length=1)
    issue_priority: str | int
    assigned_to: int | str | None = None
    rca: str | None = None
    issue_status: str

class IssueResponse(BaseModel):
    issue_id: UUID
    issue_number: str
    project_id: int
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
    assigned_to: int | str | None = None
    assigned_at: datetime | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectDropdownResponse(BaseModel):
    project_id: int
    project_name: str

    model_config = ConfigDict(from_attributes=True)


class DeveloperDropdownResponse(BaseModel):
    user_id: int
    full_name: str
    employee_id: str

    model_config = ConfigDict(from_attributes=True)
