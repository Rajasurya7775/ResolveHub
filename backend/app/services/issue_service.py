from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Issue,
    Project,
    User,
    IssueAssignmentHistory,
    IssueStatusHistory,
)


def _role_value(user):
    value = getattr(user.role, "value", user.role)
    return str(value).strip().upper()


def _get_authorized_user(current_user: User):
    role = _role_value(current_user)

    if role not in ("SUPPORTER", "SUPPORT", "DEVELOPER"):
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to manage issues.",
        )


def _get_issue(db: Session, issue_id: UUID):
    query = (
        select(Issue)
        .options(selectinload(Issue.project))
        .where(Issue.issue_id == issue_id)
    )

    issue = db.scalars(query).first()

    if issue is None:
        raise HTTPException(status_code=404, detail="Issue not found.")

    return issue


def get_issue_details(
    db: Session,
    current_user: User,
    issue_id: UUID,
):
    _get_authorized_user(current_user)
    return _get_issue(db, issue_id)


def update_issue(
    db: Session,
    current_user: User,
    issue_id: UUID,
    update_data: dict,
):
    _get_authorized_user(current_user)

    issue = _get_issue(db, issue_id)
    data = update_data.copy()
    now = datetime.now(timezone.utc)

    if "project_id" in data:
        if data["project_id"] is None:
            raise HTTPException(
                status_code=400,
                detail="Project cannot be empty.",
            )

        if db.get(Project, data["project_id"]) is None:
            raise HTTPException(status_code=404, detail="Project not found.")

    required_fields = [
        "issue_title",
        "issue_type",
        "issue_description",
        "issue_status",
    ]

    for field in required_fields:
        if field in data and (
            data[field] is None or not str(data[field]).strip()
        ):
            raise HTTPException(
                status_code=400,
                detail=f"{field} cannot be empty.",
            )

    try:
        # Record assignment changes
        if "assigned_to" in data:
            new_assignee_id = data.pop("assigned_to")

            if new_assignee_id is not None:
                developer = db.get(User, new_assignee_id)

                if developer is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Assigned developer not found.",
                    )

                developer_role = _role_value(developer)
                account_status = getattr(
                    developer.account_status,
                    "value",
                    developer.account_status,
                )

                if (
                    developer_role != "DEVELOPER"
                    or str(account_status).strip().upper() != "ACTIVE"
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Please select an active developer.",
                    )

            if issue.assigned_to != new_assignee_id:
                old_assignee_id = issue.assigned_to

                db.add(
                    IssueAssignmentHistory(
                        issue_id=issue.issue_id,
                        previous_developer_id=old_assignee_id,
                        new_developer_id=new_assignee_id,
                        changed_by_user_id=current_user.user_id,
                        changed_at=now,
                    )
                )

                issue.assigned_to = new_assignee_id
                issue.assigned_at = now if new_assignee_id else None

        # Record status changes
        if "issue_status" in data:
            new_status = str(data["issue_status"]).strip().upper()
            old_status = str(issue.issue_status).strip().upper()

            data["issue_status"] = new_status

            if old_status != new_status:
                db.add(
                    IssueStatusHistory(
                        issue_id=issue.issue_id,
                        previous_status=old_status,
                        new_status=new_status,
                        changed_by_user_id=current_user.user_id,
                        changed_at=now,
                    )
                )

                if new_status == "RESOLVED":
                    issue.resolved_at = now
                else:
                    # Clear resolved_at when an issue is reopened
                    issue.resolved_at = None

        for field, value in data.items():
            if field == "issue_priority" and value is not None:
                value = str(value)

            setattr(issue, field, value)

        db.commit()
        return _get_issue(db, issue_id)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update issue.",
        )


def delete_issue(
    db: Session,
    current_user: User,
    issue_id: UUID,
):
    _get_authorized_user(current_user)
    issue = _get_issue(db, issue_id)

    try:
        list(issue.messages)
        db.delete(issue)
        db.commit()

        return {"message": "Issue deleted successfully."}

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete issue.",
        )