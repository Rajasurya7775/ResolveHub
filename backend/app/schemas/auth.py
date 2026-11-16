from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Literal
from pydantic import BaseModel, EmailStr,field_validator



class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    portal: Literal["support", "developer"]

    @field_validator("portal", mode="before")
    @classmethod
    def normalize_portal(cls, value):
        if isinstance(value, str):
            return value.strip().lower()
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