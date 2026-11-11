
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.core.enums import Role, AccountStatus
from app.models import User
from app.schemas.signup import UserSignup


def signup_user(db: Session, user_data: UserSignup) -> User:

    # 1. Check existing employee ID
    existing_employee = db.scalar(
        select(User).where(
            User.employee_id == user_data.employee_id
        )
    )

    if existing_employee:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Employee ID already exists"
        )

    # 2. Check existing email
    email = user_data.email.lower()

    existing_email = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )

    # 3. Check existing phone number
    existing_phone = db.scalar(
        select(User).where(
            User.phone_number == user_data.phone_number
        )
    )

    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already exists"
        )

    # 4. Hash password
    hashed_password = hash_password(user_data.password)

    # 5. Create new user
    new_user = User(
        employee_id=user_data.employee_id,
        full_name=user_data.full_name,
        email=email,
        phone_number=user_data.phone_number,
        password_hash=hashed_password,
        role=user_data.role,
        role_type=user_data.role_type,
        account_status=AccountStatus.ACTIVE.value,
    )

    # 6. Save user in database
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

    except Exception:
        db.rollback()
        raise

    return new_user
