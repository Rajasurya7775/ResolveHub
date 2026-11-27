import os
import struct
from datetime import date
from io import BytesIO
from unittest.mock import Mock
from uuid import UUID
from zipfile import ZipFile

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-only-key")

import pytest
from botocore.exceptions import ClientError
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Issue, IssueMessage, IssueMessageAttachment, Project, User
from app.models.message_attachment import AttachmentCleanup
from app.services import issue_attachment_service as service
from app.services.attachment_storage import AttachmentStorage
from app.services.attachment_validation import CONTENT_TYPES, MAX_FILE_SIZE


def legacy_word():
    # Minimal OLE compound file with a Word FIB and a 0Table stream.
    free, end, fat = 0xFFFFFFFF, 0xFFFFFFFE, 0xFFFFFFFD
    header = bytearray(512)
    header[:8] = bytes.fromhex("d0cf11e0a1b11ae1")
    struct.pack_into("<5H", header, 24, 0x3E, 3, 0xFFFE, 9, 6)
    struct.pack_into("<9I", header, 40, 0, 1, 1, 0, 4096, end, 0, end, 0)
    struct.pack_into("<109I", header, 76, 0, *([free] * 108))
    sectors = [fat, end, *range(3, 10), end, *range(11, 18), end]

    def entry(name, kind, *, child=free, right=free, start=end, size=0):
        data = bytearray(128)
        encoded = (name + chr(0)).encode("utf-16-le")
        data[:len(encoded)] = encoded
        struct.pack_into("<HBBIII", data, 64, len(encoded), kind, 1, free, right, child)
        struct.pack_into("<IQ", data, 116, start, size)
        return data

    directory = (
        entry("Root Entry", 5, child=1)
        + entry("0Table", 2, right=2, start=10, size=4096)
        + entry("WordDocument", 2, start=2, size=4096)
        + bytes(128)
    )
    word = struct.pack("<HH", 0xA5EC, 0x00C1).ljust(4096, bytes(1))
    return header + struct.pack("<128I", *sectors, *([free] * (128 - len(sectors)))) + directory + word + bytes(4096)


def file_bytes(extension):
    file = BytesIO()
    if extension in {".jpg", ".jpeg", ".png"}:
        Image.new("RGB", (4, 4)).save(file, "PNG" if extension == ".png" else "JPEG")
    elif extension == ".pdf":
        writer = PdfWriter()
        writer.add_blank_page(width=72, height=72)
        writer.write(file)
    elif extension == ".doc":
        return bytes(legacy_word())
    else:
        with ZipFile(file, "w") as archive:
            archive.writestr(
                "[Content_Types].xml",
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-'
                'officedocument.wordprocessingml.document.main+xml"/></Types>',
            )
            archive.writestr(
                "_rels/.rels",
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Target="word/document.xml" Type="http://schemas.'
                'openxmlformats.org/officeDocument/2006/relationships/officeDocument"/>'
                '</Relationships>',
            )
            archive.writestr(
                "word/document.xml",
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body/></w:document>',
            )
    return file.getvalue()


def headers(user=1):
    return {"Authorization": f"Bearer {create_access_token(str(user))}"}


