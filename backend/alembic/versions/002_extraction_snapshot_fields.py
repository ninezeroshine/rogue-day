"""Add extraction snapshot fields for Journal UI

Revision ID: 002_extraction_snapshot_fields
Revises: 001_initial
Create Date: 2025-12-13

Adds denormalized snapshot columns to extractions to support fast journal rendering:
- xp_before_penalties, penalty_xp
- tasks_total
- tier breakdown counts
Also adds runs.penalty_xp to track cumulative penalties during the run.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_extraction_snapshot_fields"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("runs") as batch:
        batch.add_column(sa.Column("penalty_xp", sa.Integer(), server_default="0", nullable=False))

    with op.batch_alter_table("extractions") as batch:
        batch.add_column(sa.Column("xp_before_penalties", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("penalty_xp", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("tasks_total", sa.Integer(), server_default="0", nullable=False))

        batch.add_column(sa.Column("t1_completed", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("t2_completed", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("t3_completed", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("t1_failed", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("t2_failed", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("t3_failed", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("completed_with_timer", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("completed_without_timer", sa.Integer(), server_default="0", nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("extractions") as batch:
        batch.drop_column("completed_without_timer")
        batch.drop_column("completed_with_timer")
        batch.drop_column("t3_failed")
        batch.drop_column("t2_failed")
        batch.drop_column("t1_failed")
        batch.drop_column("t3_completed")
        batch.drop_column("t2_completed")
        batch.drop_column("t1_completed")

        batch.drop_column("tasks_total")
        batch.drop_column("penalty_xp")
        batch.drop_column("xp_before_penalties")

    with op.batch_alter_table("runs") as batch:
        batch.drop_column("penalty_xp")


