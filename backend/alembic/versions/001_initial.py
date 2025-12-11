"""Initial migration - All tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-12-11

Creates all base tables:
- users
- runs  
- tasks
- extractions
- task_templates
- presets
- preset_templates
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === USERS ===
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('telegram_id', sa.Integer(), unique=True, index=True, nullable=False),
        sa.Column('username', sa.String(100), nullable=True),
        sa.Column('first_name', sa.String(100), nullable=True),
        sa.Column('total_xp', sa.Integer(), default=0),
        sa.Column('total_extractions', sa.Integer(), default=0),
        sa.Column('total_tasks_completed', sa.Integer(), default=0),
        sa.Column('total_focus_minutes', sa.Integer(), default=0),
        sa.Column('current_streak', sa.Integer(), default=0),
        sa.Column('best_streak', sa.Integer(), default=0),
        sa.Column('notifications_enabled', sa.Boolean(), default=True),
        sa.Column('sounds_enabled', sa.Boolean(), default=True),
        sa.Column('haptics_enabled', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # === RUNS ===
    op.create_table(
        'runs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_date', sa.String(10), nullable=False),
        sa.Column('daily_xp', sa.Integer(), default=0),
        sa.Column('focus_energy', sa.Integer(), default=50),
        sa.Column('max_energy', sa.Integer(), default=50),
        sa.Column('total_focus_minutes', sa.Integer(), default=0),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('extracted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_runs_user_status', 'runs', ['user_id', 'status'])
    op.create_index('ix_runs_user_date', 'runs', ['user_id', 'run_date'])
    
    # === TASKS ===
    op.create_table(
        'tasks',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('run_id', sa.Integer(), sa.ForeignKey('runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('tier', sa.Integer(), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('xp_earned', sa.Integer(), default=0),
        sa.Column('energy_cost', sa.Integer(), default=0),
        sa.Column('use_timer', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_tasks_run_status', 'tasks', ['run_id', 'status'])
    
    # === EXTRACTIONS ===
    op.create_table(
        'extractions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('run_id', sa.Integer(), sa.ForeignKey('runs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('final_xp', sa.Integer(), default=0),
        sa.Column('tasks_completed', sa.Integer(), default=0),
        sa.Column('tasks_failed', sa.Integer(), default=0),
        sa.Column('total_focus_minutes', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # === TASK TEMPLATES ===
    op.create_table(
        'task_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('tier', sa.Integer(), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('use_timer', sa.Boolean(), default=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('source', sa.String(20), default='manual'),
        sa.Column('times_used', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('ix_task_templates_user', 'task_templates', ['user_id'])
    
    # === PRESETS ===
    op.create_table(
        'presets',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('emoji', sa.String(10), nullable=True),
        sa.Column('is_favorite', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('ix_presets_user', 'presets', ['user_id'])
    
    # === PRESET TEMPLATES (junction) ===
    op.create_table(
        'preset_templates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('preset_id', sa.Integer(), sa.ForeignKey('presets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('template_id', sa.Integer(), sa.ForeignKey('task_templates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('order', sa.Integer(), default=0),
    )
    op.create_index('ix_preset_templates_preset', 'preset_templates', ['preset_id'])


def downgrade() -> None:
    op.drop_table('preset_templates')
    op.drop_table('presets')
    op.drop_table('task_templates')
    op.drop_table('extractions')
    op.drop_table('tasks')
    op.drop_table('runs')
    op.drop_table('users')
