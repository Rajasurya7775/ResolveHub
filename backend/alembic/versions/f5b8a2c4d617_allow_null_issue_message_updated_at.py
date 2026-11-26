"""Allow new issue messages to have no update timestamp.

Revision ID: f5b8a2c4d617
Revises: 8d6cc25f8037
"""

import sqlalchemy as sa
from alembic import op

revision = "f5b8a2c4d617"
down_revision = "8d6cc25f8037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "issue_messages_management",
        "updated_at",
        existing_type=sa.DateTime(),
        nullable=True,
        server_default=None,
    )


def downgrade() -> None:
    op.execute(
        "UPDATE issue_messages_management SET updated_at = created_at "
        "WHERE updated_at IS NULL"
    )
    op.alter_column(
        "issue_messages_management",
        "updated_at",
        existing_type=sa.DateTime(),
        nullable=False,
        server_default=sa.text("now()"),
    )
