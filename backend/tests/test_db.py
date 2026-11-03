from app.db.session import check_database_connection

try:
    check_database_connection()
    print("SUCCESS: PostgreSQL connected to FastAPI!")
except Exception as error:
    print("FAILED:", error)