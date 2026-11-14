
from datetime import datetime
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.issue import Issue
    from app.models.user import User


class TimeLog(Base):
    __tablename__ = "time_logs"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )

    issue_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("issue_management.issue_id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_management.user_id"),
        nullable=False,
        index=True,
    )

    logs: Mapped[datetime] = mapped_column(
        DateTime, nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    issue: Mapped["Issue"] = relationship(
        back_populates="time_logs"
    )

    user: Mapped["User"] = relationship(
        back_populates="time_logs"
    )
