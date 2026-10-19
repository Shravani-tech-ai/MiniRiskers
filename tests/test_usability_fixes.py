"""Regression tests for the user-guide usability fixes."""

from backend.audit import create_audit_event
from backend.auth import create_access_token, hash_password
from backend.models import (
    ChangeRequest,
    MethodologyVersion,
    Product,
    RiskFactor,
    User,
)


def _draft_request(db, requested_by="Business Owner", title="Fix test request"):
    change_request = ChangeRequest(
        title=title,
        description="Synthetic test request",
        change_type="NEW_PRODUCT",
        product_type="Remittance",
        business_unit="Retail",
        customer_segment="Retail",
        requested_by=requested_by,
        status="DRAFT",
        current_stage="REQUEST_CREATED",
    )
    db.add(change_request)
    db.commit()
    return change_request.id


def test_resaving_an_intake_section_updates_it_in_place(app_client, db_session, tokens):
    request_id = _draft_request(db_session)
    owner = tokens["BUSINESS_OWNER"]

    for name in ("First name", "Edited name"):
        response = app_client.post(
            f"/change-requests/{request_id}/product",
            params={"product_name": name, "transaction_type": "TRANSFER"},
            headers=owner,
        )
        assert response.status_code == 200, response.text

    rows = db_session.query(Product).filter(Product.change_request_id == request_id).all()
    assert len(rows) == 1
    inputs = app_client.get(
        f"/change-requests/{request_id}/assessment-inputs", headers=owner
    ).json()["inputs"]
    assert inputs["product"]["product_name"] == "Edited name"


def test_methodology_draft_can_be_withdrawn_and_only_one_is_open(app_client, db_session, tokens):
    # Clear any version another test left open.
    for row in db_session.query(MethodologyVersion).filter(
        MethodologyVersion.status.in_(["DRAFT", "PENDING_APPROVAL"])
    ):
        row.status = "WITHDRAWN"
    db_session.commit()

    committee = tokens["RISK_COMMITTEE"]
    committee_2 = tokens["RISK_COMMITTEE_2"]
    draft = app_client.post("/methodology/versions", json={}, headers=committee)
    assert draft.status_code == 200, draft.text
    draft_id = draft.json()["id"]

    second = app_client.post("/methodology/versions", json={}, headers=committee_2)
    assert second.status_code == 400
    assert "Finish or withdraw" in second.json()["detail"]

    # Only the proposer may submit or withdraw.
    assert app_client.post(f"/methodology/versions/{draft_id}/submit", headers=committee_2).status_code == 403
    assert app_client.post(f"/methodology/versions/{draft_id}/withdraw", headers=committee_2).status_code == 403

    withdrawn = app_client.post(f"/methodology/versions/{draft_id}/withdraw", headers=committee)
    assert withdrawn.status_code == 200, withdrawn.text
    assert withdrawn.json()["status"] == "WITHDRAWN"
    assert app_client.post(f"/methodology/versions/{draft_id}/withdraw", headers=committee).status_code == 400

    # A new draft can start once the old one is withdrawn.
    fresh = app_client.post("/methodology/versions", json={}, headers=committee_2)
    assert fresh.status_code == 200, fresh.text
    assert app_client.post(
        f"/methodology/versions/{fresh.json()['id']}/withdraw", headers=committee_2
    ).status_code == 200


def test_signup_options_are_public(app_client):
    response = app_client.get("/auth/signup-options")
    assert response.status_code == 200
    assert isinstance(response.json()["allow_admin_signup"], bool)


def test_name_change_keeps_own_requests_visible(app_client, db_session):
    user = db_session.query(User).filter(User.username == "renaming_owner").first()
    if user is None:
        user = User(
            username="renaming_owner",
            email="renaming_owner@bank.co.in",
            full_name="Original Owner Name",
            role="BUSINESS_OWNER",
            password_hash=hash_password("x-test-password"),
        )
        db_session.add(user)
        db_session.commit()
    headers = {"Authorization": f"Bearer {create_access_token(user)}"}
    request_id = _draft_request(db_session, requested_by="Original Owner Name")

    response = app_client.patch(
        "/auth/me",
        json={"full_name": "Renamed Owner", "email": "renaming_owner@bank.co.in"},
        headers=headers,
    )
    assert response.status_code == 200, response.text

    listed = app_client.get("/change-requests", headers=headers).json()
    assert request_id in [item["id"] for item in listed]


def _request_with_residual(client, db, tokens):
    request_id = _draft_request(db, title="AI error test")
    change_request = db.get(ChangeRequest, request_id)
    change_request.status = "SUBMITTED"
    create_audit_event(db, request_id, "Business Owner", "CHANGE_REQUEST_SUBMITTED")
    db.add(RiskFactor(
        change_request_id=request_id,
        risk_category="GEOGRAPHY",
        risk_factor="High Risk Jurisdiction",
        factor_value="true",
        factor_score=0,
        factor_weight=0,
    ))
    db.commit()
    analyst = tokens["RISK_ANALYST"]
    assert client.post(f"/change-requests/{request_id}/calculate-risk", headers=analyst).status_code == 200
    control = client.post(
        f"/change-requests/{request_id}/control",
        headers=analyst,
        params={
            "control_name": "Screening",
            "control_category": "AML",
            "description": "Screening",
            "control_type": "PREVENTIVE",
            "control_strength": "STRONG",
            "implemented": True,
            "implementation_status": "IMPLEMENTED",
            "owner": "FCRM",
            "effectiveness_score": 50,
        },
    )
    assert control.status_code == 200, control.text
    assert client.post(f"/change-requests/{request_id}/calculate-risk", headers=analyst).status_code == 200
    return request_id


def test_risk_assessment_returns_category_ratings(app_client, db_session, tokens):
    request_id = _request_with_residual(app_client, db_session, tokens)
    data = app_client.get(
        f"/change-requests/{request_id}/risk-assessment", headers=tokens["RISK_ANALYST"]
    ).json()
    assert set(data["category_ratings"]) == {
        "customer", "product", "geography", "transaction", "channel", "third_party", "fraud",
    }
    assert data["category_ratings"]["geography"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_missing_gemini_key_gives_clear_error(app_client, db_session, tokens, monkeypatch):
    import backend.main as main

    def fail(*args, **kwargs):
        raise ValueError("GEMINI_API_KEY is not configured. Add it to the project .env file.")

    monkeypatch.setattr(main, "generate_ai_assessment", fail)
    request_id = _request_with_residual(app_client, db_session, tokens)

    response = app_client.post(
        f"/change-requests/{request_id}/generate-ai-assessment", headers=tokens["RISK_ANALYST"]
    )
    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]
    db_session.expire_all()
    assert db_session.get(ChangeRequest, request_id).current_stage == "RISK_ASSESSMENT"
