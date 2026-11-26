from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.audit_sse import router as audit_sse_router
from app.core.audit_events import publish_audit_update

from app.api.deps import get_current_user
from app.core.dashboard_events import publish_dashboard_update
from app.db.session import get_db
from app.models import Project, User
from app.schemas.audit_log import AuditHistory
from app.schemas.issue import IssueListResponse, IssueUpdate
from app.schemas.issue_message import IssueMessageResponse
from app.schemas.previous_issue import PreviousIssueResponse
from app.services.audit_log_service import list_issue_audit_logs
from app.services.issue_message_service import list_issue_messages
from app.services.issue_service import (
    get_issue_details,
    update_issue,
    delete_issue,
)
from app.services.previous_issue_service import get_previous_issues


router = APIRouter(
    prefix="/previous-issues",
    tags=["Previous Issues"],
)
router.include_router(audit_sse_router)

# --------------------------------------------------
# GET: Previous Issues with filters and pagination
# --------------------------------------------------
@router.get("", response_model=IssueListResponse)
def read_previous_issues(
    search: str | None = Query(default=None),
    project_name: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    shift: str | None = Query(default=None),
    issue_status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),

    # Pagination
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issues, total = get_previous_issues(
        db=db,
        search=search,
        project_name=project_name,
        issue_type=issue_type,
        shift=shift,
        issue_status=issue_status,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )

    return {
        "items": issues,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


# --------------------------------------------------
# GET: Project names for Previous Issues dropdown
# --------------------------------------------------
@router.get("/projects", response_model=list[str])
def get_project_names(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Project.project_name)
        .distinct()
        .order_by(Project.project_name)
    )

    return db.scalars(query).all()


# --------------------------------------------------
# GET: Detailed issue information
# --------------------------------------------------
@router.get(
    "/{issue_id}",
    response_model=PreviousIssueResponse,
)
def read_previous_issue_details(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_issue_details(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
    )


@router.get("/{issue_id}/audit-logs", response_model=AuditHistory)
def read_previous_issue_audit_logs(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_issue_audit_logs(db, current_user, issue_id)


# --------------------------------------------------
# GET: Read-only message history
# --------------------------------------------------
@router.get("/{issue_id}/messages", response_model=list[IssueMessageResponse])
def read_previous_issue_messages(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_issue_details(db=db, current_user=current_user, issue_id=issue_id)
    return list_issue_messages(db, issue_id)


# --------------------------------------------------
# PATCH: Update an existing issue
# --------------------------------------------------
@router.patch(
    "/{issue_id}",
    response_model=PreviousIssueResponse,
)
async def edit_previous_issue(
    request: Request,
    issue_id: UUID,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated_issue, audit_changed = await run_in_threadpool(
        update_issue,
        db=db,
        current_user=current_user,
        issue_id=issue_id,
        update_data=issue_data.model_dump(exclude_unset=True),
    )
    if audit_changed:
        await publish_audit_update(request.app.state.dashboard_redis, issue_id)
    await publish_dashboard_update(request.app.state.dashboard_redis)
    return updated_issue


# --------------------------------------------------
# DELETE: Delete issue
# --------------------------------------------------
@router.delete("/{issue_id}")
async def remove_previous_issue(
    request: Request,
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Delete issue from database
    delete_issue(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
    )

    await publish_dashboard_update(request.app.state.dashboard_redis)

    return {
        "message": "Issue deleted successfully."
    }
