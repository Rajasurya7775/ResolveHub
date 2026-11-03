from fastapi import FastAPI

from app.api.v1.router import api_router

app = FastAPI(
    title="ResolveHub",
    description="Supporter-only Issue Management System API",
    version="1.0.0",
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "message": "ResolveHub API is running",
    }