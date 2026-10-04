"""End-to-end governance workflow through the API on a throwaway database."""

import pytest

from backend.audit import create_audit_event
from backend.models import ChangeRequest, RiskFactor


def make_request(db, factors, title="Test request"):
    """A submitted request with risk factors already generated."""
    change_request = ChangeRequest(
        request_number=None,
        title=title,
        description="Synthetic test request",
        change_type="NEW_PRODUCT",
        product_type="Remittance",
        business_unit="Retail",
        customer_segment="Retail",
        requested_by="Business Owner",
        status="SUBMITTED",
        current_stage="REQUEST_CREATED",
    )
    db.add(change_request)
    db.flush()
    create_audit_event(db, change_request.id, "Business Owner", "CREATED_CHANGE_REQUEST")
    create_audit_event(db, change_request.id, "Business Owner", "CHANGE_REQUEST_SUBMITTED")
    for category, name in factors:
        db.add(RiskFactor(
            change_request_id=change_request.id,
            risk_category=category,
            risk_factor=name,
            factor_value="true",
            factor_score=0,
            factor_weight=0,
        ))
    db.commit()
    return change_request.id


def add_test_control(client, tokens, request_id, effectiveness_score=0):
    response = client.post(
        f"/change-requests/{request_id}/control",
        headers=tokens["RISK_ANALYST"],
        params={
            "control_name": "Sanctions screening",
            "control_category": "AML",
            "description": "Automated sanctions screening on onboarding",
            "control_type": "PREVENTIVE",
            "control_strength": "STRONG",
            "implemented": True,
            "implementation_status": "IMPLEMENTED",
            "owner": "FCRM",
            "effectiveness_score": effectiveness_score,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def advance_to_analyst_review(client, db, tokens, request_id):
    inherent = client.post(
        f"/change-requests/{request_id}/calculate-risk",
        headers=tokens["RISK_ANALYST"],
    )
    assert inherent.status_code == 200, inherent.text
    assert inherent.json()["residual_status"] == "PENDING_CONTROLS"

    add_test_control(client, tokens, request_id)

    response = client.post(
        f"/change-requests/{request_id}/calculate-risk",
        headers=tokens["RISK_ANALYST"],
    )
    assert response.status_code == 200, response.text
    # The AI step needs an external model; move the stage directly instead.
    change_request = db.get(ChangeRequest, request_id)
    db.refresh(change_request)
    change_request.current_stage = "ANALYST_REVIEW"
    create_audit_event(db, request_id, "System", "WORKFLOW_STAGE_CHANGED", new_value="ANALYST_REVIEW")
    db.commit()
    return response.json()


def analyst_review(client, tokens, request_id, rating, reason=""):
    return client.post(
        f"/change-requests/{request_id}/analyst-review",
        params={"analyst_rating": rating, "override_reason": reason},
        headers=tokens["RISK_ANALYST"],
    )


def decide(client, tokens, request_id, **body):
    body.setdefault("rationale", "Committee rationale.")
    return client.post(
        f"/change-requests/{request_id}/committee-decision",
        json=body,
        headers=tokens["RISK_COMMITTEE"],
    )


HIGH_RISK_FACTORS = [
    ("GEOGRAPHY", "Sanctions Exposure"),
    ("GEOGRAPHY", "High Risk Jurisdiction"),
    ("CUSTOMER", "PEP Exposure"),
]
LONG_REASON = "Controls evidenced in the vendor audit reduce practical exposure materially."


def test_escalated_downgrade_blocks_unconditional_approval(app_client, db_session, tokens):
    request_id = make_request(db_session, HIGH_RISK_FACTORS)
    assessment = advance_to_analyst_review(app_client, db_session, tokens, request_id)
    assert assessment["residual_rating"] == "HIGH"  # sanctions floor 65
    assert assessment["risk_model_version"] == "1.0"

    preview = app_client.get(
        f"/change-requests/{request_id}/override-preview",
        params={"analyst_rating": "LOW"},
        headers=tokens["RISK_ANALYST"],
    ).json()
    assert preview["escalation_level"] == "ESCALATED"

    short = analyst_review(app_client, tokens, request_id, "LOW", "too short")
    assert short.status_code == 400

    response = analyst_review(app_client, tokens, request_id, "LOW", LONG_REASON)
    assert response.status_code == 200, response.text
    assert response.json()["review"]["escalation_level"] == "ESCALATED"

    no_ack = decide(app_client, tokens, request_id, decision="APPROVE_WITH_CONDITIONS",
                    conditions=[{"description": "EDD on all PEP customers"}])
    assert no_ack.status_code == 400
    assert "Acknowledge" in no_ack.json()["detail"]

    blocked = decide(app_client, tokens, request_id, decision="APPROVE",
                     override_acknowledgement="Reviewed the analyst rationale.")
    assert blocked.status_code == 400
    assert "without conditions" in blocked.json()["detail"]

    ok = decide(
        app_client, tokens, request_id,
        decision="APPROVE_WITH_CONDITIONS",
        override_acknowledgement="Reviewed the analyst rationale.",
        conditions=[
            {"description": "EDD on all PEP customers", "due_date": "2026-12-31"},
            {"description": "Daily sanctions re-screening"},
        ],
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["change_request"]["status"] == "APPROVE_WITH_CONDITIONS"
    assert ok.json()["change_request"]["current_stage"] == "COMPLETED"

    review = app_client.get(
        f"/change-requests/{request_id}/analyst-review", headers=tokens["AUDITOR"]
    ).json()["review"]
    assert review["acknowledged_by"] == "Risk Committee"

    # Conditions: owner evidences, analyst verifies, request closes.
    conditions = app_client.get(
        f"/change-requests/{request_id}/conditions", headers=tokens["ADMIN"]
    ).json()["conditions"]
    assert [c["status"] for c in conditions] == ["OPEN", "OPEN"]

    for condition in conditions:
        assert app_client.post(
            f"/conditions/{condition['id']}/verify",
            json={"accepted": True},
            headers=tokens["RISK_ANALYST"],
        ).status_code == 400  # nothing submitted yet
        submitted = app_client.post(
            f"/conditions/{condition['id']}/evidence",
            json={"evidence_note": "Procedure updated and tested."},
            headers=tokens["ADMIN"],
        )
        assert submitted.status_code == 200, submitted.text

    rejected = app_client.post(
        f"/conditions/{conditions[0]['id']}/verify",
        json={"accepted": False, "note": "Attach the test results."},
        headers=tokens["RISK_ANALYST"],
    )
    assert rejected.json()["condition"]["status"] == "OPEN"
    app_client.post(
        f"/conditions/{conditions[0]['id']}/evidence",
        json={"evidence_note": "Test results attached."},
        headers=tokens["ADMIN"],
    )
    for condition in conditions:
        result = app_client.post(
            f"/conditions/{condition['id']}/verify",
            json={"accepted": True, "note": "Verified."},
            headers=tokens["RISK_ANALYST"],
        ).json()
    assert result["change_request_status"] == "CONDITIONS_MET"

    chain = app_client.get(
        f"/change-requests/{request_id}/audit-events/verify", headers=tokens["AUDITOR"]
    ).json()
    assert chain["valid"] is True
    actions = [
        e["action"]
        for e in app_client.get(
            f"/change-requests/{request_id}/audit-events", headers=tokens["AUDITOR"]
        ).json()["events"]
    ]
    for expected in (
        "OVERRIDE_ESCALATED", "OVERRIDE_ACKNOWLEDGED", "COMMITTEE_DECISION",
        "CONDITION_OPENED", "CONDITION_VERIFIED", "ALL_CONDITIONS_MET",
    ):
        assert expected in actions


def test_defer_to_business_owner_reopens_intake_and_new_revision(app_client, db_session, tokens):
    request_id = make_request(db_session, [("PRODUCT", "New Product")])
    advance_to_analyst_review(app_client, db_session, tokens, request_id)
    # A single new-product factor scores LOW; the analyst accepts it.
    assert analyst_review(app_client, tokens, request_id, "LOW").status_code == 200

    missing_target = decide(app_client, tokens, request_id, decision="DEFER")
    assert missing_target.status_code == 400

    deferred = decide(app_client, tokens, request_id, decision="DEFER",
                      deferred_to="BUSINESS_OWNER", rationale="Add transaction limits.")
    assert deferred.status_code == 200, deferred.text
    state = deferred.json()["change_request"]
    assert state == {"status": "RETURNED", "current_stage": "REQUEST_CREATED", "revision": 2}

    # Revision 2 starts clean: no current review or decision, history kept.
    review = app_client.get(f"/change-requests/{request_id}/analyst-review", headers=tokens["ADMIN"]).json()
    assert review["reviewed"] is False and len(review["history"]) == 1
    decision = app_client.get(f"/change-requests/{request_id}/committee-decision", headers=tokens["ADMIN"]).json()
    assert decision["decided"] is False and decision["history"][0]["deferred_to"] == "BUSINESS_OWNER"

    # Intake is editable again, so the owner can resubmit.
    change_request = db_session.get(ChangeRequest, request_id)
    db_session.refresh(change_request)
    from backend.permissions import is_submitted
    assert is_submitted(change_request) is False


def test_defer_to_analyst_and_reject(app_client, db_session, tokens):
    request_id = make_request(db_session, [("CHANNEL", "Mobile Banking")])
    advance_to_analyst_review(app_client, db_session, tokens, request_id)
    assert analyst_review(app_client, tokens, request_id, "LOW").status_code == 200
    deferred = decide(app_client, tokens, request_id, decision="DEFER", deferred_to="RISK_ANALYST")
    assert deferred.json()["change_request"]["current_stage"] == "ANALYST_REVIEW"

    # Analyst reviews revision 2, committee rejects: terminal.
    assert analyst_review(app_client, tokens, request_id, "HIGH", "Mule risk higher than modelled.").status_code == 200
    rejected = decide(app_client, tokens, request_id, decision="REJECT")
    assert rejected.json()["change_request"]["status"] == "REJECTED"
    assert decide(app_client, tokens, request_id, decision="APPROVE").status_code == 400

    timeline = app_client.get(f"/change-requests/{request_id}/cycle-time", headers=tokens["ADMIN"]).json()
    assert timeline["final_decision"] == "REJECT"
    assert timeline["deferrals"] == 1
    assert timeline["sla_status"] == "MET"


def test_missed_control_can_be_added_until_analyst_review_is_submitted(app_client, db_session, tokens):
    request_id = make_request(db_session, [("CHANNEL", "Mobile Banking")])
    advance_to_analyst_review(app_client, db_session, tokens, request_id)

    # Adding a missed control during analyst review recalculates residual risk
    # and returns the request to the risk step for the AI draft to be redone.
    add_test_control(app_client, tokens, request_id, effectiveness_score=90)
    recalculated = app_client.post(
        f"/change-requests/{request_id}/calculate-risk",
        headers=tokens["RISK_ANALYST"],
    )
    assert recalculated.status_code == 200, recalculated.text
    change_request = db_session.get(ChangeRequest, request_id)
    db_session.refresh(change_request)
    assert change_request.current_stage == "RISK_ASSESSMENT"

    # Once the analyst review is submitted, controls are locked.
    change_request.current_stage = "ANALYST_REVIEW"
    db_session.commit()
    assert analyst_review(app_client, tokens, request_id, "LOW").status_code == 200
    locked = app_client.post(
        f"/change-requests/{request_id}/control",
        headers=tokens["RISK_ANALYST"],
        params={
            "control_name": "Late control",
            "control_category": "AML",
            "description": "",
            "control_type": "PREVENTIVE",
            "control_strength": "MEDIUM",
            "implemented": True,
            "implementation_status": "IMPLEMENTED",
            "owner": "FCRM",
        },
    )
    assert locked.status_code == 400


def test_audit_chain_detects_tampering_and_is_append_only(app_client, db_session, tokens):
    from sqlalchemy import text

    request_id = make_request(db_session, [("PRODUCT", "New Product")])
    assert app_client.get(
        f"/change-requests/{request_id}/audit-events/verify", headers=tokens["AUDITOR"]
    ).json()["valid"]

    with pytest.raises(Exception):
        db_session.execute(text(
            "UPDATE audit_events SET reason = 'edited' WHERE change_request_id = :id"
        ), {"id": request_id})
    db_session.rollback()

    # Simulate someone bypassing the triggers entirely.
    db_session.execute(text("DROP TRIGGER audit_events_no_update"))
    db_session.execute(text(
        "UPDATE audit_events SET reason = 'edited' WHERE change_request_id = :id"
    ), {"id": request_id})
    db_session.commit()
    result = app_client.get(
        f"/change-requests/{request_id}/audit-events/verify", headers=tokens["AUDITOR"]
    ).json()
    assert result["valid"] is False
    assert "modified" in result["problems"][0]["issue"]

    from backend.audit import install_append_only_guards
    from backend.database import engine
    install_append_only_guards(engine)


def test_audit_pack_exports(app_client, db_session, tokens):
    request_id = make_request(db_session, HIGH_RISK_FACTORS, title="Export test")
    advance_to_analyst_review(app_client, db_session, tokens, request_id)

    pack = app_client.get(
        f"/change-requests/{request_id}/audit-export",
        params={"format": "json"},
        headers=tokens["AUDITOR"],
    )
    assert pack.status_code == 200
    body = pack.json()
    assert body["chain_verification"]["valid"] is True
    assert body["methodology"]["version"] == "1.0"
    assert body["framework_basis"]["categories"]
    assert all(f["framework_basis"] for f in body["risk_factors"])
    assert len(body["pack_digest_sha256"]) == 64

    csv_response = app_client.get(
        f"/change-requests/{request_id}/audit-export",
        params={"format": "csv"},
        headers=tokens["AUDITOR"],
    )
    assert csv_response.text.startswith("request_number,sequence")

    pdf = app_client.get(
        f"/change-requests/{request_id}/audit-export",
        params={"format": "pdf"},
        headers=tokens["AUDITOR"],
    )
    assert pdf.content[:4] == b"%PDF"

    assert app_client.get(
        f"/change-requests/{request_id}/audit-export",
        headers=tokens["BUSINESS_OWNER"],
    ).status_code == 403

    assert app_client.get("/audit/export", headers=tokens["AUDITOR"]).status_code == 200
    assert app_client.get("/audit/export", headers=tokens["RISK_ANALYST"]).status_code == 403


def test_methodology_maker_checker_and_versioned_scoring(app_client, db_session, tokens):
    analyst, analyst_2, committee = (
        tokens["RISK_ANALYST"], tokens["RISK_ANALYST_2"], tokens["RISK_COMMITTEE"]
    )
    active = app_client.get("/methodology/active", headers=analyst).json()
    config = active["config"]
    config["category_weights"]["FRAUD"] = 0.5
    bad = app_client.post("/methodology/versions", json={"config": config}, headers=analyst)
    assert bad.status_code == 400

    config["category_weights"].update({"FRAUD": 0.15, "CUSTOMER": 0.10})
    assert app_client.post(
        "/methodology/versions", json={"config": config}, headers=tokens["BUSINESS_OWNER"]
    ).status_code == 403

    draft = app_client.post(
        "/methodology/versions", json={"config": config}, headers=analyst
    ).json()
    assert draft["status"] == "DRAFT"

    assert app_client.put(
        f"/methodology/versions/{draft['id']}", json={"change_summary": "x"}, headers=analyst_2
    ).status_code == 403
    assert app_client.post(f"/methodology/versions/{draft['id']}/submit", headers=analyst).status_code == 400
    app_client.put(
        f"/methodology/versions/{draft['id']}",
        json={"change_summary": "Raise fraud weight after mule-account typology review."},
        headers=analyst,
    )
    assert app_client.post(f"/methodology/versions/{draft['id']}/submit", headers=analyst).status_code == 200

    impact = app_client.get(f"/methodology/versions/{draft['id']}/impact", headers=committee).json()
    assert impact["requests_rescored"] >= 1

    # An analyst cannot approve; the committee can.
    assert app_client.post(
        f"/methodology/versions/{draft['id']}/approve", json={}, headers=analyst_2
    ).status_code == 403
    approved = app_client.post(
        f"/methodology/versions/{draft['id']}/approve", json={"note": "Agreed."}, headers=committee
    ).json()
    assert approved["status"] == "ACTIVE"
    new_version = approved["version"]

    versions = app_client.get("/methodology/versions", headers=tokens["AUDITOR"]).json()["versions"]
    statuses = {v["version"]: v["status"] for v in versions}
    assert statuses["1.0"] == "RETIRED" and statuses[new_version] == "ACTIVE"

    request_id = make_request(db_session, [("FRAUD", "Rapid Movement Pattern")])
    assessment = advance_to_analyst_review(app_client, db_session, tokens, request_id)
    assert assessment["risk_model_version"] == new_version

    # Old assessments still explain under the version they were scored with.
    report = app_client.get(
        f"/change-requests/{request_id}/risk-methodology", headers=analyst
    ).json()
    assert report["methodology"]["version"] == new_version
    fraud = next(c for c in report["categories"] if c["category"] == "FRAUD")
    assert fraud["model_weight"] == 0.15
    assert fraud["framework_basis"]


def test_framework_endpoint_has_full_coverage(app_client, tokens):
    framework = app_client.get("/methodology/framework", headers=tokens["RISK_ANALYST"]).json()
    assert framework["coverage_gaps"] == []
    assert len(framework["categories"]) == 7
    assert all(c["references"] for c in framework["categories"])


def test_portfolio_cycle_time(app_client, tokens):
    data = app_client.get("/analytics/cycle-time", headers=tokens["ADMIN"]).json()
    assert data["summary"]["sla_target_hours"] > 0
    assert data["summary"]["decided_count"] >= 1
    assert data["overrides"]["escalated"] >= 1
