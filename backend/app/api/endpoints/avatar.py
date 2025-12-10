from fastapi import APIRouter, HTTPException
from telegram import Bot
from app.config import settings
import asyncio

router = APIRouter()

# Initialize bot (lazy)
_bot: Bot | None = None

def get_bot() -> Bot:
    global _bot
    if _bot is None:
        _bot = Bot(token=settings.telegram_bot_token)
    return _bot


@router.get("/avatar/{telegram_id}")
async def get_user_avatar(telegram_id: int):
    """
    Get user's profile photo URL via Telegram Bot API.
    Returns the smallest available photo (for faster loading).
    """
    try:
        bot = get_bot()
        
        # Get user profile photos
        photos = await bot.get_user_profile_photos(user_id=telegram_id, limit=1)
        
        if not photos.photos or len(photos.photos) == 0:
            return {"photo_url": None, "message": "No profile photo"}
        
        # Get the smallest photo (first in the array)
        # photos.photos[0] is a list of PhotoSize objects for the first photo
        smallest_photo = photos.photos[0][0]  # First photo, smallest size
        
        # Get file path
        file = await bot.get_file(smallest_photo.file_id)
        
        # Construct download URL
        photo_url = f"https://api.telegram.org/file/bot{settings.telegram_bot_token}/{file.file_path}"
        
        return {
            "photo_url": photo_url,
            "width": smallest_photo.width,
            "height": smallest_photo.height,
        }
        
    except Exception as e:
        print(f"Error getting avatar: {e}")
        return {"photo_url": None, "error": str(e)}
