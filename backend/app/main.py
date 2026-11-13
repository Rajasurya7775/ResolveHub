
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router


# 1. Create FastAPI application
app = FastAPI(
    title="ResolveHub",
    description="Supporter-only Issue Management System API",
    version="1.0.0",
)


# 2. Global HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException
):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": str(exc.detail),
            "data": None
        },
        headers=exc.headers
    )


# 3. Request validation exception handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    errors = exc.errors()

    message = errors[0]["msg"] if errors else "Invalid request"

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": message,
            "data": None
        }
    )


# 4. Configure CORS
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


# 5. Register API routes
app.include_router(api_router, prefix="/api/v1")


# 6. Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "message": "ResolveHub API is running",
    }
