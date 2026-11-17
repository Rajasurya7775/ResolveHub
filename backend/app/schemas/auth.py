
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from typing import Literal


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Literal["Support", "developer"]

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, value):
        if isinstance(value, str):
            value = value.strip()

            if value.lower() == "support":
                return "Support"

            if value.lower() == "developer":
                return "developer"

        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    employee_id: str
    full_name: str
    email: EmailStr
    role: str
    account_status: str
