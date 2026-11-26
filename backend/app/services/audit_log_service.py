from datetime import timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, User
from app.schemas.audit_log import AuditAction, AuditChange, AuditHistory
from app.services.issue_service import get_issue_details


def list_issue_audit_logs(
    db: Session, current_user: User, issue_id: UUID
) -> AuditHistory:
    get_issue_details(db, current_user, issue_id)
    rows = db.scalars(
        select(AuditLog)
        .where(AuditLog.issue_id == issue_id)
        .order_by(AuditLog.updated_at.desc(), AuditLog.audit_id.desc())
    )

    actions: dict[UUID | int, AuditAction] = {}
    for row in rows:
        key = row.change_group_id if row.change_group_id is not None else row.audit_id
        if key not in actions:
            changed_at = row.updated_at
            if changed_at.tzinfo is None:
                changed_at = changed_at.replace(tzinfo=timezone.utc)
            actions[key] = AuditAction(
                issue_id=row.issue_id,
                user_id=row.user_id,
                user_name=row.actor_name,
                user_role=row.actor_role,
                changed_at=changed_at.astimezone(timezone.utc),
                changes=[],
            )
        actions[key].changes.append(AuditChange.model_validate(row))

    return AuditHistory(items=list(actions.values()))
