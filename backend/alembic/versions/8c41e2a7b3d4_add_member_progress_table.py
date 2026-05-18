"""add member progress table

Revision ID: 8c41e2a7b3d4
Revises: 5f2b6c7a9d10
Create Date: 2026-05-18 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "8c41e2a7b3d4"
down_revision: Union[str, Sequence[str], None] = "5f2b6c7a9d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "member_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("member_id", sa.Integer(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("muscle_size_cm", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_member_progress_id"), "member_progress", ["id"], unique=False)
    op.create_index(op.f("ix_member_progress_member_id"), "member_progress", ["member_id"], unique=False)
    op.create_index(op.f("ix_member_progress_recorded_at"), "member_progress", ["recorded_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_member_progress_recorded_at"), table_name="member_progress")
    op.drop_index(op.f("ix_member_progress_member_id"), table_name="member_progress")
    op.drop_index(op.f("ix_member_progress_id"), table_name="member_progress")
    op.drop_table("member_progress")
