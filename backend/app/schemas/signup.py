
import re
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


class UserSignup(BaseModel):
    employee_id: str = Field(min_length=1, max_length=20)
    full_name: str = Field(min_length=3, max_length=100)
    email: EmailStr
    phone_number: str
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str
    role: Literal["Supporter", "Developer"]
    role_type: str = Field(min_length=1, max_length=100)

    @field_validator("employee_id", "full_name", "role_type")
    @classmethod
    def remove_extra_spaces(cls, value: str) -> str:
        return value.strip()

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not any(char.isalpha() for char in value):
            raise ValueError("Full name must contain letters")

        if any(char.isdigit() for char in value):
            raise ValueError("Full name cannot contain numbers")

        if not all(
            char.isalpha() or char.isspace() or char in ".-'"
            for char in value
        ):
            raise ValueError("Full name contains invalid characters")

        return value

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        value = value.strip()

        if not re.fullmatch(r"[6-9][0-9]{9}", value):
            raise ValueError(
                "Enter a valid 10-digit Indian mobile number"
            )

        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must contain an uppercase letter")

        if not re.search(r"[a-z]", value):
            raise ValueError("Password must contain a lowercase letter")

        if not re.search(r"[0-9]", value):
            raise ValueError("Password must contain a number")

        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("Password must contain a special character")

        return value

    @model_validator(mode="after")
    def validate_confirm_password(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")

        return self


class UserSignupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    employee_id: str
    full_name: str
    email: EmailStr
    phone_number: str
    role: str
    role_type: str
    account_status: str
