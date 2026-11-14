
import uuid
from datetime import date,datetime
from typing import TYPE_CHECKING
from app.models.audit_log import AuditLog
from app.models.time_log import TimeLog
from sqlalchemy import Date, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.message import IssueMessage
    from app.models.project import Project
    from app.models.user import User


class Issue(Base):
    __tablename__ = "issue_management"

    # UUID (generated)
    issue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )

    issue_number: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects_management.project_id"),
        nullable=False,
        index=True,
    )

    issue_shift: Mapped[str | None] = mapped_column(
        String(10), nullable=True
    )
    issue_time: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    issue_title: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    issue_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    issue_description: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    rca: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    issue_status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="OPEN",
        server_default="OPEN",
    )
    issue_priority: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )

    issue_created_by: Mapped[int] = mapped_column(
        ForeignKey("user_management.user_id"),
        nullable=False,
        index=True,
    )
    issue_created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("user_management.user_id"),
        nullable=True,
        index=True,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Timestamp when the issue is resolved
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    project: Mapped["Project"] = relationship(
        back_populates="issues"
    )

    creator: Mapped["User"] = relationship(
        back_populates="created_issues",
        foreign_keys=[issue_created_by],
    )

    assignee: Mapped["User | None"] = relationship(
        back_populates="assigned_issues",
        foreign_keys=[assigned_to],
    )

    messages: Mapped[list["IssueMessage"]] = relationship(
        back_populates="issue",
        cascade="all, delete-orphan",
        order_by="IssueMessage.created_at",
    )
