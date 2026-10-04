"""Similar-case retrieval and override learning analytics."""

import os

from backend.models import ChangeRequest, RiskAssessment
from tests.test_governance_workflow import (
    HIGH_RISK_FACTORS,
    LONG_REASON,
    advance_to_analyst_review,
    analyst_review,
    make_request,
)

os.environ.setdefault("MINIRISKERS_DISABLE_EMBEDDINGS", "1")


def _add_assessment(db, request_id, title_suffix="", inherent="HIGH"):
    scores = {
        "LOW": (15, 10, 12, 8, 5, 5, 3),
        "MEDIUM": (35, 30, 28, 25, 20, 15, 10),
        "HIGH": (70, 65, 72, 60, 45, 40, 30),
        "CRITICAL": (90, 88, 92, 85, 70, 65, 55),
    }
    customer, product, geography, transaction, channel, third_party, fraud = scores[inherent]
    assessment = RiskAssessment(
        change_request_id=request_id,
        risk_model_version="1.0",
        customer_risk_score=customer,
        product_risk_score=product,
        geography_risk_score=geography,
        transaction_risk_score=transaction,
        channel_risk_score=channel,
        third_party_risk_score=third_party,
        fraud_risk_score=fraud,
        inherent_score=geography,
        inherent_rating=inherent,
        residual_score=geography - 5,
        residual_rating=inherent,
        controls_assessed=True,
        residual_status="CALCULATED",
    )
    db.add(assessment)
    change_request = db.get(ChangeRequest, request_id)
    change_request.title = f"{change_request.title}{title_suffix}"
    db.commit()
    return assessment


def test_similar_cases_finds_related_request(app_client, db_session, tokens):
    source_id = make_request(
        db_session,
        [("GEOGRAPHY", "Cross Border"), ("PRODUCT", "Remittance")],
        title="Digital cross border remittance product",
    )
    change_request = db_session.get(ChangeRequest, source_id)
    change_request.description = (
        "International remittance for retail customers with cross border payments"
    )
    change_request.product_type = "Remittance"
    db_session.commit()
    _add_assessment(db_session, source_id)

    peer_id = make_request(
        db_session,
        [("GEOGRAPHY", "Cross Border"), ("TRANSACTION", "High Velocity")],
        title="Retail international remittance corridor",
    )
    peer = db_session.get(ChangeRequest, peer_id)
    peer.description = "Cross border remittance payments for retail banking customers"
    peer.product_type = "Remittance"
    db_session.commit()
    _add_assessment(db_session, peer_id)

    unrelated_id = make_request(
        db_session,
        [("PRODUCT", "Domestic Savings")],
        title="Domestic savings account upgrade",
    )
    unrelated = db_session.get(ChangeRequest, unrelated_id)
    unrelated.description = "Branch-only domestic savings product with no cross border activity"
    unrelated.product_type = "Savings"
    db_session.commit()
    _add_assessment(db_session, unrelated_id, inherent="LOW")

    response = app_client.get(
        f"/change-requests/{source_id}/similar-cases",
        headers=tokens["RISK_ANALYST"],
        params={"limit": 3},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["similarity_method"] == "token_overlap"
    ids = [item["change_request_id"] for item in payload["cases"]]
    assert peer_id in ids
    assert source_id not in ids
    assert payload["cases"][0]["system_rating"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}



def test_similar_cases_calculated_once_until_refreshed(
    app_client, db_session, tokens, monkeypatch
):
    import backend.governance_routes as routes

    source_id = make_request(
        db_session,
        [("GEOGRAPHY", "Cross Border")],
        title="Cached cross border remittance product",
    )
    _add_assessment(db_session, source_id)
    peer_id = make_request(
        db_session,
        [("GEOGRAPHY", "Cross Border")],
        title="Cached cross border remittance corridor",
    )
    _add_assessment(db_session, peer_id)

    calls = []
    real_find = routes.find_similar_cases

    def counting_find(*args, **kwargs):
        calls.append(1)
        return real_find(*args, **kwargs)

    monkeypatch.setattr(routes, "find_similar_cases", counting_find)

    def fetch(**params):
        response = app_client.get(
            f"/change-requests/{source_id}/similar-cases",
            headers=tokens["RISK_ANALYST"],
            params={"limit": 3, **params},
        )
        assert response.status_code == 200, response.text
        return response.json()

    first = fetch()
    assert first["cases"]
    assert len(calls) == 1

    second = fetch()
    assert len(calls) == 1
    assert second["cases"] == first["cases"]
    assert second["calculated_at"] == first["calculated_at"]

    fetch(refresh=True)
    assert len(calls) == 2


def test_similar_cases_requires_readable_request(app_client, db_session, tokens):
    request_id = make_request(db_session, HIGH_RISK_FACTORS)
    _add_assessment(db_session, request_id)

    denied = app_client.get(
        f"/change-requests/{request_id}/similar-cases",
        headers=tokens["BUSINESS_OWNER"],
    )
    assert denied.status_code == 403


def test_override_insights_summarizes_downgrades(app_client, db_session, tokens):
    request_id = make_request(db_session, HIGH_RISK_FACTORS)
    advance_to_analyst_review(app_client, db_session, tokens, request_id)
    assert analyst_review(
        app_client,
        tokens,
        request_id,
        "LOW",
        LONG_REASON,
    ).status_code == 200

    response = app_client.get(
        "/analytics/override-insights",
        headers=tokens["RISK_ANALYST"],
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["summary"]["downgrades"] >= 1
    assert payload["by_category"]
    assert any(item["downgrade_correlation"] >= 1 for item in payload["by_category"])
    assert payload["top_factors_in_downgrades"]


def test_override_insights_blocked_for_business_owner(app_client, tokens):
    response = app_client.get(
        "/analytics/override-insights",
        headers=tokens["BUSINESS_OWNER"],
    )
    assert response.status_code == 403
