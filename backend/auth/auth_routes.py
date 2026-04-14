from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from config.database import get_db
from .auth_schema import (
    UserCreate,
    LoginRequest,
    VerifyRequest,
    TokenResponse,
    MessageResponse,
    UserResponse,
)
from .auth_handler import (
    register_user,
    verify_user,
    login_user,
    logout_user,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/register", response_model=MessageResponse)
async def user_registrations(user: UserCreate, db: Session = Depends(get_db)):
    return register_user(user.email, user.password, db)


@router.post("/verify-user", response_model=MessageResponse)
async def verify_user_route(payload: VerifyRequest, db: Session = Depends(get_db)):
    return verify_user(payload.email, payload.otp, db)


@router.post("/login", response_model=TokenResponse)
async def user_login(user: LoginRequest, db: Session = Depends(get_db)):
    return login_user(user.email, user.password, db)


@router.post("/logout", response_model=MessageResponse)
async def user_logout(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    return logout_user(token, db)


@router.get("/get-current-user", response_model=UserResponse)
async def get_current_user_route(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = get_current_user(token, db)
    return UserResponse(id=user.id, email=user.email, created_at=user.created_at)
