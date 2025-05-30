"""empty message

Revision ID: ef64fe5ad678
Revises: b62ff61f5fd2
Create Date: 2025-04-09 11:18:55.445530

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ef64fe5ad678'
down_revision = 'b62ff61f5fd2'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('logo',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('image_url', sa.String(length=500), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('compras', schema=None) as batch_op:
        batch_op.add_column(sa.Column('rol_id', sa.Integer(), nullable=False))
        batch_op.create_foreign_key(None, 'rol', ['rol_id'], ['id'])

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('compras', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('rol_id')

    op.drop_table('logo')
    # ### end Alembic commands ###
