from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.enums import AccountStatus
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise _unauthorized()

    try:
        payload = decode_access_token(credentials.credentials)  # <- adjust if needed
        user_id = int(payload["sub"])                            # <- adjust if needed
    except (JWTError, KeyError, TypeError, ValueError):
        raise _unauthorized()

    user = db.get(User, user_id)
    if user is None:
        raise _unauthorized()

    if user.account_status != AccountStatus.ACTIVE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is not active")

    return user


def require_roles(*allowed_roles: str):
    def normalize_role(role):
        role = getattr(role, "value", role)
        role = str(role).strip().upper()

        # Support existing database role naming
        role_aliases = {
            "SUPPORT": "SUPPORTER",
            "SUPPORTER": "SUPPORTER",
        }

        return role_aliases.get(role, role)

    allowed = {normalize_role(role) for role in allowed_roles}

    def checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = normalize_role(current_user.role)

        if user_role not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Not enough permissions"
            )

        return current_user

    return checker