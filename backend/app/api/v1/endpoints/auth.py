from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.enums import AccountStatus
from app.core.security import create_access_token
from app.db.session import get_db
from app.models import User
from app.schemas.auth import CurrentUserResponse, LoginRequest, TokenResponse
from app.schemas.common import APIResponse
from app.schemas.signup import UserSignup, UserSignupResponse
from app.services.auth_service import authenticate_user
from app.services.signup_service import signup_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=APIResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    payload: UserSignup,
    db: Session = Depends(get_db),
):
    new_user = signup_user(db, payload)

    return {
        "success": True,
        "message": "Account created successfully",
        "data": UserSignupResponse.model_validate(new_user),
    }


def _role_name(user: User) -> str:
    raw = str(getattr(user.role, "value", user.role)).lower()  # adjust if your column is named differently
    return "Developer" if "dev" in raw else "Support"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.email, payload.password)

    if user.account_status != AccountStatus.ACTIVE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is not active")

    actual_role = _role_name(user)
    if payload.role and payload.role != actual_role:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"This account is registered as {actual_role}. Please select the {actual_role} role to log in.",
        )

    token = create_access_token(subject=str(user.user_id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user