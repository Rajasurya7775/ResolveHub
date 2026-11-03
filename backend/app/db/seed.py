from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models import User, Project, Issue, IssueMessage


def seed_database():
    db: Session = SessionLocal()

    try:
        # 1. Create initial users
        users_data = [
            {
                "employee_id": "EMP001",
                "full_name": "ResolveHub Admin",
                "email": "admin@resolvehub.com",
                "password": "Admin@123",
                "role": "ADMIN",
                "role_type": "INTERNAL",
                "account_status": "ACTIVE",
            },
            {
                "employee_id": "EMP002",
                "full_name": "ResolveHub Supporter",
                "email": "supporter@resolvehub.com",
                "password": "Support@123",
                "role": "SUPPORTER",
                "role_type": "INTERNAL",
                "account_status": "ACTIVE",
            },
            {
                "employee_id": "EMP003",
                "full_name": "ResolveHub Employee",
                "email": "employee@resolvehub.com",
                "password": "Employee@123",
                "role": "EMPLOYEE",
                "role_type": "INTERNAL",
                "account_status": "ACTIVE",
            },
        ]

        users = {}

        for data in users_data:
            user = db.query(User).filter(
                User.email == data["email"]
            ).first()

            if not user:
                user = User(
                    employee_id=data["employee_id"],
                    full_name=data["full_name"],
                    email=data["email"],
                    password_hash=hash_password(data["password"]),
                    role=data["role"],
                    role_type=data["role_type"],
                    account_status=data["account_status"],
                )
                db.add(user)
                db.flush()
                print(f"Created user: {user.email}")
            else:
                print(f"User already exists: {user.email}")

            users[data["email"]] = user

        # 2. Create project
        project = db.query(Project).filter(
            Project.project_name == "ResolveHub Backend"
        ).first()

        if not project:
            project = Project(
                project_name="ResolveHub Backend",
                project_description="ResolveHub issue management project",
                project_status="ACTIVE",
                created_by=users["admin@resolvehub.com"].user_id,
            )
            db.add(project)
            db.flush()
            print("Created project: ResolveHub Backend")
        else:
            print("Project already exists")

        # 3. Create sample issue
        issue = db.query(Issue).filter(
            Issue.issue_number == "RES-1001"
        ).first()

        if not issue:
            issue = Issue(
                issue_number="RES-1001",
                project_id=project.project_id,
                issue_title="Login authentication issue",
                issue_type="BUG",
                issue_description="Unable to log in using valid credentials.",
                issue_status="OPEN",
                issue_priority="HIGH",
                issue_created_by=users["employee@resolvehub.com"].user_id,
                assigned_to=users["supporter@resolvehub.com"].user_id,
            )
            db.add(issue)
            db.flush()
            print("Created issue: RES-1001")
        else:
            print("Issue already exists: RES-1001")

        # 4. Create issue message
        message = db.query(IssueMessage).filter(
            IssueMessage.issue_id == issue.issue_id,
            IssueMessage.sender_id == users["supporter@resolvehub.com"].user_id,
        ).first()

        if not message:
            message = IssueMessage(
                issue_id=issue.issue_id,
                sender_id=users["supporter@resolvehub.com"].user_id,
                markdown="We are investigating this login issue.",
            )
            db.add(message)
            print("Created issue message")
        else:
            print("Issue message already exists")

        db.commit()
        print("\nDatabase seeding completed successfully!")

    except Exception as error:
        db.rollback()
        print(f"Database seeding failed: {error}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()