"""
Reusable FastAPI dependency for authentication.

Usage:
    from auth.auth_dependency import get_authenticated_user

    @router.get("/protected")
    def protected_route(current_user: User = Depends(get_authenticated_user)):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from config.database import get_db
from .auth_handler import get_current_user
from .auth_models import User

# Reuse the same tokenUrl so swagger UI works correctly
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_authenticated_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that:
      1. Extracts the Bearer JWT from the Authorization header.
      2. Validates it (signature, expiry, blacklist).
      3. Returns the resolved User ORM object.

    Raises HTTP 401 if the token is missing, invalid, or revoked.
    """
    return get_current_user(token=token, db=db)
