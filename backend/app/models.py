from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class RunStatus(str, enum.Enum):
    ACTIVE = "active"
    EXTRACTED = "extracted"
    ABANDONED = "abandoned"


class User(Base):
    """User model - linked to Telegram account."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String(100), nullable=True)
    first_name = Column(String(100), nullable=True)
    
    # Aggregate stats
    total_xp = Column(Integer, default=0)
    total_extractions = Column(Integer, default=0)
    total_tasks_completed = Column(Integer, default=0)
    total_focus_minutes = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    
    # Settings
    notifications_enabled = Column(Boolean, default=True)
    sounds_enabled = Column(Boolean, default=True)
    haptics_enabled = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    runs = relationship("Run", back_populates="user", cascade="all, delete-orphan")


class Run(Base):
    """Daily run (game session)."""
    __tablename__ = "runs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Run data
    run_date = Column(String(10), nullable=False)  # "2024-01-15"
    daily_xp = Column(Integer, default=0)
    focus_energy = Column(Integer, default=50)
    max_energy = Column(Integer, default=50)
    total_focus_minutes = Column(Integer, default=0)
    status = Column(SQLEnum(RunStatus), default=RunStatus.ACTIVE)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    extracted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="runs")
    tasks = relationship("Task", back_populates="run", cascade="all, delete-orphan")


class Task(Base):
    """Task within a run."""
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    
    # Task data
    title = Column(String(255), nullable=False)
    tier = Column(Integer, nullable=False)  # 1, 2, 3
    duration = Column(Integer, nullable=False)  # minutes
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING)
    xp_earned = Column(Integer, default=0)
    energy_cost = Column(Integer, default=0)
    use_timer = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    run = relationship("Run", back_populates="tasks")


class Extraction(Base):
    """Extraction record (after-action report)."""
    __tablename__ = "extractions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    run_id = Column(Integer, ForeignKey("runs.id", ondelete="CASCADE"), nullable=False)
    
    # Extraction stats
    final_xp = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    tasks_failed = Column(Integer, default=0)
    total_focus_minutes = Column(Integer, default=0)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
