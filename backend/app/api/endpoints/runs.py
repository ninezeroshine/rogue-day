from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, date, timedelta

from app.database import get_db
from app.models import Run, User, Task, Extraction, RunStatus
from app.schemas import RunResponse, RunCreate, ExtractionResponse, TaskResponse
from app.api.dependencies import get_current_user
from app.core.game_config import GAME_CONFIG

router = APIRouter()


@router.get("/current", response_model=RunResponse)
async def get_current_run(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current active run for user."""
    # Get active run
    today = date.today().isoformat()
    result = await db.execute(
        select(Run)
        .options(selectinload(Run.tasks))
        .where(Run.user_id == user.id, Run.status == RunStatus.ACTIVE)
        .order_by(Run.started_at.desc())
    )
    run = result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="No active run")
    
    return RunResponse(
        id=run.id,
        user_id=run.user_id,
        run_date=run.run_date,
        daily_xp=run.daily_xp,
        focus_energy=run.focus_energy,
        max_energy=run.max_energy,
        total_focus_minutes=run.total_focus_minutes,
        status=run.status,
        tasks=[TaskResponse.model_validate(t) for t in run.tasks],
        started_at=run.started_at,
        extracted_at=run.extracted_at,
    )


@router.post("/", response_model=RunResponse)
async def start_new_run(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a new run for user."""
    # Check for existing active run
    existing = await db.execute(
        select(Run).where(Run.user_id == user.id, Run.status == RunStatus.ACTIVE)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Active run already exists")
    
    # Create new run with values from GAME_CONFIG
    today = date.today().isoformat()
    base_energy = GAME_CONFIG["BASE_MAX_ENERGY"]
    
    run = Run(
        user_id=user.id,
        run_date=today,
        daily_xp=0,
        focus_energy=base_energy,
        max_energy=base_energy,
        total_focus_minutes=0,
        status=RunStatus.ACTIVE,
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)
    
    return RunResponse(
        id=run.id,
        user_id=run.user_id,
        run_date=run.run_date,
        daily_xp=run.daily_xp,
        focus_energy=run.focus_energy,
        max_energy=run.max_energy,
        total_focus_minutes=run.total_focus_minutes,
        status=run.status,
        tasks=[],
        started_at=run.started_at,
        extracted_at=run.extracted_at,
    )


@router.post("/{run_id}/extract", response_model=ExtractionResponse)
async def extract_run(
    run_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Extract (finish) a run."""
    # Get run with tasks
    result = await db.execute(
        select(Run)
        .options(selectinload(Run.tasks))
        .where(Run.id == run_id, Run.user_id == user.id)
    )
    run = result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    if run.status != RunStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Run already extracted")
    
    # Calculate stats
    completed = [t for t in run.tasks if t.status.value == "completed"]
    failed = [t for t in run.tasks if t.status.value == "failed"]
    
    # Create extraction record
    extraction = Extraction(
        user_id=user.id,
        run_id=run.id,
        final_xp=run.daily_xp,
        tasks_completed=len(completed),
        tasks_failed=len(failed),
        total_focus_minutes=run.total_focus_minutes,
    )
    db.add(extraction)
    
    # Update run status
    run.status = RunStatus.EXTRACTED
    run.extracted_at = datetime.utcnow()
    
    # Update user stats
    user.total_xp += run.daily_xp
    user.total_extractions += 1
    user.total_tasks_completed += len(completed)
    user.total_focus_minutes += run.total_focus_minutes
    
    # Streak logic: check if there was a run yesterday
    today = date.today()
    if user.last_run_at:
        last_run_date = user.last_run_at.date()
        yesterday = today - timedelta(days=1)
        
        if last_run_date >= yesterday:
            # Ran yesterday or today (same day extraction) - continue streak
            user.current_streak += 1
        else:
            # Missed a day - reset streak
            user.current_streak = 1
    else:
        # First run ever
        user.current_streak = 1
    
    user.best_streak = max(user.best_streak, user.current_streak)
    user.last_run_at = datetime.utcnow()
    
    await db.flush()
    await db.refresh(extraction)
    
    return ExtractionResponse(
        id=extraction.id,
        run_id=extraction.run_id,
        final_xp=extraction.final_xp,
        tasks_completed=extraction.tasks_completed,
        tasks_failed=extraction.tasks_failed,
        total_focus_minutes=extraction.total_focus_minutes,
        created_at=extraction.created_at,
    )

