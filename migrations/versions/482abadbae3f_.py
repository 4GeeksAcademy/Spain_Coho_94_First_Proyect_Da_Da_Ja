"""empty message

Revision ID: 482abadbae3f
Revises: 5650b443e158
Create Date: 2025-04-16 16:34:33.937236

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision = '482abadbae3f'
down_revision = '5650b443e158'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('logo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('image_data', sa.LargeBinary(), nullable=True))
        batch_op.add_column(sa.Column('created_at', sa.DateTime(), nullable=False, 
                                      server_default=func.now()))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=False, 
                                      server_default=func.now()))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('logo', schema=None) as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('created_at')
        batch_op.drop_column('image_data')

    # ### end Alembic commands ###