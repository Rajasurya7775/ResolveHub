from sqlalchemy import text
from sqlalchemy.orm import Session


def generate_issue_number(db: Session) -> str:
    """
    Generate sequential issue numbers:
    RES-1001, RES-1002, RES-1003...
    """

    # Prevent two simultaneous requests from generating the same number.
    db.execute(
        text("SELECT pg_advisory_xact_lock(:lock_id)"),
        {"lock_id": 1001001}
    )

    # Find the highest existing sequential issue number.
    result = db.execute(
        text("""
            SELECT COALESCE(
                MAX(CAST(SUBSTRING(issue_number FROM 5) AS INTEGER)),
                1000
            )
            FROM issue_management
            WHERE issue_number ~ '^RES-[0-9]+$'
        """)
    )

    last_number = result.scalar()

    return f"RES-{last_number + 1}"