
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    dashboard,
    previous_issues,
    my_issues,
    issues,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(previous_issues.router)
api_router.include_router(my_issues.router)
api_router.include_router(issues.router)
