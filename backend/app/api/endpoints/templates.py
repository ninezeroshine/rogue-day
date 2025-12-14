"""
Task Templates API endpoints.
Allows users to save reusable task configurations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import TaskTemplate, Task, Run, User, RunStatus
from app.schemas import (
    TaskTemplateCreate, TaskTemplateFromTask, TaskTemplateResponse
)
from app.api.dependencies import get_current_user

router = APIRouter()


@router.get("/", response_model=list[TaskTemplateResponse])
async def list_templates(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    category: str | None = None,
    offset: int = 0,
    limit: int = 50,
):
    """List task templates for user (paginated)."""
    # Clamp limit to reasonable bounds
    safe_limit = max(1, min(limit, 100))
    safe_offset = max(0, offset)
    
    query = select(TaskTemplate).where(TaskTemplate.user_id == user.id)
    if category:
        query = query.where(TaskTemplate.category == category)
    query = query.order_by(TaskTemplate.times_used.desc(), TaskTemplate.created_at.desc())
    query = query.offset(safe_offset).limit(safe_limit)
    
    result = await db.execute(query)
    templates = result.scalars().all()
    response_data = [TaskTemplateResponse.model_validate(t) for t in templates]
    return response_data


@router.post("/", response_model=TaskTemplateResponse)
async def create_template(
    data: TaskTemplateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task template manually."""
    # Validate tier
    if data.tier not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Invalid tier (must be 1, 2, or 3)")
    
    template = TaskTemplate(
        user_id=user.id,
        title=data.title,
        tier=data.tier,
        duration=data.duration,
        use_timer=data.use_timer,
        category=data.category,
        source="manual",
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    
    return TaskTemplateResponse.model_validate(template)


@router.post("/from-task", response_model=TaskTemplateResponse)
async def create_template_from_task(
    data: TaskTemplateFromTask,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a template from an existing task (saves task config as reusable template)."""
    # Get task and verify ownership
    result = await db.execute(
        select(Task)
        .join(Run)
        .where(Task.id == data.task_id, Run.user_id == user.id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    template = TaskTemplate(
        user_id=user.id,
        title=task.title,
        tier=task.tier,
        duration=task.duration,
        use_timer=task.use_timer,
        category=data.category,
        source="from_task",
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    
    return TaskTemplateResponse.model_validate(template)


@router.get("/{template_id}", response_model=TaskTemplateResponse)
async def get_template(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single template by ID."""
    result = await db.execute(
        select(TaskTemplate)
        .where(TaskTemplate.id == template_id, TaskTemplate.user_id == user.id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return TaskTemplateResponse.model_validate(template)


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a task template."""
    result = await db.execute(
        select(TaskTemplate)
        .where(TaskTemplate.id == template_id, TaskTemplate.user_id == user.id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await db.delete(template)
    await db.flush()
    
    return {"status": "deleted"}
