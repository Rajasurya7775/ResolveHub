import random
from faker import Faker
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models import User, Project, Issue, IssueMessage

fake = Faker("en_IN")
Faker.seed(42)       # same data on every run
random.seed(42)

COUNT = 10
FAKE_PASSWORD = "Password@123"

# Edit these to match your real enum values
ISSUE_TYPES = ["BUG"]            # e.g. add "TASK", "FEATURE"
ISSUE_STATUSES = ["OPEN"]        # e.g. add "IN_PROGRESS", "RESOLVED", "CLOSED"
ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH"]
PROJECT_STATUSES = ["ACTIVE"]


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

        # Fake users (EMP004 onwards)
        for i in range(COUNT):
            users_data.append(
                {
                    "employee_id": f"EMP{i + 4:03d}",
                    "full_name": fake.name(),
                    "email": f"user{i + 4}@resolvehub.com",
                    "password": FAKE_PASSWORD,
                    "role": random.choice(["EMPLOYEE", "EMPLOYEE", "EMPLOYEE", "SUPPORTER"]),
                    "role_type": "INTERNAL",
                    "account_status": "ACTIVE",
                }
            )

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

        all_users = list(users.values())
        employees = [u for u in all_users if u.role == "EMPLOYEE"]
        supporters = [u for u in all_users if u.role == "SUPPORTER"]

        # 2. Create projects
        projects_data = [
            {
                "project_name": "ResolveHub Backend",
                "project_description": "ResolveHub issue management project",
                "project_status": "ACTIVE",
            }
        ]

        # Fake projects
        for _ in range(COUNT):
            suffix = random.choice(["Portal", "API", "Platform", "Service"])
            projects_data.append(
                {
                    "project_name": f"{fake.unique.word().capitalize()} {suffix}",
                    "project_description": fake.sentence(nb_words=10),
                    "project_status": random.choice(PROJECT_STATUSES),
                }
            )

        projects = []

        for data in projects_data:
            project = db.query(Project).filter(
                Project.project_name == data["project_name"]
            ).first()

            if not project:
                project = Project(
                    project_name=data["project_name"],
                    project_description=data["project_description"],
                    project_status=data["project_status"],
                    created_by=users["admin@resolvehub.com"].user_id,
                )
                db.add(project)
                db.flush()
                print(f"Created project: {project.project_name}")
            else:
                print(f"Project already exists: {project.project_name}")

            projects.append(project)

        # 3. Create issues
        issues_data = [
            {
                "issue_number": "RES-1001",
                "project": projects[0],
                "issue_title": "Login authentication issue",
                "issue_type": "BUG",
                "issue_description": "Unable to log in using valid credentials.",
                "issue_status": "OPEN",
                "issue_priority": "HIGH",
                "created_by": users["employee@resolvehub.com"],
                "assigned_to": users["supporter@resolvehub.com"],
            }
        ]

        # Fake issues
        for i in range(COUNT):
            issues_data.append(
                {
                    "issue_number": f"RES-{1002 + i}",
                    "project": random.choice(projects),
                    "issue_title": fake.sentence(nb_words=6).rstrip("."),
                    "issue_type": random.choice(ISSUE_TYPES),
                    "issue_description": fake.paragraph(nb_sentences=3),
                    "issue_status": random.choice(ISSUE_STATUSES),
                    "issue_priority": random.choice(ISSUE_PRIORITIES),
                    "created_by": random.choice(employees),
                    "assigned_to": random.choice(supporters),
                }
            )

        issues = []

        for data in issues_data:
            issue = db.query(Issue).filter(
                Issue.issue_number == data["issue_number"]
            ).first()

            if not issue:
                issue = Issue(
                    issue_number=data["issue_number"],
                    project_id=data["project"].project_id,
                    issue_title=data["issue_title"],
                    issue_type=data["issue_type"],
                    issue_description=data["issue_description"],
                    issue_status=data["issue_status"],
                    issue_priority=data["issue_priority"],
                    issue_created_by=data["created_by"].user_id,
                    assigned_to=data["assigned_to"].user_id,
                )
                db.add(issue)
                db.flush()
                print(f"Created issue: {issue.issue_number}")
            else:
                print(f"Issue already exists: {issue.issue_number}")

            issues.append(issue)

        # 4. Create issue messages
        for issue in issues:
            message = db.query(IssueMessage).filter(
                IssueMessage.issue_id == issue.issue_id,
                IssueMessage.sender_id == issue.assigned_to,
            ).first()

            if not message:
                text = (
                    "We are investigating this login issue."
                    if issue.issue_number == "RES-1001"
                    else fake.paragraph(nb_sentences=2)
                )
                db.add(
                    IssueMessage(
                        issue_id=issue.issue_id,
                        sender_id=issue.assigned_to,
                        markdown=text,
                    )
                )
                print(f"Created issue message for {issue.issue_number}")
            else:
                print(f"Issue message already exists for {issue.issue_number}")

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