
import logging
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    WebSocket,
    WebSocketDisconnect,
    HTTPException,
)
from sqlalchemy.orm import Session

from app.core.enums import AccountStatus
from app.core.security import decode_access_token
from app.core.chat_websocket_manager import chat_manager
from app.db.session import get_db
from app.models import User
from app.services.issue_message_service import (
    verify_issue_chat_access,
    save_issue_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["My Issues Chat"])


@router.websocket("/ws/my-issues/{issue_id}/messages")
@router.websocket("/ws/issues/{issue_id}/messages", name="versioned_legacy_issue_chat")
async def issue_chat_websocket(
    websocket: WebSocket,
    issue_id: UUID,
    token: str,
    db: Session = Depends(get_db),
):
    # 1. Authenticate user
    payload = decode_access_token(token)

    if not payload:
        await websocket.close(
            code=4401,
            reason="Invalid or expired token",
        )
        return

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        await websocket.close(
            code=4401,
            reason="Invalid token subject",
        )
        return

    current_user = db.get(User, user_id)

    if current_user is None:
        await websocket.close(code=4401, reason="User not found")
        return

    if current_user.account_status != AccountStatus.ACTIVE:
        await websocket.close(code=4403, reason="Account is inactive")
        return

    # 2. Verify issue chat access
    try:
        issue = verify_issue_chat_access(
            db=db,
            current_user=current_user,
            issue_id=issue_id,
        )
        logger.info(
            "Chat access granted: user=%s issue=%s",
            user_id,
            issue.issue_number,
        )

    except HTTPException as exc:
        logger.warning(
            "Chat access denied: user=%s issue=%s reason=%s",
            user_id,
            issue_id,
            exc.detail,
        )
        await websocket.close(
            code=4403,
            reason="Issue chat access denied",
        )
        return

    except Exception:
        logger.exception("Unexpected chat authorization error")
        await websocket.close(
            code=1011,
            reason="Internal server error",
        )
        return

    # 3. Connect to issue-specific chat room
    await chat_manager.connect(issue_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()

            if not isinstance(data, dict):
                await websocket.send_json({
                    "event": "error",
                    "message": "Invalid message format",
                })
                continue

            markdown = data.get("markdown")

            if not isinstance(markdown, str):
                await websocket.send_json({
                    "event": "error",
                    "message": "Message content is required",
                })
                continue

            try:
                # 4. Save message in PostgreSQL
                saved_message = save_issue_message(
                    db=db,
                    current_user=current_user,
                    issue_id=issue_id,
                    markdown=markdown,
                )

                # 5. Broadcast to both chat participants
                await chat_manager.broadcast(
                    issue_id,
                    {
                        "event": "new_message",
                        "data": saved_message,
                    },
                )

            except HTTPException as exc:
                await websocket.send_json({
                    "event": "error",
                    "message": exc.detail,
                })

            except Exception:
                db.rollback()
                logger.exception("Failed to save chat message")

                await websocket.send_json({
                    "event": "error",
                    "message": "Unable to send message",
                })

    except WebSocketDisconnect:
        logger.info(
            "Chat disconnected: user=%s issue=%s",
            user_id,
            issue_id,
        )

    finally:
        chat_manager.disconnect(issue_id, websocket)
        db.close()
