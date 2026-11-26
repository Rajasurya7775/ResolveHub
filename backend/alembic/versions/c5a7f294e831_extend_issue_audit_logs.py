"""Capture issue update actions in audit logs.

Revision ID: c5a7f294e831
Revises: b7e9d4c13a62
"""

import sqlalchemy as sa
from alembic import op

revision = "c5a7f294e831"
down_revision = "b7e9d4c13a62"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("actor_name", sa.String(100)))
    op.add_column("audit_logs", sa.Column("actor_role", sa.String(20)))
    op.add_column("audit_logs", sa.Column("change_group_id", sa.Uuid()))
    # Interpret legacy naive timestamps as UTC.
    op.alter_column(
        "audit_logs", "updated_at",
        type_=sa.DateTime(timezone=True),
        postgresql_using="updated_at AT TIME ZONE 'UTC'",
    )
    op.create_index(
        "ix_audit_logs_issue_timestamp", "audit_logs",
        ["issue_id", "updated_at", "audit_id"],
    )
    op.drop_constraint("audit_logs_issue_id_fkey", "audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "audit_logs_issue_id_fkey", "audit_logs", "issue_management",
        ["issue_id"], ["issue_id"], ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("audit_logs_issue_id_fkey", "audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "audit_logs_issue_id_fkey", "audit_logs", "issue_management",
        ["issue_id"], ["issue_id"],
    )
    op.drop_index("ix_audit_logs_issue_timestamp", table_name="audit_logs")
    op.alter_column(
        "audit_logs", "updated_at",
        type_=sa.DateTime(timezone=False),
        postgresql_using="updated_at AT TIME ZONE 'UTC'",
    )
    op.drop_column("audit_logs", "change_group_id")
    op.drop_column("audit_logs", "actor_role")
    op.drop_column("audit_logs", "actor_name")
