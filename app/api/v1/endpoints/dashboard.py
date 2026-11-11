from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.enums import Role
from app.api.deps import require_roles
from app.db.session import get_db
from app.models import User
from app.schemas.dashboard import CurrentShiftResponse, DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(Role.SUPPORTER)),
):
    return dashboard_service.get_summary(db, current_user)


@router.get("/current-shift", response_model=CurrentShiftResponse)
def current_shift(
    current_user: User = Depends(require_roles(Role.SUPPORTER)),
):
    return dashboard_service.get_current_shift()