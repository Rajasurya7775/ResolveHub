
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.core.enums import AccountStatus
from app.models import User
from app.schemas.signup import UserSignup


def signup_user(db: Session, user_data: UserSignup) -> User:

    email = str(user_data.email).lower()

    existing_employee = db.scalar(
        select(User).where(
            User.employee_id == user_data.employee_id
        )
    )

    if existing_employee:
        raise HTTPException(
            status_code=409,
            detail="Employee ID already exists"
        )

    existing_email = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_email:
        raise HTTPException(
            status_code=409,
            detail="Email already exists"
        )

    existing_phone = db.scalar(
        select(User).where(
            User.phone_number == user_data.phone_number
        )
    )

    if existing_phone:
        raise HTTPException(
            status_code=409,
            detail="Phone number already exists"
        )

    new_user = User(
        employee_id=user_data.employee_id,
        full_name=user_data.full_name,
        email=email,
        phone_number=user_data.phone_number,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        role_type=user_data.role_type,
        account_status=AccountStatus.ACTIVE.value,
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Employee ID, email or phone number already exists"
        )

    except Exception:
        db.rollback()
        raise

    return new_user
