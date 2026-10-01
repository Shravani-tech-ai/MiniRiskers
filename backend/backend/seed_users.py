import os

from sqlalchemy.orm import Session

from backend.auth import hash_password
from backend.models import User
from backend.permissions import (
    ROLE_ADMIN,
    ROLE_AUDITOR,
    ROLE_BUSINESS_OWNER,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
)

DEV_USERS = [
    {
        "username": "business_owner",
        "email": "business_owner@miniriskers.local",
        "full_name": "Business Owner",
        "role": ROLE_BUSINESS_OWNER,
        "password_env": "DEV_PASSWORD_BUSINESS_OWNER",
        "default_password": "dev-business-owner",
    },
    {
        "username": "risk_analyst",
        "email": "risk_analyst@miniriskers.local",
        "full_name": "Risk Analyst",
        "role": ROLE_RISK_ANALYST,
        "password_env": "DEV_PASSWORD_RISK_ANALYST",
        "default_password": "dev-risk-analyst",
    },
    {
        "username": "risk_committee",
        "email": "risk_committee@miniriskers.local",
        "full_name": "Risk Committee",
        "role": ROLE_RISK_COMMITTEE,
        "password_env": "DEV_PASSWORD_RISK_COMMITTEE",
        "default_password": "dev-risk-committee",
    },
    {
        "username": "auditor",
        "email": "auditor@miniriskers.local",
        "full_name": "Auditor",
        "role": ROLE_AUDITOR,
        "password_env": "DEV_PASSWORD_AUDITOR",
        "default_password": "dev-auditor",
    },
    {
        "username": "admin",
        "email": "admin@miniriskers.local",
        "full_name": "Admin",
        "role": ROLE_ADMIN,
        "password_env": "DEV_PASSWORD_ADMIN",
        "default_password": "dev-admin",
    },
]


def seed_development_users(db: Session) -> None:
    existing = db.query(User).count()
    if existing > 0:
        return

    for entry in DEV_USERS:
        password = os.getenv(entry["password_env"], entry["default_password"])
        user = User(
            username=entry["username"],
            email=entry["email"],
            full_name=entry["full_name"],
            role=entry["role"],
            password_hash=hash_password(password),
            is_active=True,
        )
        db.add(user)

    db.commit()
