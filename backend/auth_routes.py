from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.auth import (
    ALLOW_ADMIN_SELF_SIGNUP,
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
from backend.models import ChangeRequest, User
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


@router.get("/signup-options")
def signup_options():
    """Public: which roles the signup page may offer."""
    return {"allow_admin_signup": ALLOW_ADMIN_SELF_SIGNUP}


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


def _carry_name_on_requests(
    db: Session, user: User, old_name: str, new_name: str
) -> None:
    """Keep the user's requests linked to them after a name change.

    Requests record the owner (and assigned analyst) by name, and access is
    matched on username or current full name, so renaming would otherwise
    hide the user's own requests. Skipped when another account shares the
    old name, so a rename never takes over someone else's requests.
    """
    if not old_name or old_name.lower() == new_name.lower():
        return
    if old_name.lower() == user.username.lower():
        return
    shared = (
        db.query(User)
        .filter(
            func.lower(User.full_name) == old_name.lower(),
            User.id != user.id,
        )
        .first()
    )
    if shared:
        return
    for column in (ChangeRequest.requested_by, ChangeRequest.assigned_analyst):
        db.query(ChangeRequest).filter(
            func.lower(column) == old_name.lower()
        ).update({column: new_name}, synchronize_session=False)


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

    old_name = (current_user.full_name or "").strip()
    new_name = body.full_name.strip()
    current_user.full_name = new_name
    current_user.email = email
    _carry_name_on_requests(db, current_user, old_name, new_name)

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
