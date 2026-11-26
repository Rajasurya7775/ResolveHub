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

class IssueUpdate(BaseModel):
    issue_title: str | None = Field(default=None, min_length=1, max_length=255)
    issue_type: str | None = None
    issue_description: str | None = Field(default=None, min_length=1)
    issue_priority: str | int | None = None
    rca: str | None = None

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
    assigned_to_name: str | None = None
    assigned_at: datetime | None = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IssueListProject(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_name: str


class IssueListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    issue_id: UUID
    issue_number: str
    project: IssueListProject
    issue_title: str
    issue_type: str
    issue_status: str
    assigned_to_name: str | None
    issue_created_at: datetime
    issue_shift: str | None


class IssueListResponse(BaseModel):
    items: list[IssueListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProjectDropdownResponse(BaseModel):
    project_id: int
    project_name: str

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(ProjectDropdownResponse):
    project_status: str
    project_description: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime


class DeveloperDropdownResponse(BaseModel):
    user_id: int
    full_name: str
    employee_id: str

    model_config = ConfigDict(from_attributes=True)

class IssueUpdate(BaseModel):
    project_id: int | None = None
    issue_shift: str | None = None
    issue_time: datetime | None = None
    issue_title: str | None = Field(default=None, min_length=1, max_length=255)
    issue_type: str | None = None
    issue_description: str | None = Field(default=None, min_length=1)
    issue_priority: str | int | None = None
    assigned_to: int | None = None
    rca: str | None = None
    issue_status: str | None = None
