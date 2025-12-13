"""
Script to create a dev user for local development.
Run this once before starting local development.
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import async_session_maker
from app.models import User


async def create_dev_user():
    """Create dev user if it doesn't exist."""
    DEV_TELEGRAM_ID = int(os.getenv("DEV_TELEGRAM_ID", "123456789"))
    
    async with async_session_maker() as db:
        try:
            # Check if user exists
            result = await db.execute(
                select(User).where(User.telegram_id == DEV_TELEGRAM_ID)
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"✅ Dev user already exists: {existing_user.first_name} (ID: {existing_user.id})")
                return
            
            # Create dev user
            dev_user = User(
                telegram_id=DEV_TELEGRAM_ID,
                username="dev_user",
                first_name="Dev User",
            )
            db.add(dev_user)
            await db.commit()
            await db.refresh(dev_user)
            
            print(f"✅ Dev user created successfully!")
            print(f"   Telegram ID: {dev_user.telegram_id}")
            print(f"   Username: {dev_user.username}")
            print(f"   Name: {dev_user.first_name}")
            print(f"   Database ID: {dev_user.id}")
        except Exception as e:
            print(f"❌ Error creating dev user: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    print("🔧 Creating dev user for local development...")
    asyncio.run(create_dev_user())

