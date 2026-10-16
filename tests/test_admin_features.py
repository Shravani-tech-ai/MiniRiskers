"""Admin console features: retired Auditor role, settings, regulatory
library, control library, model training and Business Owner feedback."""

from datetime import datetime, timedelta

from backend.models import (
    ChangeRequest,
    RegulatorySource,
    RiskAssessment,
    RiskFactor,
    User,
)
from risk_engine.methodology import default_config, score_factors
from tests.test_governance_workflow import make_request


# ---------------------------------------------------------------------------
# Auditor role retired
# ---------------------------------------------------------------------------

def test_auditor_role_cannot_register(app_client):
    response = app_client.post("/auth/register", json={
        "full_name": "New Auditor",
        "username": "new_auditor",
        "email": "new.auditor@example.com",
        "password": "a-long-password",
        "role": "AUDITOR",
    })
    assert response.status_code == 400


def test_legacy_auditor_cannot_sign_in_until_admin_reassigns(app_client, db_session, tokens):
    from backend.auth import hash_password

    legacy = User(
        username="legacy_auditor",
        email="legacy.auditor@example.com",
        full_name="Legacy Auditor",
        role="AUDITOR",
        password_hash=hash_password("a-long-password"),
    )
    db_session.add(legacy)
    db_session.commit()

    login = {"username": "legacy_auditor", "password": "a-long-password"}
    assert app_client.post("/auth/login", json=login).status_code == 403

    users = app_client.get("/admin/users", headers=tokens["ADMIN"]).json()["users"]
    row = next(u for u in users if u["username"] == "legacy_auditor")
    assert row["role_retired"] is True

    updated = app_client.patch(
        f"/admin/users/{legacy.id}", json={"role": "RISK_ANALYST"}, headers=tokens["ADMIN"]
    )
    assert updated.status_code == 200
    assert app_client.post("/auth/login", json=login).status_code == 200


