from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models import Task, Run, User, TaskStatus, RunStatus
from app.schemas import TaskResponse, TaskCreate

# Tier configuration (same as frontend)
TIER_CONFIG = {
    1: {"energy_cost": 0, "base_xp": 15, "can_fail": False},
    2: {"energy_cost": 5, "base_xp": 65, "can_fail": True},
    3: {"energy_cost": 15, "base_xp": 175, "can_fail": True},
}

router = APIRouter()


@router.post("/", response_model=TaskResponse)
async def create_task(
    telegram_id: int,
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new task in current run."""
    # Get user
    user_result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get active run
    run_result = await db.execute(
        select(Run).where(Run.user_id == user.id, Run.status == RunStatus.ACTIVE)
    )
    run = run_result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="No active run")
    
    # Get tier config
    config = TIER_CONFIG.get(task_data.tier)
    if not config:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    # Check energy
    if run.focus_energy < config["energy_cost"]:
        raise HTTPException(status_code=400, detail="Not enough energy")
    
    # Calculate XP
    duration_multiplier = task_data.duration / 5  # Simplified
    timer_multiplier = 1.0 if task_data.use_timer else 0.8
    xp_earned = int(config["base_xp"] * duration_multiplier * timer_multiplier)
    
    # Spend energy
    run.focus_energy -= config["energy_cost"]
    
    # Create task
    task = Task(
        run_id=run.id,
        title=task_data.title,
        tier=task_data.tier,
        duration=task_data.duration,
        status=TaskStatus.PENDING,
        xp_earned=xp_earned,
        energy_cost=config["energy_cost"],
        use_timer=task_data.use_timer,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: int,
    telegram_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Start a task."""
    task = await _get_user_task(task_id, telegram_id, db)
    
    if task.status != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Task already started")
    
    task.status = TaskStatus.ACTIVE
    task.started_at = datetime.utcnow()
    
    await db.flush()
    await db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    telegram_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Complete a task."""
    task = await _get_user_task(task_id, telegram_id, db)
    
    if task.status not in [TaskStatus.PENDING, TaskStatus.ACTIVE]:
        raise HTTPException(status_code=400, detail="Task already finished")
    
    # Get run
    run_result = await db.execute(select(Run).where(Run.id == task.run_id))
    run = run_result.scalar_one()
    
    # Add XP
    run.daily_xp += task.xp_earned
    
    # Return energy
    run.focus_energy = min(run.max_energy, run.focus_energy + task.energy_cost)
    
    # Add focus minutes
    run.total_focus_minutes += task.duration
    
    # Update task
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
    
    await db.flush()
    await db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/fail", response_model=TaskResponse)
async def fail_task(
    task_id: int,
    telegram_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Fail a task."""
    task = await _get_user_task(task_id, telegram_id, db)
    
    config = TIER_CONFIG.get(task.tier)
    if not config or not config["can_fail"]:
        raise HTTPException(status_code=400, detail="This task cannot fail")
    
    if task.status != TaskStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Task not active")
    
    # Get run for XP penalty (if T3)
    run_result = await db.execute(select(Run).where(Run.id == task.run_id))
    run = run_result.scalar_one()
    
    # Apply penalty
    if task.tier == 3:
        # T3: lose 10% of daily XP
        penalty = int(run.daily_xp * 0.1)
        run.daily_xp = max(0, run.daily_xp - penalty)
    # T2: energy already spent, just not returned
    
    # Update task
    task.status = TaskStatus.FAILED
    task.completed_at = datetime.utcnow()
    
    await db.flush()
    await db.refresh(task)
    
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    telegram_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a pending task."""
    task = await _get_user_task(task_id, telegram_id, db)
    
    if task.status != TaskStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only delete pending tasks")
    
    # Return energy
    run_result = await db.execute(select(Run).where(Run.id == task.run_id))
    run = run_result.scalar_one()
    run.focus_energy = min(run.max_energy, run.focus_energy + task.energy_cost)
    
    await db.delete(task)
    await db.flush()
    
    return {"status": "deleted"}


async def _get_user_task(task_id: int, telegram_id: int, db: AsyncSession) -> Task:
    """Helper to get task and verify ownership."""
    # Get user
    user_result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get task with run
    result = await db.execute(
        select(Task).join(Run).where(Task.id == task_id, Run.user_id == user.id)
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task
