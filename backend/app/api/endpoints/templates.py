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
):
    """List all task templates for user."""
    # #region agent log
    import json
    import os
    import time
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".cursor", "debug.log")
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        log_data = {"location": "templates.py:21", "message": "list_templates entry", "data": {"user_id": user.id, "category": category}, "timestamp": time.time() * 1000, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "C"}
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_data) + "\n")
    except Exception:
        pass
    # #endregion
    query = select(TaskTemplate).where(TaskTemplate.user_id == user.id)
    if category:
        query = query.where(TaskTemplate.category == category)
    query = query.order_by(TaskTemplate.times_used.desc(), TaskTemplate.created_at.desc())
    
    result = await db.execute(query)
    templates = result.scalars().all()
    # #region agent log
    import os
    import time
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".cursor", "debug.log")
    try:
        log_data2 = {"location": "templates.py:33", "message": "list_templates result", "data": {"user_id": user.id, "templates_count": len(templates), "template_ids": [t.id for t in templates]}, "timestamp": time.time() * 1000, "sessionId": "debug-session", "runId": "run1", "hypothesisId": "C"}
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_data2) + "\n")
    except Exception:
        pass
    # #endregion
    return [TaskTemplateResponse.model_validate(t) for t in templates]


@router.post("/", response_model=TaskTemplateResponse)
async def create_template(
    data: TaskTemplateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new task template manually."""
    # #region agent log
    import json
    import os
    import time
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".cursor", "debug.log")
    try:
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        log_data = {"location": "templates.py:62", "message": "create_template entry", "data": {"user_id": user.id, "title": data.title, "tier": data.tier}, "timestamp": time.time() * 1000, "sessionId": "debug-session", "runId": "run2", "hypothesisId": "G"}
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_data) + "\n")
    except Exception:
        pass
    # #endregion
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
    # #region agent log
    try:
        log_data2 = {"location": "templates.py:85", "message": "create_template created", "data": {"user_id": user.id, "template_id": template.id, "title": template.title}, "timestamp": time.time() * 1000, "sessionId": "debug-session", "runId": "run2", "hypothesisId": "G"}
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_data2) + "\n")
    except Exception:
        pass
    # #endregion
    
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
