from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.issue import Issue
    from app.models.user import User


class Project(Base):
    __tablename__ = "projects_management"

    project_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    project_name: Mapped[str] = mapped_column(String(150), nullable=False)
    project_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_status: Mapped[str] = mapped_column(String(20), nullable=False)

    created_by: Mapped[int] = mapped_column(
        ForeignKey("user_management.user_id"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    creator: Mapped["User"] = relationship(back_populates="created_projects")

    # projects_management 1 --- 0..* issue_management   ("contains")
    issues: Mapped[list["Issue"]] = relationship(back_populates="project")