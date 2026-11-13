from datetime import datetime
from typing import TYPE_CHECKING
from app.models.time_log import TimeLog
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.issue import Issue
    from app.models.message import IssueMessage
    from app.models.project import Project


class User(Base):
    __tablename__ = "user_management"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    employee_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)

    role: Mapped[str] = mapped_column(String(20), nullable=False)
    role_type: Mapped[str] = mapped_column(String(100), nullable=False)
    account_status: Mapped[str] = mapped_column(String(20), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # user_management 1 --- 0..* projects_management   ("created_by")
    created_projects: Mapped[list["Project"]] = relationship(
        back_populates="creator",
    )

    # user_management 1 --- 0..* issue_management      ("creates")
    created_issues: Mapped[list["Issue"]] = relationship(
        back_populates="creator",
        foreign_keys="Issue.issue_created_by",
    )

    # user_management 1 --- 0..* issue_management      ("accepts")
    assigned_issues: Mapped[list["Issue"]] = relationship(
        back_populates="assignee",
        foreign_keys="Issue.assigned_to",
    )

    # user_management 1 --- 0..* issue_messages_management ("sends")
    messages: Mapped[list["IssueMessage"]] = relationship(
        back_populates="sender",
    )

    time_logs: Mapped[list["TimeLog"]] = relationship(
    back_populates="user",
    )