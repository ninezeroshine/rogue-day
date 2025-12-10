from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ===== ENUMS =====

class TaskStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class RunStatus(str, Enum):
    ACTIVE = "active"
    EXTRACTED = "extracted"
    ABANDONED = "abandoned"


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
    tasks_completed: int
    tasks_failed: int
    total_focus_minutes: int
    created_at: datetime
    
    class Config:
        from_attributes = True


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
