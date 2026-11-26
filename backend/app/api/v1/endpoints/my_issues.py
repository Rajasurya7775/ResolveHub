
from datetime import date
from uuid import UUID
import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User, Project
from app.schemas.my_issue import MyIssueResponse
from app.schemas.issue import ProjectDropdownResponse, IssueUpdate
from app.services.my_issue_service import get_my_issues
from app.services.issue_service import (
    get_issue_details,
    update_issue,
    delete_issue,
)
from app.api.deps import get_current_user
from app.core.websocket_manager import manager


router = APIRouter(
    prefix="/my-issues",
    tags=["My Issues"],
)

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
@router.get("")
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
    return get_issue_details(db, current_user, issue_id)


# --------------------------------------------------
# PATCH: Update issue + WebSocket broadcast
# --------------------------------------------------
@router.patch("/{issue_id}", response_model=MyIssueResponse)
async def edit_my_issue(
    issue_id: UUID,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    update_data = issue_data.model_dump(exclude_unset=True)

    if not update_data:
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    # Database update and commit happen inside the service
    updated_issue = update_issue(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
        update_data=update_data,
    )

    # Identify the update operation
    if "issue_status" in update_data:
        action = "issue_status_changed"

    elif "assigned_to" in update_data:
        action = "issue_assigned"

    else:
        action = "issue_updated"

    # Broadcast only after successful database commit
    try:
        await manager.broadcast({
            "event": "dashboard_updated",
            "action": action,
            "issue_number": updated_issue.issue_number,
        })

    except Exception:
        logger.exception(
            "Issue updated, but dashboard broadcast failed"
        )

    return updated_issue


# --------------------------------------------------
# DELETE: Delete issue + WebSocket broadcast
# --------------------------------------------------
@router.delete("/{issue_id}")
async def remove_my_issue(
    issue_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Capture issue number before deletion
    issue = get_issue_details(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
    )

    issue_number = issue.issue_number

    # Database deletion and commit happen inside the service
    result = delete_issue(
        db=db,
        current_user=current_user,
        issue_id=issue_id,
    )

    # Broadcast only after successful deletion
    try:
        await manager.broadcast({
            "event": "dashboard_updated",
            "action": "issue_deleted",
            "issue_number": issue_number,
        })

    except Exception:
        logger.exception(
            "Issue deleted, but dashboard broadcast failed"
        )

    return result
