from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.models import User


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.execute(
        select(User).where(User.email == email.lower())
    ).scalar_one_or_none()

    # same message for unknown email and wrong password
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    return user