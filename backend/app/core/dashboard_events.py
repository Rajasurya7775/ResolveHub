import logging

from redis.asyncio import Redis
from redis.exceptions import RedisError

DASHBOARD_CHANNEL = "resolvehub:dashboard:updates"
DASHBOARD_UPDATED = "dashboard_updated"

logger = logging.getLogger(__name__)


async def publish_dashboard_update(redis: Redis) -> None:
    try:
        await redis.publish(DASHBOARD_CHANNEL, DASHBOARD_UPDATED)
    except RedisError:
        logger.exception("Dashboard update could not be published after the issue was saved")
