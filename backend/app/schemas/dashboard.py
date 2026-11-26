
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_logged_issues: int
    active_issues: int
    resolved_issues: int
    in_progress_issues: int
    open_issues: int


class CurrentShiftResponse(BaseModel):
    shift: str
    shift_date: str
    starts_at: str
    ends_at: str
