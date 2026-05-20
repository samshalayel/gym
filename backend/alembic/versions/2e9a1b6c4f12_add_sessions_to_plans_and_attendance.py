"""add sessions to plans and attendance

Revision ID: 2e9a1b6c4f12
Revises: 8c41e2a7b3d4
Create Date: 2026-05-18 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "2e9a1b6c4f12"
down_revision: Union[str, Sequence[str], None] = "8c41e2a7b3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("attendance", sa.Column("duration_hours", sa.Float(), nullable=False, server_default="1"))
    op.add_column("membership_plans", sa.Column("session_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("membership_plans", "session_count")
    op.drop_column("attendance", "duration_hours")
