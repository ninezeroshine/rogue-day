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
    
    # Database (Railway provides postgresql://, we need postgresql+asyncpg://)
    database_url: str = "postgresql://user:password@localhost:5432/rogue_day"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Telegram
    telegram_bot_token: str = ""
    webapp_url: str = "https://rogue-day.vercel.app"
    
    # Security
    secret_key: str = "change-me-in-production"
    
    # CORS
    cors_origins: str = '["https://rogue-day.vercel.app","http://127.0.0.1:5173","http://localhost:5173","http://127.0.0.1:5174","http://localhost:5174","http://127.0.0.1:5175","http://localhost:5175"]'
    
    @property
    def async_database_url(self) -> str:
        """Convert standard postgresql:// URL to asyncpg format."""
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    
    @property
    def sync_database_url(self) -> str:
        """Return sync database URL for Alembic migrations."""
        url = self.database_url
        # Remove async driver if present
        if "asyncpg" in url:
            return url.replace("postgresql+asyncpg://", "postgresql://", 1)
        return url
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string."""
        try:
            return json.loads(self.cors_origins)
        except json.JSONDecodeError:
            return ["https://rogue-day.vercel.app"]


settings = Settings()

