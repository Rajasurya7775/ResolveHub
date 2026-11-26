
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.issue import Issue
    from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_issue_timestamp", "issue_id", "updated_at", "audit_id"),
    )

    audit_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(
            "issue_management.issue_id",
            name="audit_logs_issue_id_fkey",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_management.user_id", name="fk_audit_logs_user_id"),
        nullable=True,
        index=True,
    )

    actor_name: Mapped[str | None] = mapped_column(String(100))
    actor_role: Mapped[str | None] = mapped_column(String(20))
    change_group_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))

    field: Mapped[str] = mapped_column(String(50), nullable=False)

    old_value: Mapped[str | None] = mapped_column(
        "from", Text, nullable=True
    )

    new_value: Mapped[str | None] = mapped_column(
        "to", Text, nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    issue: Mapped["Issue"] = relationship(
        back_populates="audit_logs"
    )

    user: Mapped["User | None"] = relationship()
