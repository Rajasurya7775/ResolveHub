from app.core.security import (
    create_access_token,
    verify_password,
)


def authenticate_user(user, password: str):
    """
    Authenticate a user using the supplied password.

    Returns the user if authentication succeeds; otherwise, returns None.
    The user object must have a hashed_password attribute.
    """
    if user is None:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def generate_user_token(user) -> str:
    """
    Generate a JWT access token for an authenticated user.

    The user object must have an id attribute.
    """
    return create_access_token(subject=str(user.id))