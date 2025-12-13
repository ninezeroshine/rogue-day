from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.router import api_router
from app.database import engine, Base
from app.models import (
    User, Run, Task, Extraction,
    TaskTemplate, Preset, PresetTemplate  # Import all models to register them
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Starting Rogue-Day Backend...")
    
    # Create database tables (fallback if migrations didn't run)
    # Note: Railway runs `alembic upgrade head` before starting, so this is a safety net
    try:
        async with engine.begin() as conn:
            from sqlalchemy import text
            # Check if SQLite or PostgreSQL
            is_sqlite = settings.database_url.startswith("sqlite")
            
            if is_sqlite:
                # SQLite: use sqlite_master instead of information_schema
                result = await conn.execute(text("""
                    SELECT name 
                    FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                """))
                existing_tables = {row[0] for row in result}
            else:
                # PostgreSQL: use information_schema
                result = await conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """))
                existing_tables = {row[0] for row in result}
            
            expected_tables = {"users", "runs", "tasks", "extractions", "task_templates", "presets", "preset_templates"}
            missing_tables = expected_tables - existing_tables
            
            if missing_tables:
                print(f"⚠️  Missing tables detected: {sorted(missing_tables)}")
                print("🔄 Creating missing tables via Base.metadata.create_all...")
                await conn.run_sync(Base.metadata.create_all)
                print("✅ Missing tables created")
            else:
                print(f"✅ All tables exist ({len(existing_tables)} tables found)")
    except Exception as e:
        print(f"⚠️  Error checking/creating tables: {e}")
        print("   This is OK if migrations handle table creation.")
        # Try to create tables anyway as fallback
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                print("✅ Tables created via fallback method")
        except Exception as e2:
            print(f"⚠️  Fallback table creation also failed: {e2}")
    
    yield
    # Shutdown
    print("👋 Shutting down Rogue-Day Backend...")


app = FastAPI(
    title="Rogue-Day API",
    description="Backend for Rogue-Day Telegram Mini App",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate limiter - use user ID from Telegram initData if available, otherwise IP
def get_rate_limit_key(request: Request) -> str:
    """Get rate limit key from Telegram user ID or IP address."""
    # Try to get Telegram user ID from initData header
    init_data = request.headers.get("X-Telegram-Init-Data")
    if init_data:
        # Parse user ID from initData (simplified - full validation happens in dependencies)
        try:
            from urllib.parse import parse_qs
            parsed = parse_qs(init_data)
            user_data = parsed.get('user', [None])[0]
            if user_data:
                import json
                user = json.loads(user_data)
                user_id = user.get('id')
                if user_id:
                    return f"user:{user_id}"
        except Exception:
            pass
    
    # Fallback to IP address
    return get_remote_address(request)

# Initialize rate limiter
# Use Redis if available, otherwise in-memory storage
storage_uri = settings.redis_url if settings.redis_url.startswith("redis") else "memory://"
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["1000/hour", "200/minute"],  # Generous limits for normal usage
    storage_uri=storage_uri,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": "Rogue-Day Backend",
        "version": "0.1.0",
    }


@app.get("/health")
async def health():
    """Health check for Railway/monitoring."""
    return {"status": "healthy"}
