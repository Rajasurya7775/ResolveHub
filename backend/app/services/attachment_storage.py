import logging
from functools import lru_cache

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

from app.core.config import get_appwrite_s3_settings

logger = logging.getLogger(__name__)


class AttachmentStorage:
    def __init__(self, client, bucket: str):
        self.client = client
        self.bucket = bucket

    def upload(self, key, file, content_type, size):
        self.client.put_object(
            Bucket=self.bucket, Key=key, Body=file, ContentType=content_type, ContentLength=size
        )

    def metadata(self, key):
        return self.client.head_object(Bucket=self.bucket, Key=key)

    def open(self, key):
        return self.client.get_object(Bucket=self.bucket, Key=key)["Body"]

    def temporary_url(self, key, expires_in=60):
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=expires_in
        )

    def delete(self, key):
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError as exc:
            if exc.response["Error"]["Code"] not in {"NoSuchKey", "NoSuchObject"}:
                raise


@lru_cache
def get_attachment_storage():
    settings = get_appwrite_s3_settings()
    if not all(settings.values()):
        raise HTTPException(503, "Attachment storage is unavailable")
    try:
        client = boto3.client(
            "s3",
            endpoint_url=settings["ENDPOINT"],
            region_name=settings["REGION"],
            aws_access_key_id=settings["ACCESS_KEY_ID"],
            aws_secret_access_key=settings["SECRET_ACCESS_KEY"],
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                connect_timeout=3,
                read_timeout=15,
                retries={"total_max_attempts": 2},
            ),
        )
    except (BotoCoreError, ValueError):
        logger.error("Invalid Appwrite S3 configuration")
        raise HTTPException(503, "Attachment storage is unavailable") from None
    return AttachmentStorage(client, settings["BUCKET"])
