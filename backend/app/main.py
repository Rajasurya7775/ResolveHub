import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from app.api.v1.router import api_router
from app.api.v1.endpoints.issue_chat_ws import issue_chat_websocket
from app.core.config import get_redis_url
from app.services.issue_attachment_service import run_attachment_cleanup


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with Redis.from_url(
        get_redis_url(), socket_connect_timeout=2, socket_timeout=3
    ) as redis:
        app.state.dashboard_redis = redis
        cleanup_task = asyncio.create_task(run_attachment_cleanup())
        try:
            yield
        finally:
            cleanup_task.cancel()
            with suppress(asyncio.CancelledError):
                await cleanup_task


# 1. Create FastAPI application
app = FastAPI(
    title="ResolveHub",
    description="Supporter-only Issue Management System API",
    version="1.0.0",
    lifespan=lifespan,
)

# 2. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://10.91.17.23:3000/",
        "http://10.91.17.113:8003",
        "http://10.91.17.113:8003",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://10.91.16.124:3004"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Register API routes
app.include_router(api_router, prefix="/api/v1")
app.add_api_websocket_route(
    "/ws/issues/{issue_id}/messages",
    issue_chat_websocket,
    name="legacy_issue_chat",
)

# 4. Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "message": "ResolveHub API is running",
    }
