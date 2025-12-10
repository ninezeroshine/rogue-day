from fastapi import APIRouter

from app.api.endpoints import auth, users, runs, tasks, avatar

api_router = APIRouter()

# Include all endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(runs.router, prefix="/runs", tags=["runs"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(avatar.router, prefix="/avatar", tags=["avatar"])

