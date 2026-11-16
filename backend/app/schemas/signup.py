
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserSignup(BaseModel):
    employee_id: str = Field(min_length=1, max_length=20)
    full_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone_number: str = Field(min_length=10, max_length=20)
    password: str = Field(min_length=8)
    role: Literal["Support", "Developer"]
    role_type: str


class UserSignupResponse(BaseModel):
    user_id: int
    employee_id: str
    full_name: str
    email: EmailStr
    phone_number: str 
    role: str
    role_type: str
    account_status: str

    model_config = {"from_attributes": True}
