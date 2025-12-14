"""
Runs API endpoints.
Thin layer that handles HTTP concerns, delegates business logic to RunService.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Run, User, Extraction, RunStatus
from app.schemas import RunResponse, ExtractionResponse, JournalEntryResponse
from app.api.dependencies import get_current_user
from app.services.run_service import RunService

router = APIRouter()


@router.get("/extractions", response_model=list[ExtractionResponse])
async def list_extractions(
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's latest extractions (journal history)."""
    safe_limit = max(1, min(limit, 100))
    result = await db.execute(
        select(Extraction)
        .where(Extraction.user_id == user.id)
        .order_by(Extraction.created_at.desc())
        .limit(safe_limit)
    )
    extractions = result.scalars().all()
    return [ExtractionResponse.model_validate(e) for e in extractions]


@router.get("/journal", response_model=list[JournalEntryResponse])
async def list_journal(
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List latest journal entries (extraction + run metadata)."""
    safe_limit = max(1, min(limit, 100))
    result = await db.execute(
        select(Extraction)
        .options(selectinload(Extraction.run))
        .where(Extraction.user_id == user.id)
        .order_by(Extraction.created_at.desc())
        .limit(safe_limit)
    )
    extractions = result.scalars().all()
    entries: list[JournalEntryResponse] = []
    for e in extractions:
        if not e.run:
            continue
        entries.append(JournalEntryResponse(
            extraction=ExtractionResponse.model_validate(e),
            run_date=e.run.run_date,
            started_at=e.run.started_at,
            extracted_at=e.run.extracted_at,
        ))
    return entries


@router.get("/current", response_model=RunResponse)
async def get_current_run(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current active run for user."""
    service = RunService(db, user)
    run = await service.get_current()
    
    if not run:
        raise HTTPException(status_code=404, detail="No active run")
    
    return service.to_response(run)


@router.post("/", response_model=RunResponse)
async def start_new_run(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Start a new run for user.
    Rate limiting: 5 runs per minute (handled by middleware).
    """
    service = RunService(db, user)
    
    try:
        run = await service.start_new()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
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
    request: Request,
    run_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Extract (finish) a run."""
    service = RunService(db, user)
    
    try:
        extraction = await service.extract(run_id)
    except ValueError as e:
        status_code = 404 if "not found" in str(e).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(e))
    
    return ExtractionResponse.model_validate(extraction)