@pytest.fixture
def chat(monkeypatch):
    engine = create_engine(
        "sqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, autoflush=False)
    with sessions.begin() as db:
        db.add_all(
            User(
                user_id=i, employee_id=str(i), full_name=f"User {i}", email=f"{i}@example.test",
                password_hash="unused", role="SUPPORTER" if i == 1 else "DEVELOPER",
                role_type="TEST", account_status="ACTIVE",
            )
            for i in (1, 2, 3)
        )
        db.flush()
        db.add(Project(project_id=1, project_name="Test", project_status="ACTIVE", created_by=1))
        db.flush()
        issue = Issue(
            issue_number="TEST-1", project_id=1, shift_date=date(2026, 1, 1), issue_title="Test",
            issue_type="OTHER", issue_description="Test", issue_status="OPEN",
            issue_created_by=1, assigned_to=2,
        )
        other_issue = Issue(
            issue_number="TEST-2", project_id=1, shift_date=date(2026, 1, 1), issue_title="Other",
            issue_type="OTHER", issue_description="Test", issue_status="OPEN",
            issue_created_by=1, assigned_to=2,
        )
        db.add_all([issue, other_issue])
        db.flush()
        issue_id, other_id = issue.issue_id, other_issue.issue_id

    objects = {}
    s3 = Mock()
    s3.put_object.side_effect = lambda **kwargs: objects.update({kwargs["Key"]: kwargs["Body"].read()})
    s3.get_object.side_effect = lambda **kwargs: {"Body": BytesIO(objects[kwargs["Key"]])}
    s3.delete_object.side_effect = lambda **kwargs: objects.pop(kwargs["Key"], None)
    monkeypatch.setattr(service, "get_attachment_storage", lambda: AttachmentStorage(s3, "private"))
    monkeypatch.setattr(service, "SessionLocal", sessions)
    for name in ("ENDPOINT", "REGION", "ACCESS_KEY_ID", "SECRET_ACCESS_KEY", "BUCKET"):
        monkeypatch.delenv(f"APPWRITE_S3_{name}", raising=False)

    def database():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = database
    try:
        with TestClient(app) as client:
            yield client, f"/api/v1/my-issues/{issue_id}/messages", other_id, sessions, objects, s3
    finally:
        app.dependency_overrides.pop(get_db)
        engine.dispose()


def upload(client, base, extension=".png", *, user=1, data=None, markdown=""):
    payload = file_bytes(extension) if data is None else data
    return client.post(
        f"{base}/attachments", headers=headers(user),
        files={"files": (f"report{extension}", payload, CONTENT_TYPES.get(extension, "text/html"))},
        data={"markdown": markdown},
    )


@pytest.mark.parametrize("extension", CONTENT_TYPES)
def test_upload_snapshot_and_retrieve(chat, extension):
    client, base, _, sessions, objects, _ = chat
    result = upload(client, base, extension)
    assert result.status_code == 201, result.text
    message = result.json()
    assert message["markdown"] == ""
    attachment, = message["attachments"]
    with sessions() as db:
        snapshot = db.get(IssueMessageAttachment, UUID(attachment["attachment_id"]))
        assert snapshot.message_id == message["id"]
        assert snapshot.issue_id == UUID(message["issue_id"])
        assert snapshot.uploaded_by == 1
        assert snapshot.original_file_name == attachment["file_name"] == f"report{extension}"
        assert snapshot.content_type == attachment["content_type"] == CONTENT_TYPES[extension]
        assert snapshot.file_size == attachment["file_size"] == len(file_bytes(extension))
        assert snapshot.created_at and snapshot.deleted_at is None
        assert snapshot.object_key in objects and snapshot.original_file_name not in snapshot.object_key
        assert db.scalars(select(AttachmentCleanup)).all() == []
    assert client.get(base, headers=headers(2)).json() == [message]
    view = client.get(attachment["view_url"], headers=headers(2))
    assert view.status_code == 200
    assert view.content == file_bytes(extension)
    assert view.headers["content-type"] == CONTENT_TYPES[extension]
    assert view.headers["x-content-type-options"] == "nosniff"
    expected = "attachment" if extension.startswith(".doc") else "inline"
    assert view.headers["content-disposition"].startswith(expected)
    download = client.get(attachment["view_url"], params={"download": "true"}, headers=headers())
    assert download.headers["content-disposition"].startswith("attachment")


@pytest.mark.parametrize(
    ("extension", "payload", "mime", "status"),
    [
        (".html", b"<html>", "text/html", 415),
        (".png", b"<html>", "image/png", 422),
        (".png", b"not a pdf", "application/pdf", 415),
        (".pdf", b"%PDF-1.7", "application/pdf", 422),
        (".doc", b"not an OLE document", "application/msword", 422),
        (".docx", b"not a ZIP", CONTENT_TYPES[".docx"], 422),
        (".png", b"x" * (MAX_FILE_SIZE + 1), "image/png", 413),
    ],
)
def test_invalid_attachments(chat, extension, payload, mime, status):
    client, base, _, _, objects, _ = chat
    result = client.post(
        f"{base}/attachments", headers=headers(), files={"files": (f"x{extension}", payload, mime)}
    )
    assert result.status_code == status
    assert not objects


def test_attachment_count_limit(chat):
    client, base, _, _, objects, _ = chat
    part = ("files", ("report.png", file_bytes(".png"), "image/png"))
    assert client.post(f"{base}/attachments", headers=headers(), files=[part] * 6).status_code == 422
    accepted = client.post(f"{base}/attachments", headers=headers(), files=[part] * 5)
    assert accepted.status_code == 201
    assert len(accepted.json()["attachments"]) == len(objects) == 5


def test_permissions_identical_names_and_soft_delete(chat):
    client, base, other_id, sessions, objects, _ = chat
    assert upload(client, base, user=3).status_code == 403
    first = upload(client, base, markdown="Check this").json()["attachments"][0]
    second = upload(client, base, user=2).json()["attachments"][0]
    assert first["file_name"] == second["file_name"]
    assert len(objects) == 2
    url = first["view_url"]
    assert client.get(url).status_code == 401
    assert client.get(url, headers=headers(3)).status_code == 403
    cross_issue = f"/api/v1/my-issues/{other_id}/messages/attachments/{first['attachment_id']}"
    assert client.get(cross_issue, headers=headers()).status_code == 404
    assert client.delete(url, headers=headers(2)).status_code == 403
    assert client.delete(url, headers=headers()).status_code == 204
    assert client.delete(url, headers=headers()).status_code == 204
    assert client.get(url, headers=headers()).status_code == 404
    assert client.get(base, headers=headers()).json()[0]["attachments"] == []
    with sessions() as db:
        deleted = db.get(IssueMessageAttachment, UUID(first["attachment_id"]))
        assert deleted.deleted_at is not None
        assert deleted.original_file_name == first["file_name"]
        assert deleted.object_key not in objects
    assert len(objects) == 1


def test_websocket_broadcast_to_both_participants(chat):
    client, base, _, sessions, _, _ = chat
    ws_path = base.replace("/api/v1/", "/api/v1/ws/")
    with (
        client.websocket_connect(f"{ws_path}?token={create_access_token('1')}") as creator,
        client.websocket_connect(f"{ws_path}?token={create_access_token('2')}") as developer,
    ):
        result = upload(client, base)
        assert result.status_code == 201
        expected = {"event": "new_message", "data": result.json()}
        assert creator.receive_json() == developer.receive_json() == expected
        with sessions() as db:
            assert db.get(IssueMessage, result.json()["id"]) is not None
        creator.send_json({"markdown": "Existing text WebSocket flow"})
        text = creator.receive_json()
        assert developer.receive_json() == text
        assert text["data"]["attachments"] == []


def storage_error():
    return ClientError({"Error": {"Code": "ServiceUnavailable"}}, "PutObject")


def test_partial_upload_failure_cleans_uploaded_objects(chat):
    client, base, _, sessions, objects, s3 = chat
    real_put = s3.put_object.side_effect

    def fail_second(**kwargs):
        real_put(**kwargs)
        if len(objects) == 2:
            raise storage_error()

    s3.put_object.side_effect = fail_second
    part = ("files", ("report.png", file_bytes(".png"), "image/png"))
    result = client.post(f"{base}/attachments", headers=headers(), files=[part, part])
    assert result.status_code == 503
    assert not objects
    with sessions() as db:
        assert db.scalars(select(IssueMessage)).all() == []
        assert db.scalars(select(AttachmentCleanup)).all() == []


def test_database_failure_leaves_durable_cleanup_job(chat, monkeypatch):
    client, base, _, sessions, objects, s3 = chat
    real_commit = sessions.class_.commit
    real_delete = s3.delete_object.side_effect

    def fail_commit(db):
        if db.deleted:
            raise RuntimeError("Simulated database commit failure")
        return real_commit(db)

    monkeypatch.setattr(sessions.class_, "commit", fail_commit)
    s3.delete_object.side_effect = storage_error()
    with pytest.raises(RuntimeError, match="Simulated database commit failure"):
        upload(client, base)
    with sessions() as db:
        job, = db.scalars(select(AttachmentCleanup)).all()
        assert job.object_key in objects
        assert db.scalars(select(IssueMessageAttachment)).all() == []
        assert db.scalars(select(IssueMessage)).all() == []
        key = job.object_key
    s3.delete_object.side_effect = real_delete
    service.try_cleanup([key])
    assert not objects
    with sessions() as db:
        assert db.scalars(select(AttachmentCleanup)).all() == []


def test_active_pdf_is_rejected(chat):
    client, base, _, _, objects, _ = chat
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.add_js("app.alert('test')")
    file = BytesIO()
    writer.write(file)
    assert upload(client, base, ".pdf", data=file.getvalue()).status_code == 422
    assert not objects


def test_deleted_attachment_is_hidden_while_storage_retries(chat):
    client, base, _, sessions, objects, s3 = chat
    attachment = upload(client, base).json()["attachments"][0]
    real_delete = s3.delete_object.side_effect
    s3.delete_object.side_effect = storage_error()
    url = attachment["view_url"]
    assert client.delete(url, headers=headers()).status_code == 204
    assert client.get(url, headers=headers(2)).status_code == 404
    with sessions() as db:
        snapshot = db.get(IssueMessageAttachment, UUID(attachment["attachment_id"]))
        key = snapshot.object_key
        assert key in objects
        assert db.get(AttachmentCleanup, key) is not None
    s3.delete_object.side_effect = real_delete
    service.try_cleanup([key])
    assert not objects


def test_existing_json_text_message(chat):
    client, base, _, _, _, s3 = chat
    result = client.post(base, headers=headers(), json={"markdown": "  Text only  "})
    assert result.status_code == 201
    assert result.json()["markdown"] == "Text only"
    assert result.json()["attachments"] == []
    s3.put_object.assert_not_called()
