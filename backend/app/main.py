from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

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
            # Check existing tables using SQL query
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
