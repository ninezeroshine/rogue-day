from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/rogue_day"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Telegram
    telegram_bot_token: str = ""
    webapp_url: str = "https://rogue-day.vercel.app"
    
    # Security
    secret_key: str = "change-me-in-production"
    
    # CORS
    cors_origins: str = '["https://rogue-day.vercel.app","http://127.0.0.1:5173"]'
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string."""
        try:
            return json.loads(self.cors_origins)
        except json.JSONDecodeError:
            return ["https://rogue-day.vercel.app"]


settings = Settings()
