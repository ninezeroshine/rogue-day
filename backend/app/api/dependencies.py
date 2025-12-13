"""
FastAPI Dependencies for Rogue-Day API.
Provides secure user authentication via Telegram initData.
"""

from fastapi import Depends, HTTPException, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import User
from app.api.endpoints.auth import validate_telegram_data
from app.config import settings


# Dev mode flag for local development without Telegram (read from settings)
ALLOW_DEV_MODE = settings.allow_dev_mode
DEV_TELEGRAM_ID = settings.dev_telegram_id


async def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    telegram_id: Optional[int] = Query(None, description="Telegram user ID (for dev mode)"),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency: Extract and validate user from Telegram initData.
    
    Security:
        - Validates HMAC signature of initData
        - Checks auth_date expiration (24h)
        - Returns User object from database
    
    Raises:
        HTTPException 401: Invalid or missing auth data
        HTTPException 404: User not found in database
    """
    resolved_telegram_id: int | None = None
    
    # Try Telegram auth first (from header)
    if x_telegram_init_data:
        user_data = validate_telegram_data(x_telegram_init_data)
        if user_data:
            resolved_telegram_id = user_data.get("id")
    
    # Dev mode: check query parameter if no valid Telegram auth
    if resolved_telegram_id is None and ALLOW_DEV_MODE:
        # Prefer explicit query param for testing multiple accounts locally.
        candidate_id = telegram_id if telegram_id is not None else DEV_TELEGRAM_ID
        if candidate_id is None:
            raise HTTPException(
                status_code=500,
                detail="Dev mode enabled but DEV_TELEGRAM_ID is not set"
            )
        # If DEV_TELEGRAM_ID is configured, enforce it (prevents accidental spoofing)
        if DEV_TELEGRAM_ID is not None and candidate_id != DEV_TELEGRAM_ID:
            raise HTTPException(
                status_code=401,
                detail="Invalid dev telegram_id"
            )
        resolved_telegram_id = candidate_id
    
    telegram_id = resolved_telegram_id
    
    # No valid auth
    if telegram_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Telegram authentication"
        )
    
    # Get user from database
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Auto-create dev user in dev mode
        if ALLOW_DEV_MODE and DEV_TELEGRAM_ID is not None and telegram_id == DEV_TELEGRAM_ID:
            user = User(
                telegram_id=telegram_id,
                username="dev_user",
                first_name="Dev User",
            )
            db.add(user)
            await db.flush()
            await db.refresh(user)
        else:
            raise HTTPException(
                status_code=404,
                detail="User not found. Please register first."
            )
    
    return user


async def get_current_user_optional(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    telegram_id: Optional[int] = Query(None, description="Telegram user ID (for dev mode)"),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Optional user dependency - returns None instead of raising 404.
    Useful for endpoints that can work without existing user (e.g., registration).
    """
    resolved_telegram_id: int | None = None
    
    if x_telegram_init_data:
        user_data = validate_telegram_data(x_telegram_init_data)
        if user_data:
            resolved_telegram_id = user_data.get("id")
    
    if resolved_telegram_id is None and ALLOW_DEV_MODE:
        if telegram_id is not None:
            resolved_telegram_id = telegram_id
        else:
            resolved_telegram_id = DEV_TELEGRAM_ID
    
    if resolved_telegram_id is None:
        return None  # Return None instead of raising error for optional auth
    
    telegram_id = resolved_telegram_id
    
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    
    # Auto-create dev user in dev mode if not exists
    if not user and ALLOW_DEV_MODE and telegram_id == DEV_TELEGRAM_ID:
        user = User(
            telegram_id=telegram_id,
            username="dev_user",
            first_name="Dev User",
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    
    return user


def get_telegram_id_from_init_data(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
    telegram_id: Optional[int] = Query(None, description="Telegram user ID (for dev mode)"),
) -> int:
    """
    Extract telegram_id from initData without database lookup.
    Used for user registration where user doesn't exist yet.
    """
    resolved_telegram_id: int | None = None
    
    if x_telegram_init_data:
        user_data = validate_telegram_data(x_telegram_init_data)
        if user_data:
            resolved_telegram_id = user_data.get("id")
    
    if resolved_telegram_id is None and ALLOW_DEV_MODE:
        if telegram_id is not None:
            resolved_telegram_id = telegram_id
        else:
            resolved_telegram_id = DEV_TELEGRAM_ID
    
    if resolved_telegram_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Telegram authentication"
        )
    
    return resolved_telegram_id
