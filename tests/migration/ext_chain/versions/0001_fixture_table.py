"""Create the fixture chain's only table.

Revision ID: 0001_fixture
Revises:
"""

import sqlalchemy as sa

from alembic import op

revision = "0001_fixture"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The FK fails unless Tracecat's chain already ran.
    op.create_table(
        "ext_chain_fixture",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("organization_id", sa.UUID, sa.ForeignKey("organization.id")),
    )


def downgrade() -> None:
    op.drop_table("ext_chain_fixture")
