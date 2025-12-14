"""
Task Service - Business logic for task operations.
Extracted from endpoints for better testability and reusability.
"""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Task, Run, User, TaskStatus, RunStatus
from app.schemas import TaskResponse, TaskCreate
from app.core.game_config import TIER_CONFIG, calculate_xp


class TaskService:
    """Service for managing tasks within runs."""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
    
    async def create(self, task_data: TaskCreate) -> Task:
        """
        Create a new task in user's current active run.
        
        Raises:
            ValueError: If no active run, invalid tier, or not enough energy
        """
        # Get active run
        run = await self._get_active_run()
        if not run:
            raise ValueError("No active run")
        
        # Get tier config
        config = TIER_CONFIG.get(task_data.tier)
        if not config:
            raise ValueError("Invalid tier")
        
        # Check energy
        if run.focus_energy < config["energy_cost"]:
            raise ValueError("Not enough energy")
        
        # Calculate XP using centralized function
        xp_earned = calculate_xp(task_data.tier, task_data.duration, task_data.use_timer)
        
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
        self.db.add(task)
        await self.db.flush()
        await self.db.refresh(task)
        
        return task
    
    async def start(self, task_id: int) -> Task:
        """
        Start a pending task.
        
        Raises:
            ValueError: If task not found or already started
        """
        task = await self._get_user_task(task_id)
        
        if task.status != TaskStatus.PENDING:
            raise ValueError("Task already started")
        
        task.status = TaskStatus.ACTIVE
        task.started_at = datetime.now(timezone.utc)
        
        await self.db.flush()
        await self.db.refresh(task)
        
        return task
    
    async def complete(self, task_id: int) -> Task:
        """
        Complete a task.
        
        Updates run stats: adds XP, returns energy, adds focus minutes.
        
        Raises:
            ValueError: If task not found, already finished, or run not active
        """
        task = await self._get_user_task(task_id)
        
        if task.status not in [TaskStatus.PENDING, TaskStatus.ACTIVE]:
            raise ValueError("Task already finished")
        
        # Get run
        run = await self._get_run_by_id(task.run_id)
        if run.status != RunStatus.ACTIVE:
            raise ValueError("Run is not active")
        
        # Add XP
        run.daily_xp += task.xp_earned
        
        # Return energy
        run.focus_energy = min(run.max_energy, run.focus_energy + task.energy_cost)
        
        # Add focus minutes
        run.total_focus_minutes += task.duration
        
        # Update task
        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.now(timezone.utc)
        
        await self.db.flush()
        await self.db.refresh(task)
        
        return task
    
    async def fail(self, task_id: int) -> Task:
        """
        Fail a task.
        
        Applies T3 penalty (10% XP loss) if applicable.
        
        Raises:
            ValueError: If task cannot fail or not active
        """
        task = await self._get_user_task(task_id)
        
        config = TIER_CONFIG.get(task.tier)
        if not config or not config["can_fail"]:
            raise ValueError("This task cannot fail")
        
        if task.status != TaskStatus.ACTIVE:
            raise ValueError("Task not active")
        
        # Get run for XP penalty
        run = await self._get_run_by_id(task.run_id)
        
        # Apply penalty
        if task.tier == 3:
            # T3: lose 10% of daily XP
            penalty = int(run.daily_xp * 0.1)
            run.daily_xp = max(0, run.daily_xp - penalty)
            run.penalty_xp = (run.penalty_xp or 0) + penalty
        # T2: energy already spent, just not returned
        
        # Update task
        task.status = TaskStatus.FAILED
        task.completed_at = datetime.now(timezone.utc)
        
        await self.db.flush()
        await self.db.refresh(task)
        
        return task
    
    async def delete(self, task_id: int) -> None:
        """
        Delete a pending task.
        
        Returns energy to the run.
        
        Raises:
            ValueError: If task not found or not pending
        """
        task = await self._get_user_task(task_id)
        
        if task.status != TaskStatus.PENDING:
            raise ValueError("Can only delete pending tasks")
        
        # Return energy
        run = await self._get_run_by_id(task.run_id)
        run.focus_energy = min(run.max_energy, run.focus_energy + task.energy_cost)
        
        await self.db.delete(task)
        await self.db.flush()
    
    async def _get_active_run(self) -> Run | None:
        """Get user's current active run."""
        result = await self.db.execute(
            select(Run).where(Run.user_id == self.user.id, Run.status == RunStatus.ACTIVE)
        )
        return result.scalar_one_or_none()
    
    async def _get_run_by_id(self, run_id: int) -> Run:
        """Get run by ID."""
        result = await self.db.execute(select(Run).where(Run.id == run_id))
        return result.scalar_one()
    
    async def _get_user_task(self, task_id: int) -> Task:
        """Get task and verify user ownership."""
        result = await self.db.execute(
            select(Task).join(Run).where(Task.id == task_id, Run.user_id == self.user.id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        return task
