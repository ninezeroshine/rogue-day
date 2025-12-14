"""
Tasks API endpoints.
Thin layer that handles HTTP concerns, delegates business logic to TaskService.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import TaskResponse, TaskCreate
from app.api.dependencies import get_current_user
from app.services.task_service import TaskService

router = APIRouter()


@router.post("/", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task in current run."""
    service = TaskService(db, user)
    
    try:
        task = await service.create(task_data)
    except ValueError as e:
        status_code = 404 if "no active run" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
    
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a task."""
    service = TaskService(db, user)
    
    try:
        task = await service.start(task_id)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
    
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Complete a task."""
    service = TaskService(db, user)
    
    try:
        task = await service.complete(task_id)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
    
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/fail", response_model=TaskResponse)
async def fail_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fail a task."""
    service = TaskService(db, user)
    
    try:
        task = await service.fail(task_id)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
    
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a pending task."""
    service = TaskService(db, user)
    
    try:
        await service.delete(task_id)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
    
    return {"status": "deleted"}
