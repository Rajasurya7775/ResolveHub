import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.issue import Issue
    from app.models.user import User


class IssueMessage(Base):
    __tablename__ = "issue_messages_management"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    issue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("issue_management.issue_id"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("user_management.user_id"), nullable=False, index=True
    )

    markdown: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    issue: Mapped["Issue"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship(back_populates="messages")