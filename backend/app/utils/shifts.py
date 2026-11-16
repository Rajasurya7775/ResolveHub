import os
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

APP_TZ = ZoneInfo(os.getenv("APP_TIMEZONE", "Asia/Kolkata"))

SHIFT_WINDOWS = {
    "A": ("06:15", "14:15"),
    "B": ("14:15", "22:15"),
    "C": ("22:15", "06:15"),
}


def get_shift(moment: datetime | None = None) -> tuple[str, date]:
    """Return (shift, shift_date). Shift C after midnight belongs to the previous day."""
    now = (moment or datetime.now(APP_TZ)).astimezone(APP_TZ)
    t = now.time()
    if time(6, 15) <= t < time(14, 15):
        return "A", now.date()
    if time(14, 15) <= t < time(22, 15):
        return "B", now.date()
    if t >= time(22, 15):
        return "C", now.date()
    return "C", now.date() - timedelta(days=1)


def previous_shift(shift: str, shift_date: date) -> tuple[str, date]:
    return {
        "A": ("C", shift_date - timedelta(days=1)),
        "B": ("A", shift_date),
        "C": ("B", shift_date),
    }[shift]