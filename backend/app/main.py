```python
from fastapi import FastAPI

app = FastAPI(
    title="Supporter Issue Management System",
    description="Supporter-only issue management API",
    version="1.0.0",
)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "message": "Supporter Issue Management API is running",
    }
```