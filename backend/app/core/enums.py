
from enum import StrEnum


class IssueType(StrEnum):
    FRONTEND = "FRONTEND"
    BACKEND = "BACKEND"
    DATABASE = "DATABASE"


class IssuePriority(StrEnum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"


class IssueStatus(StrEnum):
    OPEN = "Open"
    IN_PROGRESS = "In progress"
    RESOLVED = "Resolved"
    HOLD = "Hold"


class Role(StrEnum):
    SUPPORTER = "SUPPORTER"
    DEVELOPER = "DEVELOPER"
    ADMIN = "ADMIN"


class AccountStatus(StrEnum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class Shift(StrEnum):
    A = "A"
    B = "B"
    C = "C"
