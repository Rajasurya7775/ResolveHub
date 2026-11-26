
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import AuditLog, Issue, Project, User
from app.schemas.issue import IssueUpdate


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


def _get_issue(db: Session, issue_id: UUID, *, for_update: bool = False):
    query = (
        select(Issue)
        .options(selectinload(Issue.project))
        .where(Issue.issue_id == issue_id)
    )
    if for_update:
        query = query.with_for_update().execution_options(populate_existing=True)

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


def _audit_value(value) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    return None if value is None else str(value)


def update_issue(
    db: Session,
    current_user: User,
    issue_id: UUID,
    update_data: dict
) -> tuple[Issue, bool]:
    _get_authorized_user(current_user)

    try:
        issue = _get_issue(db, issue_id, for_update=True)
        data = {
            field: value
            for field, value in update_data.items()
            if field in IssueUpdate.model_fields
        }
        tracked_fields = dict.fromkeys(data)
        if "assigned_to" in data:
            tracked_fields["assigned_at"] = None
        if "issue_status" in data:
            tracked_fields["resolved_at"] = None
        original = {field: getattr(issue, field) for field in tracked_fields}
        changed_at = datetime.now(timezone.utc)

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
                    changed_at
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
                    issue.resolved_at = changed_at

            elif str(current_status).upper() == "RESOLVED":
                issue.resolved_at = None

        # Update remaining fields
        for field, value in data.items():
            if field == "issue_priority" and value is not None:
                value = str(getattr(value, "value", value))
            setattr(issue, field, value)

        # Read back timestamps using the database column's timezone semantics.
        timestamp_fields = [
            field for field in ("issue_time", "assigned_at")
            if field in original and original[field] != getattr(issue, field)
        ]
        if timestamp_fields:
            db.flush()
            db.refresh(issue, attribute_names=timestamp_fields)

        group_id = uuid4()
        actor_role = "Developer" if _role_value(current_user) == "DEVELOPER" else "Supporter"
        audit_changed = False
        for field, old_value in original.items():
            new_value = getattr(issue, field)
            if old_value != new_value:
                audit_changed = True
                db.add(
                    AuditLog(
                        issue_id=issue_id,
                        user_id=current_user.user_id,
                        actor_name=current_user.full_name,
                        actor_role=actor_role,
                        change_group_id=group_id,
                        field=field,
                        old_value=_audit_value(old_value),
                        new_value=_audit_value(new_value),
                        updated_at=changed_at,
                    )
                )

        db.commit()

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update issue."
        )

    return _get_issue(db, issue_id), audit_changed


def delete_issue(
    db: Session,
    current_user: User,
    issue_id: UUID
):
    _get_authorized_user(current_user)

    issue = _get_issue(db, issue_id)

    # Capture issue number before deletion
    issue_number = issue.issue_number

    try:
        # Load associated messages before deletion
        list(issue.messages)

        # Delete issue
        db.delete(issue)
        db.commit()

        return {
            "message": "Issue deleted successfully.",
            "issue_number": issue_number
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to delete issue."
        )
