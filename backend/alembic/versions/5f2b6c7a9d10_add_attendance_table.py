"""add attendance table

Revision ID: 5f2b6c7a9d10
Revises: 836c9116ef09
Create Date: 2026-05-18 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "5f2b6c7a9d10"
down_revision: Union[str, Sequence[str], None] = "836c9116ef09"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attendance",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("member_id", sa.Integer(), nullable=False),
        sa.Column("checked_in_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["member_id"], ["members.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_attendance_checked_in_at"), "attendance", ["checked_in_at"], unique=False)
    op.create_index(op.f("ix_attendance_id"), "attendance", ["id"], unique=False)
    op.create_index(op.f("ix_attendance_member_id"), "attendance", ["member_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_attendance_member_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_id"), table_name="attendance")
    op.drop_index(op.f("ix_attendance_checked_in_at"), table_name="attendance")
    op.drop_table("attendance")
