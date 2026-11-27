# Issue chat attachments

Configure the five `APPWRITE_S3_*` variables in [the environment template](.env.example).
Use the regional Appwrite Cloud S3 endpoint ending in `/v1/s3`, the signing
region from Appwrite, the project ID as the access key ID, an API key secret
with file read/write scopes, and the ID of a private bucket. Configure the
bucket to accept JPEG, PNG, PDF, DOC, and DOCX up to 10 MiB. Boto3 uses
SigV4 and path-style addressing. [Appwrite documentation](https://appwrite.io/docs/products/storage/s3)

Install dependencies with `python -m pip install -r requirements.txt` and apply
`alembic upgrade head` before deploying. PostgreSQL keeps a metadata snapshot
per attachment, including the issue, message, uploader, filename, validated
MIME type, byte size, object key, and creation and deletion timestamps.
Appwrite stores the bytes.

## Client API

All requests use the existing bearer token. The issue creator and assigned
developer can use these endpoints. The message sender can delete their own
attachments.

Use `POST /api/v1/my-issues/{issue_id}/messages/attachments` with multipart
form data. Append each file under `files` (one to five parts, 10 MiB per
file) and optionally append `markdown` (up to 10,000 characters). Let the
browser supply the multipart boundary. Use the existing JSON message endpoint
for text-only messages.

A successful upload returns HTTP 201 with the entire message. History and
the WebSocket `new_message` event carry the same fields.

```json
{
  "id": 42,
  "issue_id": "19d6eeb4-bab4-4397-94f1-8909f111522c",
  "sender_id": 26,
  "sender_name": "Alex",
  "markdown": "",
  "created_at": "2026-11-27T10:30:00",
  "updated_at": null,
  "is_edited": false,
  "attachments": [
    {
      "attachment_id": "4ef412eb-828d-420d-ac6b-b850e5748ef6",
      "file_name": "error.png",
      "content_type": "image/png",
      "file_size": 245760,
      "view_url": "/api/v1/my-issues/19d6eeb4-bab4-4397-94f1-8909f111522c/messages/attachments/4ef412eb-828d-420d-ac6b-b850e5748ef6"
    }
  ]
}
```

The WebSocket envelope is `{"event":"new_message","data":<message>}`.
Existing text messages have an empty `attachments` array.

Send an authenticated GET to `view_url` to retrieve bytes through the API.
JPEG, PNG, and PDF are served inline. Word files download by default. Append
`?download=true` to download any format. For image thumbnails and PDF views,
fetch with the bearer token and render a blob URL. Revoke the blob URL when
the component closes or unmounts. For downloads, use the authenticated bytes
and the response metadata's `file_name` as the suggested filename. Display
`file_name` and `file_size` next to previews and document icons.

Send an authenticated DELETE to `view_url` to remove an attachment. The API
returns HTTP 204, including on a repeated sender deletion. On the first
deletion it broadcasts
`{"event":"attachment_deleted","data":{"issue_id":"...","message_id":42,"attachment_id":"..."}}`.
Remove that attachment from the local message. If the message has neither
text nor remaining attachments, show “Attachment removed.”

| Status | Meaning |
| --- | --- |
| 401 | Missing or invalid token |
| 403 | User lacks issue access or is trying to delete another sender’s attachment |
| 404 | Issue or attachment is missing, deleted, or belongs to a different issue |
| 413 | Attachment or multipart request is too large |
| 415 | Unsupported extension, declared MIME type, or request content type |
| 422 | Invalid attachment count, malformed file or form, or invalid message text |
| 503 | File storage is unavailable |

## Cleanup and retention

Deleting an attachment preserves its PostgreSQL snapshot with a deletion
timestamp. The API removes access at commit and retries Appwrite deletion
from a durable queue. ResolveHub has no message-delete endpoint. If an
existing issue deletion cascades to its messages, the migration queues the
remaining attachment objects for deletion and the database removes their
snapshots with the parent. Apply any retention or export policy before
permanently deleting an issue. Drain outstanding cleanup and retain or
remove bucket objects as appropriate before downgrading the migration.
