import os


def get_redis_url() -> str:
    return os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
