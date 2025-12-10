from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🚀 Starting Rogue-Day Backend...")
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
