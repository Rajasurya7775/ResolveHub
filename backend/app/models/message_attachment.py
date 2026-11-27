from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IssueMessageAttachment(Base):
    __tablename__ = "issue_message_attachments_management"

    attachment_id: Mapped[UUID] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(
        ForeignKey("issue_messages_management.id", ondelete="CASCADE"), index=True
    )
    issue_id: Mapped[UUID] = mapped_column(ForeignKey("issue_management.issue_id"))
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("user_management.user_id"))
    original_file_name: Mapped[str] = mapped_column(String(255))
    object_key: Mapped[str] = mapped_column(String(255), unique=True)
    content_type: Mapped[str] = mapped_column(String(127))
    file_size: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AttachmentCleanup(Base):
    __tablename__ = "issue_attachment_cleanup"

    object_key: Mapped[str] = mapped_column(String(255), primary_key=True)
    retry_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
