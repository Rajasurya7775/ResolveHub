import os


def get_redis_url() -> str:
    return os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

def get_appwrite_s3_settings() -> dict[str, str]:
    return {
        name: os.getenv(f"APPWRITE_S3_{name}", "")
        for name in ("ENDPOINT", "REGION", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET")
    }
