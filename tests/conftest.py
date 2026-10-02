import os
import sys
import tempfile
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# Point the app at a throwaway database before anything imports it.
_DB_DIR = tempfile.mkdtemp(prefix="miniriskers-test-")
os.environ["MINIRISKERS_DATABASE_URL"] = f"sqlite:///{_DB_DIR}/test.db"
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("MINIRISKERS_DISABLE_EMBEDDINGS", "1")


@pytest.fixture(scope="session")
def app_client():
    from fastapi.testclient import TestClient

    from backend.main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture()
def db_session():
    from backend.database import SessionLocal

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="session")
def tokens(app_client):
    """Bearer headers for each seeded development user."""
    from backend.auth import create_access_token
    from backend.database import SessionLocal
    from backend.models import User

    session = SessionLocal()
    try:
        headers = {}
        for user in session.query(User).all():
            headers[user.role] = {
                "Authorization": f"Bearer {create_access_token(user)}"
            }
        # A second analyst for maker-checker tests.
        from backend.auth import hash_password

        second = session.query(User).filter(User.username == "risk_analyst_2").first()
        if second is None:
            second = User(
                username="risk_analyst_2",
                email="risk_analyst_2@miniriskers.local",
                full_name="Second Analyst",
                role="RISK_ANALYST",
                password_hash=hash_password("x-test-password"),
            )
            session.add(second)
            session.commit()
        headers["RISK_ANALYST_2"] = {
            "Authorization": f"Bearer {create_access_token(second)}"
        }
        return headers
    finally:
        session.close()
