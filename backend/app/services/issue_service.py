
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Issue, Project, User


def _role_value(user):
    value = getattr(user.role, "value", user.role)
    return str(value).strip().upper()


def _get_authorized_user(current_user: User):
    role = _role_value(current_user)

    if role not in ("SUPPORTER", "SUPPORT", "DEVELOPER"):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to manage issues."
        )


def _get_issue(db: Session, issue_id: UUID):
    query = (
        select(Issue)
        .options(selectinload(Issue.project))
        .where(Issue.issue_id == issue_id)
    )

    issue = db.scalars(query).first()

    if issue is None:
        raise HTTPException(
            status_code=404,
            detail="Issue not found."
        )

    return issue


def get_issue_details(
    db: Session,
    current_user: User,
    issue_id: UUID
):
    _get_authorized_user(current_user)
    return _get_issue(db, issue_id)


def update_issue(
    db: Session,
    current_user: User,
    issue_id: UUID,
    update_data: dict
):
    _get_authorized_user(current_user)

    issue = _get_issue(db, issue_id)
    data = update_data.copy()

    try:
        # Validate project
        if "project_id" in data:
            if data["project_id"] is None:
                raise HTTPException(
                    status_code=400,
                    detail="Project cannot be empty."
                )

            if db.get(Project, data["project_id"]) is None:
                raise HTTPException(
                    status_code=404,
                    detail="Project not found."
                )

        # Validate required fields
        required_fields = [
            "issue_title",
            "issue_type",
            "issue_description",
            "issue_status",
        ]

        for field in required_fields:
            if field in data and (
                data[field] is None
                or not str(data[field]).strip()
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"{field} cannot be empty."
                )

        # Handle developer assignment
        if "assigned_to" in data:
            new_assignee_id = data.pop("assigned_to")

            if new_assignee_id is not None:
                developer = db.get(User, new_assignee_id)

                if developer is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Assigned developer not found."
                    )

                developer_role = _role_value(developer)

                account_status = getattr(
                    developer.account_status,
                    "value",
                    developer.account_status
                )

                if (
                    developer_role != "DEVELOPER"
                    or str(account_status).upper() != "ACTIVE"
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Please select an active developer."
                    )

            if issue.assigned_to != new_assignee_id:
                issue.assigned_to = new_assignee_id
                issue.assigned_at = (
                    datetime.now(timezone.utc)
                    if new_assignee_id is not None
                    else None
                )

        # Handle resolved timestamp
        if "issue_status" in data:
            new_status = getattr(
                data["issue_status"],
                "value",
                data["issue_status"]
            )

            current_status = getattr(
                issue.issue_status,
                "value",
                issue.issue_status
            )

            if str(new_status).upper() == "RESOLVED":
                if str(current_status).upper() != "RESOLVED":
                    issue.resolved_at = datetime.now(timezone.utc)

            elif str(current_status).upper() == "RESOLVED":
                issue.resolved_at = None

        # Update remaining fields
        for field, value in data.items():
            if field == "issue_priority" and value is not None:
                value = getattr(value, "value", value)

            setattr(issue, field, value)

        # Commit database changes
        db.commit()

        return _get_issue(db, issue_id)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update issue."
        )


def delete_issue(
    db: Session,
    current_user: User,
    issue_id: UUID
):
    _get_authorized_user(current_user)

    issue = _get_issue(db, issue_id)

    try:
        # Load associated messages before deletion
        list(issue.messages)

        db.delete(issue)
        db.commit()

        return {
            "message": "Issue deleted successfully."
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to delete issue."
        )
