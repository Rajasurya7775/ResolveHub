
from app.schemas.signup import UserSignup, UserSignupResponse
from app.services.signup_service import signup_user

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.enums import AccountStatus
from app.core.security import create_access_token
from app.db.session import get_db
from app.models import User
from app.schemas.auth import CurrentUserResponse, LoginRequest, TokenResponse
from app.services.auth_service import authenticate_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=UserSignupResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    new_user = signup_user(db, payload)
    return new_user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):

    # Verify email and password
    user = authenticate_user(db, payload.email, payload.password)

    # Verify account status
    if user.account_status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=403,
            detail="Account is not active"
        )

    # Expected role based on selected portal
    expected_roles = {
        "support": "SUPPORTER",
        "developer": "DEVELOPER"
    }

    expected_role = expected_roles[payload.portal]

    # Verify database role
    if user.role.strip().upper() != expected_role:
        raise HTTPException(
            status_code=403,
            detail=f"You are not authorized to access the {payload.portal} portal"
        )

    # Generate token
    token = create_access_token(subject=str(user.user_id))

    return TokenResponse(access_token=token)

@router.get("/me", response_model=CurrentUserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
