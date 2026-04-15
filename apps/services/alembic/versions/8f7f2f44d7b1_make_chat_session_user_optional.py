"""make_chat_session_user_optional

Revision ID: 8f7f2f44d7b1
Revises: 0a9e7d9f92bb
Create Date: 2026-04-15 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8f7f2f44d7b1"
down_revision: Union[str, Sequence[str], None] = "0a9e7d9f92bb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column(
        "chat_sessions",
        "user_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Keep downgrade deterministic by removing rows that would violate NOT NULL.
    op.execute("DELETE FROM chat_sessions WHERE user_id IS NULL")
    op.alter_column(
        "chat_sessions",
        "user_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
