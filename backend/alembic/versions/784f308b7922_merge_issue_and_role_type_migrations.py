"""merge issue and role type migrations

Revision ID: 784f308b7922
Revises: 4cd3947b5a46, e1c1930704c7
Create Date: 2026-11-12 06:26:26.279212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '784f308b7922'
down_revision: Union[str, Sequence[str], None] = ('4cd3947b5a46', 'e1c1930704c7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
