import logging
from uuid import UUID

from redis.asyncio import Redis
from redis.exceptions import RedisError

AUDIT_LOGS_UPDATED = "audit_logs_updated"
logger = logging.getLogger(__name__)


def audit_channel(issue_id: UUID) -> str:
    return f"resolvehub:issue:{issue_id}:audit"


async def publish_audit_update(redis: Redis, issue_id: UUID) -> None:
    try:
        await redis.publish(audit_channel(issue_id), AUDIT_LOGS_UPDATED)
    except RedisError:
        logger.exception("Audit update could not be published for issue %s", issue_id)
