from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),  # backend/.env
        # Windows PowerShell `Out-File -Encoding utf8` writes UTF-8 with BOM by default.
        # `utf-8-sig` safely strips BOM so first key (e.g. ALLOW_DEV_MODE) is not broken.
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )
    
    # Database (Railway provides postgresql://, we need postgresql+asyncpg://)
    # For local dev, can use SQLite: sqlite+aiosqlite:///./rogue_day.db
    database_url: str = "postgresql://user:password@localhost:5432/rogue_day"
    
    # Redis - used for rate limiting storage (slowapi)
    # Falls back to in-memory storage if Redis is not available
    redis_url: str = "redis://localhost:6379/0"
    
    # Telegram
    telegram_bot_token: str = ""
    webapp_url: str = "https://rogue-day.vercel.app"
    
    # Security
    secret_key: str = "change-me-in-production"
    
    # CORS
    cors_origins: str = '["https://rogue-day.vercel.app","http://127.0.0.1:5173","http://localhost:5173","http://127.0.0.1:5174","http://localhost:5174","http://127.0.0.1:5175","http://localhost:5175"]'
    
    # Dev mode settings
    allow_dev_mode: bool = False
    # Set explicitly in backend/.env for local dev; keep unset in production.
    dev_telegram_id: int | None = None
    
    @property
    def async_database_url(self) -> str:
        """Convert standard postgresql:// URL to asyncpg format, or handle SQLite."""
        url = self.database_url
        if url.startswith("sqlite"):
            # SQLite for local dev (requires aiosqlite)
            if not url.startswith("sqlite+aiosqlite"):
                url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
            return url
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

