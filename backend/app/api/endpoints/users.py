from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import User
from app.schemas import UserResponse, UserUpdate, UserStats
from app.api.dependencies import get_current_user, get_current_user_optional, get_telegram_id_from_init_data
from app.api.endpoints.auth import validate_telegram_data

router = APIRouter()


def _build_user_response(user: User) -> UserResponse:
    """Helper to build UserResponse from User model."""
    return UserResponse(
        id=user.id,
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name,
        stats=UserStats(
            total_xp=user.total_xp,
            total_extractions=user.total_extractions,
            total_tasks_completed=user.total_tasks_completed,
            total_focus_minutes=user.total_focus_minutes,
            current_streak=user.current_streak,
            best_streak=user.best_streak,
        ),
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
):
    """Get current user by Telegram ID."""
    return _build_user_response(user)


@router.post("/", response_model=UserResponse)
async def create_or_get_user(
    telegram_id: int = Depends(get_telegram_id_from_init_data),
    username: Optional[str] = None,
    first_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Create user if not exists, or return existing."""
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    
    return _build_user_response(user)


@router.patch("/me", response_model=UserResponse)
async def update_user_settings(
    settings_update: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user settings."""
    # Update fields
    update_data = settings_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.flush()
    await db.refresh(user)
    
    return _build_user_response(user)
