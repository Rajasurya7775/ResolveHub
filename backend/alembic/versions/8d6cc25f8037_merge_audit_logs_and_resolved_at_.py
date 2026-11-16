"""merge audit logs and resolved at migrations

Revision ID: 8d6cc25f8037
Revises: 58218ce567b3, d67a6f45d4c6
Create Date: 2026-11-14 18:19:51.562155

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d6cc25f8037'
down_revision: Union[str, Sequence[str], None] = ('58218ce567b3', 'd67a6f45d4c6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