def test_admin_cannot_demote_self(app_client, db_session, tokens):
    admin = db_session.query(User).filter(User.role == "ADMIN").first()
    response = app_client.patch(
        f"/admin/users/{admin.id}", json={"role": "RISK_ANALYST"}, headers=tokens["ADMIN"]
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

def test_settings_defaults_and_validation(app_client, tokens):
    settings = {
        s["key"]: s["value"]
        for s in app_client.get("/admin/settings", headers=tokens["ADMIN"]).json()["settings"]
    }
    assert settings["feedback_window_days"] == 5
    assert settings["training_min_cases"] == 10

    assert app_client.put(
        "/admin/settings", json={"feedback_window_days": 0}, headers=tokens["ADMIN"]
    ).status_code == 400
    assert app_client.put(
        "/admin/settings", json={"training_max_cases": 3}, headers=tokens["ADMIN"]
    ).status_code == 400
    assert app_client.put(
        "/admin/settings", json={"feedback_window_days": 7}, headers=tokens["RISK_COMMITTEE"]
    ).status_code == 403

    ok = app_client.put(
        "/admin/settings", json={"feedback_window_days": 7}, headers=tokens["ADMIN"]
    )
    assert ok.status_code == 200
    app_client.put("/admin/settings", json={"feedback_window_days": 5}, headers=tokens["ADMIN"])


# ---------------------------------------------------------------------------
# Regulatory library
# ---------------------------------------------------------------------------

def _upload(client, headers, title, supersedes_id=None):
    data = {"title": title, "authority": "RBI", "document_type": "Circular"}
    if supersedes_id:
        data["supersedes_id"] = str(supersedes_id)
    return client.post(
        "/regulatory-sources",
        data=data,
        files={"file": ("circular.txt", b"--- PAGE 1 ---\nCustomers must be screened.", "text/plain")},
        headers=headers,
    )


def test_initial_corpus_is_registered(app_client, tokens):
    sources = app_client.get("/regulatory-sources", headers=tokens["RISK_ANALYST"]).json()["sources"]
    statuses = {s["document_name"]: s["status"] for s in sources}
    assert any("KYC" in name for name in statuses)
    withdrawn = [n for n, status in statuses.items() if status == "WITHDRAWN"]
    assert any("Digital Payment Security" in name for name in withdrawn)


def test_admin_upload_is_auto_approved(app_client, tokens):
    response = _upload(app_client, tokens["ADMIN"], "Admin circular 2026")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "ACTIVE"
    assert "auto-approved" in body["approved_by"]
    detail = app_client.get(f"/regulatory-sources/{body['id']}", headers=tokens["ADMIN"]).json()
    # Indexing runs as a background task; embeddings are disabled in tests.
    assert detail["index_status"] == "SKIPPED"
    assert detail["chunk_count"] == 1


def test_committee_upload_needs_admin_approval(app_client, db_session, tokens):
    original = _upload(app_client, tokens["ADMIN"], "KYC update v1").json()

    # Analysts cannot upload.
    assert _upload(app_client, tokens["RISK_ANALYST"], "Nope").status_code == 403

    pending = _upload(
        app_client, tokens["RISK_COMMITTEE"], "KYC update v2", supersedes_id=original["id"]
    ).json()
    assert pending["status"] == "PENDING_APPROVAL"
    assert pending["index_status"] == "NOT_INDEXED"

    # Evidence citing the old version on an open request gets flagged.
    request_id = make_request(db_session, [("CUSTOMER", "PEP Exposure")])
    from backend.models import RegulatoryEvidence

    db_session.add(RegulatoryEvidence(
        change_request_id=request_id,
        document_name=original["document_name"],
        evidence_text="old text",
        is_current=True,
    ))
    db_session.commit()

    assert app_client.post(
        f"/regulatory-sources/{pending['id']}/approve", json={}, headers=tokens["RISK_COMMITTEE"]
    ).status_code == 403
    assert app_client.post(
        f"/regulatory-sources/{pending['id']}/reject", json={"note": ""}, headers=tokens["ADMIN"]
    ).status_code == 400

    approved = app_client.post(
        f"/regulatory-sources/{pending['id']}/approve", json={"note": "OK"}, headers=tokens["ADMIN"]
    )
    assert approved.status_code == 200, approved.text

    db_session.expire_all()
    old = db_session.get(RegulatorySource, original["id"])
    new = db_session.get(RegulatorySource, pending["id"])
    assert new.status == "ACTIVE"
    assert old.status == "SUPERSEDED" and old.superseded_by_id == new.id

    events = app_client.get(
        f"/change-requests/{request_id}/audit-events", headers=tokens["ADMIN"]
    ).json()["events"]
    assert "REGULATORY_SOURCE_CHANGED" in [e["action"] for e in events]


# ---------------------------------------------------------------------------
# Controls
# ---------------------------------------------------------------------------

def test_control_library_admin_only_and_seeded(app_client, tokens):
    library = app_client.get("/control-library", headers=tokens["RISK_ANALYST"]).json()
    codes = {c["code"] for c in library["controls"]}
    assert {"SCR-01", "TM-01", "CDD-01"} <= codes

    payload = {
        "code": "tst-01",
        "name": "Test control",
        "risk_categories": ["FRAUD"],
        "control_type": "DETECTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "DAILY",
    }
    assert app_client.post(
        "/control-library", json=payload, headers=tokens["RISK_ANALYST"]
    ).status_code == 403
    created = app_client.post("/control-library", json=payload, headers=tokens["ADMIN"])
    assert created.status_code == 201
    assert created.json()["code"] == "TST-01"
    assert app_client.post(
        "/control-library", json=payload, headers=tokens["ADMIN"]
    ).status_code == 409


def test_request_control_effectiveness_comes_from_ratings(app_client, db_session, tokens):
    request_id = make_request(db_session, [("GEOGRAPHY", "Cross Border Transactions")])
    calc = app_client.post(
        f"/change-requests/{request_id}/calculate-risk", headers=tokens["RISK_ANALYST"]
    )
    assert calc.status_code == 200

    library = app_client.get("/control-library", headers=tokens["RISK_ANALYST"]).json()["controls"]
    screening = next(c for c in library if c["code"] == "SCR-01")
    added = app_client.post(
        f"/change-requests/{request_id}/controls",
        json={
            "library_control_id": screening["id"],
            "design_effectiveness_rating": "EFFECTIVE",
            "operating_effectiveness_rating": "PARTIALLY_EFFECTIVE",
        },
        headers=tokens["RISK_ANALYST"],
    )
    assert added.status_code == 201, added.text
    control = added.json()
    # The weaker of design (90) and operating (50).
    assert control["effectiveness_score"] == 50
    assert control["mapped_categories"] == ["CUSTOMER", "GEOGRAPHY", "TRANSACTION"]

    assert app_client.post(
        f"/change-requests/{request_id}/controls",
        json={"control_name": "", "design_effectiveness_rating": "EFFECTIVE",
              "operating_effectiveness_rating": "EFFECTIVE"},
        headers=tokens["RISK_ANALYST"],
    ).status_code == 400

    removed = app_client.delete(
        f"/change-requests/{request_id}/controls/{control['id']}",
        headers=tokens["RISK_ANALYST"],
    )
    assert removed.status_code == 200
    actions = [
        e["action"]
        for e in app_client.get(
            f"/change-requests/{request_id}/audit-events", headers=tokens["ADMIN"]
        ).json()["events"]
    ]
    assert "CONTROL_ADDED" in actions and "CONTROL_REMOVED" in actions


def test_per_category_residual_only_mitigates_mapped_categories():
    config = default_config()
    factors = [
        {"category": "GEOGRAPHY", "name": "High Risk Geography"},
        {"category": "FRAUD", "name": "Rapid Movement Pattern"},
    ]
    average = score_factors(factors, 90, config)
    config["controls"]["residual_method"] = "PER_CATEGORY"
    # A strong geography control does nothing for fraud.
    per_category = score_factors(
        factors, 90, config, category_effectiveness={"GEOGRAPHY": 90}
    )
    assert per_category["residual_method"] == "PER_CATEGORY"
    assert per_category["raw_residual"] > average["raw_residual"]
    # Without per-category data it falls back to the average method.
    assert score_factors(factors, 90, config)["residual_method"] == "AVERAGE"


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def _decided_case(db, index, final_rating, scores):
    change_request = ChangeRequest(
        title=f"Decided case {index}",
        description="Synthetic decided case for training",
        product_type="Wallet",
        requested_by="Business Owner",
        status="APPROVED",
        current_stage="COMPLETED",
        closed_at=datetime.utcnow() - timedelta(days=index),
    )
    db.add(change_request)
    db.flush()
    db.add(RiskFactor(
        change_request_id=change_request.id,
        risk_category="TRANSACTION",
        risk_factor="High Transaction Velocity",
        factor_score=0,
        factor_weight=0,
    ))
    db.add(RiskAssessment(
        change_request_id=change_request.id,
        risk_model_version="1.0",
        customer_risk_score=scores[0],
        product_risk_score=scores[1],
        geography_risk_score=scores[2],
        transaction_risk_score=scores[3],
        channel_risk_score=scores[4],
        third_party_risk_score=scores[5],
        fraud_risk_score=scores[6],
        inherent_score=50,
        control_adjustment=20,
        residual_score=40,
        residual_rating="MEDIUM",
        final_rating=final_rating,
        residual_status="CALCULATED",
    ))
    db.commit()


def test_training_needs_minimum_cases_then_suggests_weights(app_client, db_session, tokens):
    app_client.put("/admin/settings", json={"training_min_cases": 500}, headers=tokens["ADMIN"])
    insufficient = app_client.post("/training-runs", headers=tokens["ADMIN"]).json()
    assert insufficient["status"] == "INSUFFICIENT_DATA"

    for index in range(12):
        high = index % 2 == 0
        _decided_case(
            db_session,
            index,
            "HIGH" if high else "LOW",
            [20, 20, 90 if high else 10, 30, 20, 10, 10],
        )
    app_client.put("/admin/settings", json={"training_min_cases": 10}, headers=tokens["ADMIN"])

    assert app_client.post("/training-runs", headers=tokens["RISK_COMMITTEE"]).status_code == 403
    run = app_client.post("/training-runs", headers=tokens["ADMIN"]).json()
    assert run["status"] == "COMPLETED", run["message"]
    weights = run["suggested_weights"]
    assert abs(sum(weights.values()) - 1) < 0.0011
    # Geography separates HIGH from LOW, so its weight goes up.
    assert weights["GEOGRAPHY"] > run["current_weights"]["GEOGRAPHY"]

    # The committee only sees shared runs, then starts a draft from one.
    assert app_client.get("/training-runs", headers=tokens["RISK_COMMITTEE"]).json()["runs"] == []
    app_client.post(f"/training-runs/{run['id']}/share", headers=tokens["ADMIN"])
    adopted = app_client.post(
        f"/training-runs/{run['id']}/adopt", headers=tokens["RISK_COMMITTEE"]
    )
    assert adopted.status_code == 200, adopted.text
    draft = app_client.get(
        f"/methodology/versions/{adopted.json()['methodology_version_id']}",
        headers=tokens["RISK_COMMITTEE"],
    ).json()
    assert draft["status"] == "DRAFT"
    assert draft["config"]["category_weights"] == weights

    # Clean up the draft so other tests start from a clean methodology.
    from backend.models import MethodologyVersion

    db_session.query(MethodologyVersion).filter(
        MethodologyVersion.id == draft["id"]
    ).delete()
    db_session.commit()


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------

def test_business_owner_feedback_window(app_client, db_session, tokens):
    owner = db_session.query(User).filter(User.role == "BUSINESS_OWNER").first()
    change_request = ChangeRequest(
        title="Closed wallet launch",
        requested_by=owner.username,
        status="APPROVED",
        current_stage="COMPLETED",
        closed_at=datetime.utcnow() - timedelta(days=1),
    )
    stale = ChangeRequest(
        title="Old closed request",
        requested_by=owner.username,
        status="REJECTED",
        current_stage="COMPLETED",
        closed_at=datetime.utcnow() - timedelta(days=30),
    )
    db_session.add_all([change_request, stale])
    db_session.commit()

    pending = app_client.get("/feedback/pending", headers=tokens["BUSINESS_OWNER"]).json()
    pending_ids = {item["id"] for item in pending["requests"]}
    assert change_request.id in pending_ids and stale.id not in pending_ids

    status = app_client.get(
        f"/change-requests/{change_request.id}/feedback", headers=tokens["BUSINESS_OWNER"]
    ).json()
    assert status["eligible"] is True and status["window_days"] == 5

    assert app_client.post(
        f"/change-requests/{change_request.id}/feedback",
        json={"rating": 6}, headers=tokens["BUSINESS_OWNER"],
    ).status_code == 400
    ok = app_client.post(
        f"/change-requests/{change_request.id}/feedback",
        json={"rating": 4, "tags": ["Clear explanation"], "comment": "Smooth."},
        headers=tokens["BUSINESS_OWNER"],
    )
    assert ok.status_code == 201, ok.text
    assert app_client.post(
        f"/change-requests/{change_request.id}/feedback",
        json={"rating": 5}, headers=tokens["BUSINESS_OWNER"],
    ).status_code == 409
    closed = app_client.post(
        f"/change-requests/{stale.id}/feedback",
        json={"rating": 3}, headers=tokens["BUSINESS_OWNER"],
    )
    assert closed.status_code == 400 and "window" in closed.json()["detail"]

    summary = app_client.get("/admin/feedback-summary", headers=tokens["ADMIN"]).json()
    assert summary["responses"] >= 1
    assert summary["distribution"]["4"] >= 1
    assert app_client.get(
        "/admin/feedback-summary", headers=tokens["BUSINESS_OWNER"]
    ).status_code == 403
