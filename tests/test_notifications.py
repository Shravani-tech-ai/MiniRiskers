"""Notification delivery and API tests."""

from backend.audit import create_audit_event
from backend.models import ChangeRequest, Notification


def create_draft_request(db, title="Notification test request"):
    change_request = ChangeRequest(
        request_number="CR-NOTIF-001",
        title=title,
        description="Synthetic notification test",
        change_type="NEW_PRODUCT",
        product_type="Remittance",
        business_unit="Retail",
        customer_segment="Retail",
        requested_by="Business Owner",
        status="DRAFT",
        current_stage="REQUEST_CREATED",
    )
    db.add(change_request)
    db.flush()
    create_audit_event(
        db,
        change_request.id,
        "Business Owner",
        "CREATED_CHANGE_REQUEST",
    )
    db.commit()
    return change_request


def test_request_created_notifies_business_owner(app_client, db_session, tokens):
    response = app_client.post(
        "/change-requests",
        json={
            "title": "New wallet product",
            "description": "Launch a digital wallet",
            "change_type": "NEW_PRODUCT",
            "product_type": "Wallet",
            "business_unit": "Retail",
            "customer_segment": "Mass market",
        },
        headers=tokens["BUSINESS_OWNER"],
    )
    assert response.status_code == 200, response.text
    request_id = response.json()["id"]

    listed = app_client.get("/notifications", headers=tokens["BUSINESS_OWNER"])
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["unread_count"] >= 1
    titles = [item["title"] for item in payload["notifications"]]
    assert any("created" in title.lower() for title in titles)
    assert any(item["change_request_id"] == request_id for item in payload["notifications"])


def test_submit_notifies_risk_analyst(app_client, db_session, tokens):
    request_id = create_draft_request(db_session).id
    create_audit_event(
        db_session,
        request_id,
        "Business Owner",
        "CHANGE_REQUEST_SUBMITTED",
    )
    db_session.query(ChangeRequest).filter(ChangeRequest.id == request_id).update(
        {"status": "SUBMITTED"}
    )
    db_session.commit()

    from backend.notifications import notify_request_submitted

    change_request = db_session.get(ChangeRequest, request_id)
    notify_request_submitted(db_session, change_request)
    db_session.commit()

    listed = app_client.get("/notifications", headers=tokens["RISK_ANALYST"])
    assert listed.status_code == 200
    payload = listed.json()
    assert payload["unread_count"] >= 1
    assert any(
        item["notification_type"] == "REQUEST_SUBMITTED"
        for item in payload["notifications"]
    )


def test_mark_notification_read(app_client, db_session, tokens):
    request_id = create_draft_request(db_session).id
    from backend.notifications import notify_request_created

    change_request = db_session.get(ChangeRequest, request_id)
    notify_request_created(db_session, change_request)
    db_session.commit()

    notification = (
        db_session.query(Notification)
        .filter(Notification.change_request_id == request_id)
        .first()
    )
    assert notification is not None

    unread = app_client.get("/notifications/unread-count", headers=tokens["BUSINESS_OWNER"])
    assert unread.json()["unread_count"] >= 1

    marked = app_client.patch(
        f"/notifications/{notification.id}/read",
        headers=tokens["BUSINESS_OWNER"],
    )
    assert marked.status_code == 200
    assert marked.json()["read"] is True

    unread_after = app_client.get(
        "/notifications/unread-count",
        headers=tokens["BUSINESS_OWNER"],
    )
    assert unread_after.json()["unread_count"] == unread.json()["unread_count"] - 1
