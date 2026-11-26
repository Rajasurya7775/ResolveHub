
from datetime import date
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.audit_sse import router as audit_sse_router
from app.core.audit_events import publish_audit_update

from app.db.session import get_db
from app.models import User, Project

from app.schemas.audit_log import AuditHistory
from app.schemas.issue import IssueListResponse, IssueUpdate, ProjectDropdownResponse
from app.schemas.my_issue import MyIssueResponse
from app.schemas.issue_message import (
    IssueMessageResponse,
    IssueMessageCreate,
)

from app.services.audit_log_service import list_issue_audit_logs
from app.services.my_issue_service import get_my_issues
from app.services.issue_service import (
    get_issue_details,
    update_issue,
    delete_issue,
)
from app.services.issue_message_service import (
    edit_issue_message,
    get_issue_messages,
    save_issue_message,
)

from app.api.deps import get_current_user
from app.core.dashboard_events import publish_dashboard_update
from app.core.chat_websocket_manager import chat_manager


router = APIRouter(
    prefix="/my-issues",
    tags=["My Issues"],
)
router.include_router(audit_sse_router)

logger = logging.getLogger(__name__)


# --------------------------------------------------
# GET: All projects for My Issues dropdown
# --------------------------------------------------
@router.get("/projects", response_model=list[ProjectDropdownResponse])
def get_my_issue_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Project).order_by(Project.project_name.asc())
    return db.scalars(query).all()


# --------------------------------------------------
# GET: My Issues with filters and pagination
# --------------------------------------------------
@router.get("", response_model=IssueListResponse)
def read_my_issues(
    search: str | None = Query(default=None),
    project_name: str | None = Query(default=None),
    issue_type: str | None = Query(default=None),
    shift: str | None = Query(default=None),
    issue_status: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),

    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issues, total = get_my_issues(
        db=db,
        current_user=current_user,
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
# GET: Detailed issue
# --------------------------------------------------
@router.get("/{issue_id}", response_model=MyIssueResponse)
def read_my_issue_details(
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
def read_my_issue_audit_logs(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_issue_audit_logs(db, current_user, issue_id)


# --------------------------------------------------
# GET: Previous chat messages for a particular issue
# --------------------------------------------------
@router.get(
    "/{issue_id}/messages",
    response_model=list[IssueMessageResponse],
)
def read_my_issue_messages(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_issue_messages(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
    )


# --------------------------------------------------
# POST: Send a new issue chat message
# --------------------------------------------------
@router.post(
    "/{issue_id}/messages",
    response_model=IssueMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_my_issue_message(
    issue_id: UUID,
    message_data: IssueMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Save message in PostgreSQL
    saved_message = save_issue_message(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
        markdown=message_data.markdown,
    )

    # Broadcast to users connected to this issue's chat
    try:
        await chat_manager.broadcast(
            issue_id,
            {
                "event": "new_message",
                "data": saved_message,
            },
        )

    except Exception:
        logger.exception(
            "Message saved, but chat broadcast failed"
        )

    return saved_message


# --------------------------------------------------
# PATCH: Edit a chat message
# --------------------------------------------------
@router.patch("/{issue_id}/messages/{message_id}", response_model=IssueMessageResponse)
async def edit_my_issue_message(
    issue_id: UUID,
    message_id: int,
    message_data: IssueMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message, changed = await run_in_threadpool(
        edit_issue_message, db, current_user, issue_id, message_id, message_data.markdown
    )
    if changed:
        try:
            await chat_manager.broadcast(
                issue_id, {"event": "message_edited", "data": message}
            )
        except Exception:
            logger.exception("Message edited, but chat broadcast failed")
    return message


# --------------------------------------------------
# PATCH: Update issue
# --------------------------------------------------
@router.patch("/{issue_id}", response_model=MyIssueResponse)
async def edit_my_issue(
    request: Request,
    issue_id: UUID,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = issue_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    # Database update and commit happen inside the service
    updated_issue, audit_changed = update_issue(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
        update_data=update_data,
    )

    if audit_changed:
        await publish_audit_update(request.app.state.dashboard_redis, issue_id)
    await publish_dashboard_update(request.app.state.dashboard_redis)

    return updated_issue


# --------------------------------------------------
# DELETE: Delete issue
# --------------------------------------------------
@router.delete("/{issue_id}")
async def remove_my_issue(
    request: Request,
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Database deletion and commit happen inside the service
    result = delete_issue(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
    )

    await publish_dashboard_update(request.app.state.dashboard_redis)

    return result
