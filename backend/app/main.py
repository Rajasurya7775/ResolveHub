
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router

# 1. Create FastAPI application
app = FastAPI(
    title="ResolveHub",
    description="Supporter-only Issue Management System API",
    version="1.0.0",
)

# 2. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Register API routes
app.include_router(api_router, prefix="/api/v1")


# 4. Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "message": "ResolveHub API is running",
    }
