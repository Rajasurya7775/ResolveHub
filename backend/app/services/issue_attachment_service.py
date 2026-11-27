import asyncio
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from uuid import UUID, uuid4

from botocore.exceptions import BotoCoreError, ClientError, ConnectionClosedError, ReadTimeoutError
from fastapi import HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_appwrite_s3_settings
from app.db.session import SessionLocal
from app.models import IssueMessage, User
from app.models.message_attachment import AttachmentCleanup, IssueMessageAttachment
from app.services.attachment_storage import get_attachment_storage
from app.services.attachment_validation import MAX_ATTACHMENTS, WORD_TYPES, validate_upload
from app.services.issue_message_service import (
    format_message,
    validate_message_markdown,
    verify_issue_chat_access,
)

logger = logging.getLogger(__name__)
STORAGE_ERRORS = (BotoCoreError, ClientError)


def create_attachment_message(
    db: Session, user: User, issue_id: UUID, markdown: str, files: list[UploadFile]
):
    verify_issue_chat_access(db, user, issue_id)
    if not 1 <= len(files) <= MAX_ATTACHMENTS:
        raise HTTPException(422, "Provide between one and five attachments")
    markdown = validate_message_markdown(markdown) if markdown.strip() else ""
    attachments = []
    for file in files:
        name, extension, content_type, size = validate_upload(file)
        attachment_id = uuid4()
        attachments.append(IssueMessageAttachment(
            attachment_id=attachment_id,
            issue_id=issue_id,
            uploaded_by=user.user_id,
            original_file_name=name,
            object_key=f"issues/{issue_id}/messages/{attachment_id}{extension}",
            content_type=content_type,
            file_size=size,
        ))

    storage = get_attachment_storage()
    keys = [attachment.object_key for attachment in attachments]
    # Persist cleanup intent before any put. The upload transaction locks these
    # rows and removes them atomically when it publishes the message.
    expiration = datetime.now(timezone.utc) + timedelta(minutes=5)
    try:
        db.add_all(AttachmentCleanup(object_key=key, retry_at=expiration) for key in keys)
        db.commit()
        pending = db.scalars(
            select(AttachmentCleanup).where(AttachmentCleanup.object_key.in_(keys)).with_for_update()
        ).all()
        if len(pending) != len(keys):
            raise HTTPException(503, "Attachment upload expired")
        verify_issue_chat_access(db, user, issue_id)
        message = IssueMessage(
            issue_id=issue_id, sender=user, markdown=markdown, attachments=attachments
        )
        db.add(message)
        db.flush()
        for attachment, file in zip(attachments, files, strict=True):
            storage.upload(attachment.object_key, file.file, attachment.content_type, attachment.file_size)
        for job in pending:
            db.delete(job)
        response = format_message(message)
        db.commit()
        return response
    except Exception as exc:
        db.rollback()
        try_cleanup(
            keys, recheck=isinstance(exc, (ConnectionClosedError, ReadTimeoutError))
        )
        if isinstance(exc, STORAGE_ERRORS):
            raise HTTPException(503, "Attachment storage is unavailable") from exc
        raise


def find_attachment(db, user, issue_id, attachment_id, *, lock=False):
    verify_issue_chat_access(db, user, issue_id)
    query = (
        select(IssueMessageAttachment)
        .join(IssueMessage, IssueMessage.id == IssueMessageAttachment.message_id)
        .where(
            IssueMessageAttachment.attachment_id == attachment_id,
            IssueMessageAttachment.issue_id == issue_id,
            IssueMessage.issue_id == issue_id,
        )
    )
    if lock:
        query = query.with_for_update(of=IssueMessageAttachment)
    else:
        query = query.where(IssueMessageAttachment.deleted_at.is_(None))
    attachment = db.scalar(query)
    if attachment is None:
        raise HTTPException(404, "Attachment not found")
    return attachment


def open_attachment(db, user, issue_id, attachment_id, download):
    attachment = find_attachment(db, user, issue_id, attachment_id)
    try:
        body = get_attachment_storage().open(attachment.object_key)
    except STORAGE_ERRORS as exc:
        raise HTTPException(503, "Attachment storage is unavailable") from exc

    disposition = "attachment" if download or attachment.content_type in WORD_TYPES.values() else "inline"
    headers = {
        "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(attachment.original_file_name, safe='')}",
        "Content-Length": str(attachment.file_size),
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        "Cache-Control": "private, no-store",
    }
    return body, attachment.content_type, headers


def delete_attachment(db, user, issue_id, attachment_id):
    try:
        attachment = find_attachment(db, user, issue_id, attachment_id, lock=True)
        message = db.get(IssueMessage, attachment.message_id)
        if message.sender_id != user.user_id:
            raise HTTPException(403, "Only the sender can delete this attachment")
        if attachment.deleted_at is not None:
            return None
        now = datetime.now(timezone.utc)
        attachment.deleted_at = now
        key = attachment.object_key
        db.add(AttachmentCleanup(object_key=key, retry_at=now))
        event = {"issue_id": issue_id, "message_id": message.id, "attachment_id": attachment_id}
        db.commit()
    except Exception:
        db.rollback()
        raise
    try_cleanup([key])
    return event


def try_cleanup(keys=None, *, recheck=False):
    """A missing job means the upload committed or another worker completed cleanup."""
    try:
        storage = get_attachment_storage()
        with SessionLocal.begin() as db:
            query = select(AttachmentCleanup).order_by(AttachmentCleanup.retry_at)
            if keys is None:
                query = query.where(AttachmentCleanup.retry_at <= datetime.now(timezone.utc)).limit(10)
            else:
                query = query.where(AttachmentCleanup.object_key.in_(keys))
            for job in db.scalars(query.with_for_update(skip_locked=True)).all():
                try:
                    storage.delete(job.object_key)
                except STORAGE_ERRORS:
                    logger.warning("Attachment object cleanup failed; scheduling retry")
                    job.retry_at = datetime.now(timezone.utc) + timedelta(minutes=1)
                else:
                    if recheck:
                        # A timed-out put can still complete after the first delete.
                        job.retry_at = datetime.now(timezone.utc) + timedelta(minutes=5)
                    else:
                        db.delete(job)
    except Exception:
        logger.exception("Unable to process attachment cleanup")


async def run_attachment_cleanup():
    if all(get_appwrite_s3_settings().values()):
        while True:
            await run_in_threadpool(try_cleanup)
            await asyncio.sleep(30)
