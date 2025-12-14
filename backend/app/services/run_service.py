"""
Run Service - Business logic for run operations.
Extracted from endpoints for better testability and reusability.
"""

from datetime import datetime, date, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Run, User, Task, Extraction, RunStatus, TaskStatus
from app.schemas import RunResponse, ExtractionResponse, TaskResponse
from app.core.game_config import GAME_CONFIG


class RunService:
    """Service for managing runs (game sessions)."""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
    
    async def get_current(self) -> Run | None:
        """Get user's current active run with tasks."""
        result = await self.db.execute(
            select(Run)
            .options(selectinload(Run.tasks))
            .where(Run.user_id == self.user.id, Run.status == RunStatus.ACTIVE)
            .order_by(Run.started_at.desc())
        )
        return result.scalar_one_or_none()
    
    async def start_new(self) -> Run:
        """
        Start a new run for user.
        
        Uses SELECT FOR UPDATE to prevent race condition where two simultaneous
        requests could both pass the "no active run" check.
        
        Raises:
            ValueError: If active run already exists
        """
        from sqlalchemy.exc import IntegrityError
        
        # Check for existing active run WITH lock to prevent race condition
        existing = await self.db.execute(
            select(Run)
            .where(Run.user_id == self.user.id, Run.status == RunStatus.ACTIVE)
            .with_for_update()
        )
        if existing.scalar_one_or_none():
            raise ValueError("Active run already exists")
        
        # Create new run with values from GAME_CONFIG
        today = date.today().isoformat()
        base_energy = GAME_CONFIG["BASE_MAX_ENERGY"]
        
        run = Run(
            user_id=self.user.id,
            run_date=today,
            daily_xp=0,
            focus_energy=base_energy,
            max_energy=base_energy,
            total_focus_minutes=0,
            status=RunStatus.ACTIVE,
        )
        self.db.add(run)
        
        try:
            await self.db.flush()
            await self.db.refresh(run)
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("Active run already exists")
        
        return run
    
    async def extract(self, run_id: int) -> Extraction:
        """
        Extract (finish) a run and create extraction record.
        
        This method:
        1. Auto-fails any active tasks
        2. Applies T3 penalty for failed tasks
        3. Creates extraction record with stats
        4. Updates user aggregate stats
        5. Handles streak logic
        
        Raises:
            ValueError: If run not found or already extracted
        """
        # Get run with tasks
        result = await self.db.execute(
            select(Run)
            .options(selectinload(Run.tasks))
            .where(Run.id == run_id, Run.user_id == self.user.id)
        )
        run = result.scalar_one_or_none()
        
        if not run:
            raise ValueError("Run not found")
        
        if run.status != RunStatus.ACTIVE:
            raise ValueError("Run already extracted")
        
        # Auto-fail active tasks
        self._auto_fail_active_tasks(run)
        
        # Calculate stats
        completed = [t for t in run.tasks if t.status == TaskStatus.COMPLETED]
        failed = [t for t in run.tasks if t.status == TaskStatus.FAILED]
        
        # Create extraction
        extraction = self._create_extraction(run, completed, failed)
        self.db.add(extraction)
        
        # Update run status
        run.status = RunStatus.EXTRACTED
        run.extracted_at = datetime.now(timezone.utc)
        
        # Update user stats
        self._update_user_stats(run, len(completed))
        
        await self.db.flush()
        await self.db.refresh(extraction)
        
        return extraction
    
    def _auto_fail_active_tasks(self, run: Run) -> None:
        """Auto-fail any active tasks during extraction."""
        active_tasks = [t for t in run.tasks if t.status == TaskStatus.ACTIVE]
        for task in active_tasks:
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now(timezone.utc)
            
            # T3 penalty: lose 10% of daily XP
            if task.tier == 3:
                penalty = int(run.daily_xp * 0.1)
                run.daily_xp = max(0, run.daily_xp - penalty)
                run.penalty_xp = (run.penalty_xp or 0) + penalty
    
    def _create_extraction(
        self, 
        run: Run, 
        completed: list[Task], 
        failed: list[Task]
    ) -> Extraction:
        """Create extraction record with all stats."""
        total_tasks = len(run.tasks)
        
        # Tier breakdown
        t_completed = {1: 0, 2: 0, 3: 0}
        t_failed = {1: 0, 2: 0, 3: 0}
        for t in completed:
            t_completed[t.tier] = t_completed.get(t.tier, 0) + 1
        for t in failed:
            t_failed[t.tier] = t_failed.get(t.tier, 0) + 1
        
        # Timer discipline
        completed_with_timer = sum(1 for t in completed if t.use_timer)
        completed_without_timer = sum(1 for t in completed if not t.use_timer)
        
        return Extraction(
            user_id=self.user.id,
            run_id=run.id,
            final_xp=run.daily_xp,
            xp_before_penalties=run.daily_xp + (run.penalty_xp or 0),
            penalty_xp=run.penalty_xp or 0,
            tasks_completed=len(completed),
            tasks_failed=len(failed),
            tasks_total=total_tasks,
            total_focus_minutes=run.total_focus_minutes,
            t1_completed=t_completed.get(1, 0),
            t2_completed=t_completed.get(2, 0),
            t3_completed=t_completed.get(3, 0),
            t1_failed=t_failed.get(1, 0),
            t2_failed=t_failed.get(2, 0),
            t3_failed=t_failed.get(3, 0),
            completed_with_timer=completed_with_timer,
            completed_without_timer=completed_without_timer,
        )
    
    def _update_user_stats(self, run: Run, tasks_completed: int) -> None:
        """Update user aggregate stats after extraction."""
        self.user.total_xp += run.daily_xp
        self.user.total_extractions += 1
        self.user.total_tasks_completed += tasks_completed
        self.user.total_focus_minutes += run.total_focus_minutes
        
        # Streak logic
        today = date.today()
        if self.user.last_run_at:
            last_run_date = self.user.last_run_at.date()
            yesterday = today - timedelta(days=1)
            
            if last_run_date >= yesterday:
                # Ran yesterday or today - continue streak
                self.user.current_streak += 1
            else:
                # Missed a day - reset streak
                self.user.current_streak = 1
        else:
            # First run ever
            self.user.current_streak = 1
        
        self.user.best_streak = max(self.user.best_streak, self.user.current_streak)
        self.user.last_run_at = datetime.now(timezone.utc)
    
    def to_response(self, run: Run) -> RunResponse:
        """Convert Run model to response schema."""
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
