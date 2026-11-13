
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[Literal["Support", "Developer"]] = None


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    employee_id: str
    full_name: str
    email: EmailStr
    role: str
    account_status: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
