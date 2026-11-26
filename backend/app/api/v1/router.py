
from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    dashboard,
    previous_issues,
    my_issues,
    issues,
    dashboard_sse,
    issue_chat_ws,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(previous_issues.router)
api_router.include_router(my_issues.router)
api_router.include_router(issues.router)
api_router.include_router(dashboard_sse.router)
api_router.include_router(issue_chat_ws.router)