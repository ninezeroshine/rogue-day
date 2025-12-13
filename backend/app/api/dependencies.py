"""
FastAPI Dependencies for Rogue-Day API.
Provides secure user authentication via Telegram initData.
"""

import os
from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import User
from app.api.endpoints.auth import validate_telegram_data


# Dev mode flag for local development without Telegram
ALLOW_DEV_MODE = os.getenv("ALLOW_DEV_MODE", "false").lower() == "true"
DEV_TELEGRAM_ID = int(os.getenv("DEV_TELEGRAM_ID", "123456789"))


async def get_current_user(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data"),
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
    telegram_id: int | None = None
    
    # Try Telegram auth first
    if x_telegram_init_data:
        user_data = validate_telegram_data(x_telegram_init_data)
        if user_data:
            telegram_id = user_data.get("id")
    
    # Dev mode fallback (only when explicitly enabled)
    if telegram_id is None and ALLOW_DEV_MODE:
        telegram_id = DEV_TELEGRAM_ID
    
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
        if ALLOW_DEV_MODE and telegram_id == DEV_TELEGRAM_ID:
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
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Optional user dependency - returns None instead of raising 404.
    Useful for endpoints that can work without existing user (e.g., registration).
    """
    telegram_id: int | None = None
    
    if x_telegram_init_data:
        user_data = validate_telegram_data(x_telegram_init_data)
        if user_data:
            telegram_id = user_data.get("id")
    
    if telegram_id is None and ALLOW_DEV_MODE:
        telegram_id = DEV_TELEGRAM_ID
    
    if telegram_id is None:
        return None  # Return None instead of raising error for optional auth
    
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
) -> int:
    """
    Extract telegram_id from initData without database lookup.
    Used for user registration where user doesn't exist yet.
    """
    telegram_id: int | None = None
    
    if x_telegram_init_data:
        user_data = validate_telegram_data(x_telegram_init_data)
        if user_data:
            telegram_id = user_data.get("id")
    
    if telegram_id is None and ALLOW_DEV_MODE:
        telegram_id = DEV_TELEGRAM_ID
    
    if telegram_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Telegram authentication"
        )
    
    return telegram_id
