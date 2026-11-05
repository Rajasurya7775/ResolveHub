
from dotenv import load_dotenv

# Load environment variables before importing security
load_dotenv()

from app.db.session import SessionLocal
from app.models import User
from app.core.security import hash_password


def create_user():
    db = SessionLocal()

    try:
        # New user details
        email = "santhosh@resolvehub.com"
        employee_id = "EMP014"

        # Check whether user already exists
        existing_user = db.query(User).filter(
            (User.email == email) |
            (User.employee_id == employee_id)
        ).first()

        if existing_user:
            print("User already exists!")
            return

        # Create new user
        new_user = User(
            employee_id=employee_id,
            full_name="Santhosh Kumar",
            email=email,
            phone_number=None,
            password_hash=hash_password("Test@123"),
            role="EMPLOYEE",
            role_type="INTERNAL",
            account_status="ACTIVE"
        )

        db.add(new_user)
        db.commit()

        print("User created successfully!")
        print("Email:", email)
        print("Password: Test@123")

    except Exception as e:
        db.rollback()
        print("Error creating user:", e)

    finally:
        db.close()


if __name__ == "__main__":
    create_user()
