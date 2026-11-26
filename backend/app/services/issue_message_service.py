
from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import DateTime, cast, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Issue, IssueMessage, User


MESSAGE_EDIT_WINDOW = timedelta(minutes=15)


def verify_issue_chat_access(
    db: Session,
    current_user: User,
    issue_id: UUID,
) -> Issue:

    issue = db.get(Issue, issue_id)

    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found",
        )

    # Only the issue creator and assigned developer can chat.
    allowed_users = {issue.issue_created_by}

    if issue.assigned_to is not None:
        allowed_users.add(issue.assigned_to)

    if current_user.user_id not in allowed_users:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access this issue chat",
        )

    return issue


def format_message(message: IssueMessage) -> dict:
    return {
        "id": message.id,
        "issue_id": message.issue_id,
        "sender_id": message.sender_id,
        "sender_name": message.sender.full_name,
        "markdown": message.markdown,
        "created_at": message.created_at,
        "updated_at": message.updated_at,
        "is_edited": (
            message.updated_at is not None and message.updated_at > message.created_at
        ),
    }


def get_issue_messages(
    db: Session,
    current_user: User,
    issue_id: UUID,
):
    verify_issue_chat_access(db, current_user, issue_id)
    return list_issue_messages(db, issue_id)


def list_issue_messages(db: Session, issue_id: UUID) -> list[dict]:
    """Load message history after the caller has verified read access."""
    query = (
        select(IssueMessage)
        .options(selectinload(IssueMessage.sender))
        .where(IssueMessage.issue_id == issue_id)
        .order_by(IssueMessage.created_at.asc(), IssueMessage.id.asc())
    )

    messages = db.scalars(query).all()

    return [format_message(message) for message in messages]


def validate_message_markdown(markdown: str) -> str:

    markdown = markdown.strip()

    if not markdown:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot be empty",
        )

    if len(markdown) > 10000:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message cannot exceed 10000 characters",
        )

    return markdown


def save_issue_message(
    db: Session,
    current_user: User,
    issue_id: UUID,
    markdown: str,
):
    issue = verify_issue_chat_access(db, current_user, issue_id)
    markdown = validate_message_markdown(markdown)

    message = IssueMessage(
        issue_id=issue.issue_id,
        sender_id=current_user.user_id,
        markdown=markdown,
    )

    try:
        db.add(message)
        db.commit()
        db.refresh(message)

        # Load the sender relationship for the response.
        saved_message = db.scalar(
            select(IssueMessage)
            .options(selectinload(IssueMessage.sender))
            .where(IssueMessage.id == message.id)
        )

        return format_message(saved_message)

    except Exception:
        db.rollback()
        raise


def edit_issue_message(
    db: Session,
    current_user: User,
    issue_id: UUID,
    message_id: int,
    markdown: str,
) -> tuple[dict, bool]:
    verify_issue_chat_access(db, current_user, issue_id)
    markdown = validate_message_markdown(markdown)

    try:
        message = db.scalar(
            select(IssueMessage)
            .options(selectinload(IssueMessage.sender))
            .where(IssueMessage.issue_id == issue_id, IssueMessage.id == message_id)
            .with_for_update()
        )
        if message is None:
            raise HTTPException(status_code=404, detail="Message not found")
        if message.sender_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Only the sender can edit this message")

        # Use PostgreSQL wall time after the lock, in the same session time zone
        # as the timezone-naive created_at supplied by the database default.
        now = db.scalar(select(cast(func.clock_timestamp(), DateTime)))
        if now >= message.created_at + MESSAGE_EDIT_WINDOW:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "message_edit_window_expired",
                    "message": "Messages can only be edited within 15 minutes of creation",
                },
            )

        changed = message.markdown != markdown
        if changed:
            message.markdown = markdown
            message.updated_at = now

        result = format_message(message)
        db.commit()
        return result, changed
    except Exception:
        db.rollback()
        raise
