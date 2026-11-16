
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.issue import Issue


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("issue_management.issue_id"),
        nullable=False,
        index=True,
    )

    field: Mapped[str] = mapped_column(String(50), nullable=False)

    old_value: Mapped[str | None] = mapped_column(
        "from", Text, nullable=True
    )

    new_value: Mapped[str | None] = mapped_column(
        "to", Text, nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    issue: Mapped["Issue"] = relationship(
        back_populates="audit_logs"
    )
