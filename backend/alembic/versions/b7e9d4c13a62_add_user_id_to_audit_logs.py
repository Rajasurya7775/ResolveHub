"""Add a user reference to audit logs.

Revision ID: b7e9d4c13a62
Revises: f5b8a2c4d617
"""

import sqlalchemy as sa
from alembic import op

revision = "b7e9d4c13a62"
down_revision = "f5b8a2c4d617"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("audit_logs", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_audit_logs_user_id",
        "audit_logs",
        "user_management",
        ["user_id"],
        ["user_id"],
    )
    op.create_index(op.f("ix_audit_logs_user_id"), "audit_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_user_id"), table_name="audit_logs")
    op.drop_constraint("fk_audit_logs_user_id", "audit_logs", type_="foreignkey")
    op.drop_column("audit_logs", "user_id")
