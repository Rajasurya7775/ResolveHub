import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IssueAssignmentHistory(Base):
    __tablename__ = "issue_assignment_history"

    history_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("issue_management.issue_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    previous_developer_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_management.user_id"),
        nullable=True,
        index=True,
    )

    new_developer_id: Mapped[int | None] = mapped_column(
        ForeignKey("user_management.user_id"),
        nullable=True,
        index=True,
    )

    changed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("user_management.user_id"),
        nullable=False,
    )

    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )