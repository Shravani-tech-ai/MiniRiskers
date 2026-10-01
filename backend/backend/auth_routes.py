from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.auth import (
    ChangePasswordRequest,
    LoginRequest,
    NotificationPreferencesUpdate,
    RegisterRequest,
    UpdateProfileRequest,
    UserPreferencesPublic,
    UserPublic,
    authenticate_user,
    create_access_token,
    get_current_user,
    hash_password,
    register_user,
    user_to_public,
    verify_password,
)
from backend.database import get_db
from backend.models import User
from backend.user_preferences import (
    NOTIFICATION_CATEGORIES,
    merge_notification_preferences,
    parse_user_preferences,
    serialize_user_preferences,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic | None = None


def preferences_to_public(user: User) -> UserPreferencesPublic:
    parsed = parse_user_preferences(user.preferences_json)
    return UserPreferencesPublic(notifications=parsed["notifications"])


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


@router.patch("/me", response_model=UserPublic)
def update_profile(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = body.email.strip().lower()
    existing = (
        db.query(User)
        .filter(User.email == email, User.id != current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    current_user.full_name = body.full_name.strip()
    current_user.email = email

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        ) from error

    db.refresh(current_user)
    return user_to_public(current_user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must differ from the current password.",
        )

    current_user.password_hash = hash_password(body.new_password)
    db.commit()


@router.get("/preferences", response_model=UserPreferencesPublic)
def get_preferences(current_user: User = Depends(get_current_user)):
    return preferences_to_public(current_user)


@router.get("/preferences/categories")
def get_preference_categories():
    return {
        "categories": [
            {"key": key, "label": label}
            for key, label in NOTIFICATION_CATEGORIES.items()
        ]
    }


@router.patch("/preferences", response_model=UserPreferencesPublic)
def update_preferences(
    body: NotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return preferences_to_public(current_user)

    current = parse_user_preferences(current_user.preferences_json)
    merged = merge_notification_preferences(current, updates)
    current_user.preferences_json = serialize_user_preferences(merged)
    db.commit()
    db.refresh(current_user)
    return preferences_to_public(current_user)
