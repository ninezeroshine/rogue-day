from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Import enums from models to avoid duplication
from app.models import TaskStatus, RunStatus


# ===== USER SCHEMAS =====

class UserBase(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    notifications_enabled: Optional[bool] = None
    sounds_enabled: Optional[bool] = None
    haptics_enabled: Optional[bool] = None


class UserStats(BaseModel):
    total_xp: int
    total_extractions: int
    total_tasks_completed: int
    total_focus_minutes: int
    current_streak: int
    best_streak: int


class UserResponse(UserBase):
    id: int
    stats: UserStats
    created_at: datetime
    
    class Config:
        from_attributes = True


# ===== TASK SCHEMAS =====

class TaskBase(BaseModel):
    title: str
    tier: int
    duration: int
    use_timer: bool = False


class TaskCreate(TaskBase):
    pass


class TaskResponse(TaskBase):
    id: int
    run_id: int
    status: TaskStatus
    xp_earned: int
    energy_cost: int
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ===== RUN SCHEMAS =====

class RunBase(BaseModel):
    run_date: str


class RunCreate(RunBase):
    pass


class RunResponse(RunBase):
    id: int
    user_id: int
    daily_xp: int
    focus_energy: int
    max_energy: int
    total_focus_minutes: int
    status: RunStatus
    tasks: List[TaskResponse] = []
    started_at: datetime
    extracted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ===== EXTRACTION SCHEMAS =====

class ExtractionCreate(BaseModel):
    run_id: int


class ExtractionResponse(BaseModel):
    id: int
    run_id: int
    final_xp: int
    xp_before_penalties: int = 0
    penalty_xp: int = 0
    tasks_completed: int
    tasks_failed: int
    tasks_total: int = 0
    total_focus_minutes: int
    t1_completed: int = 0
    t2_completed: int = 0
    t3_completed: int = 0
    t1_failed: int = 0
    t2_failed: int = 0
    t3_failed: int = 0
    completed_with_timer: int = 0
    completed_without_timer: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True


class JournalEntryResponse(BaseModel):
    """Richer journal entry for a completed (extracted) run."""
    extraction: ExtractionResponse
    run_date: str
    started_at: datetime
    extracted_at: Optional[datetime] = None


# ===== TASK TEMPLATE SCHEMAS =====

class TaskTemplateBase(BaseModel):
    title: str
    tier: int
    duration: int
    use_timer: bool = False
    category: Optional[str] = None


class TaskTemplateCreate(TaskTemplateBase):
    """Create template manually."""
    source: str = "manual"


class TaskTemplateFromTask(BaseModel):
    """Create template from existing task."""
    task_id: int
    category: Optional[str] = None


class TaskTemplateResponse(TaskTemplateBase):
    id: int
    source: str
    times_used: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# ===== PRESET SCHEMAS =====

class PresetBase(BaseModel):
    name: str
    emoji: Optional[str] = None
    is_favorite: bool = False


class PresetCreate(PresetBase):
    """Create preset with optional initial templates."""
    template_ids: List[int] = []


class PresetUpdate(BaseModel):
    """Update preset (name, emoji, templates)."""
    name: Optional[str] = None
    emoji: Optional[str] = None
    is_favorite: Optional[bool] = None
    template_ids: Optional[List[int]] = None


class PresetResponse(PresetBase):
    id: int
    templates: List[TaskTemplateResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


class PresetApplyResponse(BaseModel):
    """Response when applying a preset."""
    tasks_created: int
    tasks_skipped: int  # Due to energy shortage
    total_energy_cost: int
    message: str


# ===== TELEGRAM AUTH =====

class TelegramAuthData(BaseModel):
    """Data from Telegram WebApp initData."""
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str
