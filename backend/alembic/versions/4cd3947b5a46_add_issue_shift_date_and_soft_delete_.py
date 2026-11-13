"""add issue shift date and soft delete fields

Revision ID: 4cd3947b5a46
Revises: 098128a61d1d
Create Date: 2026-11-06 12:37:10.722500

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4cd3947b5a46'
down_revision: Union[str, Sequence[str], None] = '098128a61d1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nullable first because existing issues already exist.
    op.add_column(
        "issue_management",
        sa.Column("shift_date", sa.Date(), nullable=True),
    )

    # Backfill existing records using their issue creation date.
    op.execute("""
        UPDATE issue_management
        SET shift_date = CAST(issue_created_at AS DATE)
        WHERE shift_date IS NULL
    """)

    # Make shift_date mandatory after backfilling.
    op.alter_column(
        "issue_management",
        "shift_date",
        existing_type=sa.Date(),
        nullable=False,
    )

    op.add_column(
        "issue_management",
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )

    op.add_column(
        "issue_management",
        sa.Column("deleted_by", sa.Integer(), nullable=True),
    )

    op.create_foreign_key(
        "fk_issue_management_deleted_by_user",
        "issue_management",
        "user_management",
        ["deleted_by"],
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_issue_management_deleted_by_user",
        "issue_management",
        type_="foreignkey",
    )
    op.drop_column("issue_management", "deleted_by")
    op.drop_column("issue_management", "deleted_at")
    op.drop_column("issue_management", "shift_date")