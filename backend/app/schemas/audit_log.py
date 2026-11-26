from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditChange(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    audit_id: int
    field: str
    old_value: str | None
    new_value: str | None


class AuditAction(BaseModel):
    issue_id: UUID
    user_id: int | None
    user_name: str | None
    user_role: str | None
    changed_at: datetime
    changes: list[AuditChange]


class AuditHistory(BaseModel):
    items: list[AuditAction]
