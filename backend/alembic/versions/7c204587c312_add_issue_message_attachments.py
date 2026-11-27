"""Add issue chat attachment snapshots and storage cleanup.

Revision ID: 7c204587c312
Revises: c5a7f294e831
"""

from alembic import op
import sqlalchemy as sa


revision = "7c204587c312"
down_revision = "c5a7f294e831"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "issue_message_attachments_management",
        sa.Column("attachment_id", sa.Uuid(), primary_key=True),
        sa.Column("message_id", sa.Integer(), sa.ForeignKey(
            "issue_messages_management.id", ondelete="CASCADE"
        ), nullable=False),
        sa.Column("issue_id", sa.Uuid(), sa.ForeignKey("issue_management.issue_id"), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("user_management.user_id"), nullable=False),
        sa.Column("original_file_name", sa.String(255), nullable=False),
        sa.Column("object_key", sa.String(255), nullable=False, unique=True),
        sa.Column("content_type", sa.String(127), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.create_index(
        "ix_issue_message_attachments_management_message_id",
        "issue_message_attachments_management", ["message_id"]
    )
    op.create_table(
        "issue_attachment_cleanup",
        sa.Column("object_key", sa.String(255), primary_key=True),
        sa.Column("retry_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_issue_attachment_cleanup_retry_at", "issue_attachment_cleanup", ["retry_at"])
    op.execute("""
        CREATE FUNCTION enqueue_deleted_issue_attachment() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            IF OLD.deleted_at IS NULL THEN
                INSERT INTO issue_attachment_cleanup (object_key, retry_at)
                VALUES (OLD.object_key, now()) ON CONFLICT (object_key) DO NOTHING;
            END IF;
            RETURN OLD;
        END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER cleanup_deleted_issue_attachment
        AFTER DELETE ON issue_message_attachments_management
        FOR EACH ROW EXECUTE FUNCTION enqueue_deleted_issue_attachment()
    """)


def downgrade():
    op.drop_table("issue_message_attachments_management")
    op.execute("DROP FUNCTION enqueue_deleted_issue_attachment()")
    op.drop_table("issue_attachment_cleanup")
