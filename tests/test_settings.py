"""Settings and account preference API tests."""

from backend.models import Notification, User
from backend.notifications import notify_request_submitted
from backend.user_preferences import parse_user_preferences, serialize_user_preferences


def test_get_preferences_defaults(app_client, tokens):
    response = app_client.get("/auth/preferences", headers=tokens["BUSINESS_OWNER"])
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["notifications"]["workflow"] is True
    assert payload["notifications"]["sla"] is True


def test_update_profile(app_client, tokens, db_session):
    user = db_session.query(User).filter(User.role == "BUSINESS_OWNER").first()
    original_email = user.email

    response = app_client.patch(
        "/auth/me",
        json={
            "full_name": "Updated Business Owner",
            "email": "updated-owner@miniriskers.local",
        },
        headers=tokens["BUSINESS_OWNER"],
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["full_name"] == "Updated Business Owner"
    assert payload["email"] == "updated-owner@miniriskers.local"

    db_session.refresh(user)
    assert user.full_name == "Updated Business Owner"
    assert user.email == "updated-owner@miniriskers.local"

    restore = app_client.patch(
        "/auth/me",
        json={"full_name": user.full_name, "email": original_email},
        headers=tokens["BUSINESS_OWNER"],
    )
    assert restore.status_code == 200


def test_change_password(app_client, tokens):
    current_password = "dev-risk-analyst"
    new_password = "new-password-1"

    response = app_client.post(
        "/auth/change-password",
        json={
            "current_password": current_password,
            "new_password": new_password,
        },
        headers=tokens["RISK_ANALYST"],
    )
    assert response.status_code == 204, response.text

    login_new = app_client.post(
        "/auth/login",
        json={"username": "risk_analyst", "password": new_password},
    )
    assert login_new.status_code == 200, login_new.text

    revert = app_client.post(
        "/auth/change-password",
        json={
            "current_password": new_password,
            "new_password": current_password,
        },
        headers={
            "Authorization": f"Bearer {login_new.json()['access_token']}",
        },
    )
    assert revert.status_code == 204


def test_change_password_rejects_wrong_current(app_client, tokens):
    response = app_client.post(
        "/auth/change-password",
        json={
            "current_password": "wrong-password",
            "new_password": "another-password",
        },
        headers=tokens["AUDITOR"],
    )
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()


def test_notification_preferences_are_respected(app_client, db_session, tokens):
    user = db_session.query(User).filter(User.role == "RISK_ANALYST").first()
    prefs = parse_user_preferences(None)
    prefs["notifications"]["workflow"] = False
    user.preferences_json = serialize_user_preferences(prefs)
    db_session.commit()

    from backend.models import ChangeRequest

    change_request = ChangeRequest(
        request_number="CR-SETTINGS-001",
        title="Preference test",
        description="Notification preference test",
        change_type="NEW_PRODUCT",
        product_type="Wallet",
        business_unit="Retail",
        customer_segment="Retail",
        requested_by="Business Owner",
        status="SUBMITTED",
        current_stage="RISK_ASSESSMENT",
    )
    db_session.add(change_request)
    db_session.commit()

    before = db_session.query(Notification).filter(Notification.user_id == user.id).count()
    notify_request_submitted(db_session, change_request)
    db_session.commit()
    after = db_session.query(Notification).filter(Notification.user_id == user.id).count()

    assert after == before

    update = app_client.patch(
        "/auth/preferences",
        json={"workflow": True},
        headers=tokens["RISK_ANALYST"],
    )
    assert update.status_code == 200
    assert update.json()["notifications"]["workflow"] is True
