import logging
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.sse import EventSourceResponse, ServerSentEvent
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app.api.deps import bearer_scheme, get_current_user
from app.core.audit_events import AUDIT_LOGS_UPDATED, audit_channel
from app.db.session import get_db
from app.services.issue_service import get_issue_details

router = APIRouter()
logger = logging.getLogger(__name__)


def authorize_audit_stream(
    issue_id: UUID,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db, scope="function"),
) -> None:
    get_issue_details(db, get_current_user(credentials, db), issue_id)


@router.get(
    "/{issue_id}/audit-logs/events",
    response_class=EventSourceResponse,
    dependencies=[Depends(authorize_audit_stream, scope="function")],
)
async def audit_log_events(request: Request, issue_id: UUID) -> AsyncIterator[ServerSentEvent]:
    redis = request.app.state.dashboard_redis
    try:
        async with redis.pubsub() as subscription:
            await subscription.subscribe(audit_channel(issue_id))
            while True:
                message = await subscription.get_message(timeout=1)
                if message and message["type"] in {"subscribe", "message"}:
                    yield ServerSentEvent(
                        event=AUDIT_LOGS_UPDATED,
                        data={"issue_id": str(issue_id)},
                        retry=3000,
                    )
    except RedisError:
        logger.exception("Audit subscription ended for issue %s", issue_id)
        yield ServerSentEvent(comment="Audit subscription unavailable", retry=3000)
