from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_issues: int
    in_progress: int
    resolved: int
    hold: int
    p1_open: int
    my_issues: int
    created_this_shift: int
    current_shift: str


class CurrentShiftResponse(BaseModel):
    shift: str
    shift_date: str
    starts_at: str
    ends_at: str