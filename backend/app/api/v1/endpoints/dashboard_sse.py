import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.sse import EventSourceResponse, ServerSentEvent
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app.api.deps import bearer_scheme, get_current_user, require_roles
from app.core.dashboard_events import DASHBOARD_CHANNEL, DASHBOARD_UPDATED
from app.core.enums import Role
from app.db.session import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)
check_dashboard_role = require_roles(Role.SUPPORTER, Role.DEVELOPER)


def authorize_dashboard_stream(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db, scope="function"),
) -> None:
    check_dashboard_role(get_current_user(credentials, db))


@router.get(
    "/events",
    response_class=EventSourceResponse,
    dependencies=[Depends(authorize_dashboard_stream, scope="function")],
)
async def dashboard_events(request: Request) -> AsyncIterator[ServerSentEvent]:
    redis = request.app.state.dashboard_redis
    try:
        async with redis.pubsub() as subscription:
            await subscription.subscribe(DASHBOARD_CHANNEL)
            while True:
                message = await subscription.get_message(timeout=1)
                if message and message["type"] in {"subscribe", "message"}:
                    # Subscription acknowledgments also trigger a refresh after reconnects.
                    yield ServerSentEvent(
                        event=DASHBOARD_UPDATED,
                        data={"event": DASHBOARD_UPDATED},
                        retry=3000,
                    )
    except RedisError:
        logger.exception("Dashboard Redis subscription ended")
        yield ServerSentEvent(comment="Dashboard subscription unavailable", retry=3000)
