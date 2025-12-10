from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import hashlib
import hmac
import json
from urllib.parse import parse_qs

from app.config import settings
from app.schemas import TelegramAuthData

router = APIRouter()


def validate_telegram_data(init_data: str) -> Optional[dict]:
    """
    Validate Telegram WebApp initData.
    Returns user data if valid, None otherwise.
    """
    try:
        parsed = parse_qs(init_data)
        
        # Extract hash
        received_hash = parsed.get('hash', [None])[0]
        if not received_hash:
            return None
        
        # Build data check string
        data_check_arr = []
        for key, value in sorted(parsed.items()):
            if key != 'hash':
                data_check_arr.append(f"{key}={value[0]}")
        data_check_string = '\n'.join(data_check_arr)
        
        # Calculate secret key
        secret_key = hmac.new(
            b"WebAppData",
            settings.telegram_bot_token.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Validate
        if calculated_hash != received_hash:
            return None
        
        # Parse user data
        user_data = parsed.get('user', [None])[0]
        if user_data:
            return json.loads(user_data)
        
        return None
        
    except Exception as e:
        print(f"Auth validation error: {e}")
        return None


@router.post("/validate")
async def validate_auth(
    x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data")
):
    """
    Validate Telegram WebApp initData and return user info.
    
    Frontend should send initData in X-Telegram-Init-Data header.
    """
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Missing init data")
    
    user_data = validate_telegram_data(x_telegram_init_data)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid init data")
    
    return {
        "valid": True,
        "user": {
            "telegram_id": user_data.get("id"),
            "first_name": user_data.get("first_name"),
            "last_name": user_data.get("last_name"),
            "username": user_data.get("username"),
        }
    }
