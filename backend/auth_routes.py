from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import (
    LoginRequest,
    RegisterRequest,
    UserPublic,
    authenticate_user,
    create_access_token,
    get_current_user,
    register_user,
    user_to_public,
)
from backend.database import get_db
from backend.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic | None = None


@router.post("/login", response_model=AuthTokenResponse)
def login(
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, body.username, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    return AuthTokenResponse(
        access_token=create_access_token(user),
        token_type="bearer",
        user=user_to_public(user),
    )


@router.post(
    "/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
):
    user = register_user(db, body)
    return AuthTokenResponse(
        access_token=create_access_token(user),
        token_type="bearer",
        user=user_to_public(user),
    )


@router.get("/me", response_model=UserPublic)
def auth_me(current_user: User = Depends(get_current_user)):
    return user_to_public(current_user)
