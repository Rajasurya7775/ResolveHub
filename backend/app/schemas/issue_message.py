
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class IssueMessageCreate(BaseModel):
    markdown: str = Field(min_length=1, max_length=10000)


class IssueMessageAttachmentResponse(BaseModel):
    attachment_id: UUID
    file_name: str
    content_type: str
    file_size: int
    view_url: str


class IssueMessageResponse(BaseModel):
    id: int
    issue_id: UUID
    sender_id: int
    sender_name: str
    markdown: str
    created_at: datetime
    updated_at: datetime | None
    is_edited: bool
    attachments: list[IssueMessageAttachmentResponse] = Field(default_factory=list)
