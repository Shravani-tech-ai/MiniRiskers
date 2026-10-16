"""Learning from human decisions.

Two loops, both governed:

1. Calibration ("training"): an Admin runs a regression of the analyst's
   final rating on the per-category risk scores of decided cases. The
   result is a *suggested* set of category weights with before/after
   agreement metrics. It never changes scoring directly: the Admin shares
   it with the Risk Committee, who may start a methodology draft from it,
   which an Admin then approves (maker-checker).

2. Examples for the AI: the most similar decided cases (system rating,
   analyst rating and reason, committee decision) are added to the AI
   assessment prompt so its narrative reflects how the bank has actually
   judged comparable changes. Scores stay deterministic.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy.orm import Session

from backend.methodology_store import get_active_methodology
from backend.models import (
    AIFeedback,
    AIRecommendation,
    AnalystOverride,
    ChangeRequest,
    CommitteeDecision,
    RiskAssessment,
    RiskFactor,
    TrainingRun,
)
from backend.system_settings import get_all_settings
from risk_engine.methodology import (
    CATEGORIES,
    RATINGS,
    rating_band_ranges,
    score_factors,
)
from risk_engine.risk_calculator import (
    calculate_category_effectiveness,
    factor_rows_to_inputs,
)

# Structured override reasons captured with every analyst override.
OVERRIDE_REASON_CODES = {
    "CONTROL_STRONGER_THAN_SCORED": "Controls are stronger than scored",
    "CONTROL_WEAKER_THAN_SCORED": "Controls are weaker than scored",
    "FACTOR_OVERSTATED": "A risk factor is overstated",
    "FACTOR_UNDERSTATED": "A risk factor is understated / missing",
    "GEOGRAPHY_MISSCORED": "Geography exposure is mis-scored",
    "CUSTOMER_PROFILE_CONTEXT": "Customer profile context not captured",
    "REGULATORY_EXPECTATION": "Regulatory expectation requires a different rating",
    "CONCENTRATION_NOT_CAPTURED": "Risk concentration not captured",
    "OTHER": "Other (explained in the reason)",
}

FINAL_STATUSES = {"APPROVED", "APPROVE_WITH_CONDITIONS", "CONDITIONS_MET", "REJECTED"}
CATEGORY_SCORE_FIELDS = {
    "CUSTOMER": "customer_risk_score",
    "PRODUCT": "product_risk_score",
    "GEOGRAPHY": "geography_risk_score",
    "TRANSACTION": "transaction_risk_score",
    "CHANNEL": "channel_risk_score",
    "THIRD_PARTY": "third_party_risk_score",
    "FRAUD": "fraud_risk_score",
}


# ---------------------------------------------------------------------------
# Decided-case dataset
# ---------------------------------------------------------------------------

def _latest(db: Session, model, change_request_id: int):
    return (
        db.query(model)
        .filter(model.change_request_id == change_request_id)
        .order_by(model.id.desc())
        .first()
    )


def _closed_at(db: Session, change_request: ChangeRequest):
    if change_request.closed_at:
        return change_request.closed_at
    decision = _latest(db, CommitteeDecision, change_request.id)
    return decision.created_at if decision else change_request.created_at


def decided_cases(
    db: Session,
    max_cases: int = 0,
    lookback_days: int = 0,
) -> list[dict]:
    """Completed requests with a final human rating, newest first."""
    requests = (
        db.query(ChangeRequest)
        .filter(
            ChangeRequest.current_stage == "COMPLETED",
            ChangeRequest.status.in_(list(FINAL_STATUSES)),
        )
        .all()
    )
    cutoff = (
        datetime.utcnow() - timedelta(days=lookback_days) if lookback_days else None
    )
    cases = []
    for change_request in requests:
        assessment = (
            db.query(RiskAssessment)
            .filter(
                RiskAssessment.change_request_id == change_request.id,
                RiskAssessment.final_rating.isnot(None),
                RiskAssessment.residual_score.isnot(None),
            )
            .order_by(RiskAssessment.id.desc())
            .first()
        )
        if assessment is None or assessment.final_rating not in RATINGS:
            continue
        closed_at = _closed_at(db, change_request)
        if cutoff and closed_at and closed_at < cutoff:
            continue
        cases.append({
            "change_request": change_request,
            "assessment": assessment,
            "review": _latest(db, AnalystOverride, change_request.id),
            "decision": _latest(db, CommitteeDecision, change_request.id),
            "closed_at": closed_at,
        })
    cases.sort(key=lambda case: case["closed_at"] or datetime.min, reverse=True)
    if max_cases:
        cases = cases[:max_cases]
    return cases


def _band_midpoints(config: dict) -> dict:
    return {
        band["rating"]: (band["min"] + band["max"]) / 2
        for band in rating_band_ranges(config)
    }


def _rescore(db: Session, case: dict, config: dict) -> str:
    factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == case["change_request"].id)
        .all()
    )
    result = score_factors(
        factor_rows_to_inputs(factors),
        case["assessment"].control_adjustment or 0,
        config,
        calculate_category_effectiveness(db, case["change_request"].id),
    )
    return result["residual_rating"]


def _agreement(predicted: list[str], actual: list[str]) -> dict:
    if not actual:
        return {"exact": None, "within_one_band": None}
    exact = sum(p == a for p, a in zip(predicted, actual))
    near = sum(
        abs(RATINGS.index(p) - RATINGS.index(a)) <= 1
        for p, a in zip(predicted, actual)
    )
    return {
        "exact": round(exact / len(actual) * 100, 1),
        "within_one_band": round(near / len(actual) * 100, 1),
    }


def _normalize(weights: np.ndarray) -> dict:
    weights = np.clip(weights, 0, None)
    if weights.sum() <= 0:
        weights = np.ones(len(CATEGORIES))
    weights = weights / weights.sum()
    rounded = [round(float(w), 3) for w in weights]
    # Make the rounded weights sum to exactly 1 for validation.
    drift = round(1 - sum(rounded), 3)
    rounded[int(np.argmax(rounded))] = round(rounded[int(np.argmax(rounded))] + drift, 3)
    return dict(zip(CATEGORIES, rounded))


def fit_category_weights(
    features: np.ndarray,
    targets: np.ndarray,
    prior: np.ndarray,
    prior_strength: float,
) -> np.ndarray:
    """Ridge regression pulled towards the current weights.

    Minimises ||Xw - y||^2 + a||w - w0||^2. With few cases `a` is large and
    the suggestion stays close to today's weights; it relaxes as data grows.
    """
    gram = features.T @ features
    alpha = max(np.trace(gram) / len(prior), 1e-6) * prior_strength
    lhs = gram + alpha * np.eye(len(prior))
    rhs = features.T @ targets + alpha * prior
    return np.linalg.solve(lhs, rhs)


def run_training(db: Session, actor: str, user_id: int) -> TrainingRun:
    settings = get_all_settings(db)
    min_cases = settings["training_min_cases"]
    parameters = {
        "min_cases": min_cases,
        "max_cases": settings["training_max_cases"],
        "lookback_days": settings["training_lookback_days"],
        "method": "Ridge linear regression of final rating on control-adjusted category scores",
    }
    active_row, config = get_active_methodology(db)
    current = config["category_weights"]
    cases = decided_cases(db, settings["training_max_cases"], settings["training_lookback_days"])

    run = TrainingRun(
        cases_used=len(cases),
        parameters_json=json.dumps(parameters),
        current_weights_json=json.dumps(current),
        methodology_version=active_row.version,
        created_by=actor,
        created_by_user_id=user_id,
    )

    if len(cases) < min_cases:
        run.status = "INSUFFICIENT_DATA"
        run.message = (
            f"Only {len(cases)} decided case(s) match the training window; "
            f"at least {min_cases} are needed. Lower the minimum in settings "
            "or wait for more decisions."
        )
        db.add(run)
        db.commit()
        return run

    midpoints = _band_midpoints(config)
    features, targets = [], []
    for case in cases:
        assessment = case["assessment"]
        mitigation = 1 - float(assessment.control_adjustment or 0) / 100
        features.append([
            float(getattr(assessment, CATEGORY_SCORE_FIELDS[c]) or 0) * mitigation
            for c in CATEGORIES
        ])
        targets.append(midpoints[assessment.final_rating])
    features = np.array(features)
    targets = np.array(targets)
    prior = np.array([current[c] for c in CATEGORIES])

    raw = fit_category_weights(features, targets, prior, prior_strength=min_cases / len(cases))
    suggested = _normalize(raw)

    suggested_config = {**config, "category_weights": suggested}
    actual = [case["assessment"].final_rating for case in cases]
    before = [_rescore(db, case, config) for case in cases]
    after = [_rescore(db, case, suggested_config) for case in cases]

    directions = Counter(
        (case["review"].override_direction or "NONE") if case["review"] else "NONE"
        for case in cases
    )
    reason_codes = Counter(
        case["review"].override_reason_code
        for case in cases
        if case["review"] and case["review"].override_reason_code
    )
    metrics = {
        "agreement_current": _agreement(before, actual),
        "agreement_suggested": _agreement(after, actual),
        "override_directions": dict(directions),
        "override_reason_codes": dict(reason_codes),
        "weight_changes": {
            c: round(suggested[c] - current[c], 3) for c in CATEGORIES
        },
        "note": (
            "Agreement is measured on the same cases the weights were fitted "
            "on, so it is optimistic. Use it to compare, not as a forecast."
        ),
    }
    run.status = "COMPLETED"
    run.suggested_weights_json = json.dumps(suggested)
    run.metrics_json = json.dumps(metrics)
    improved = metrics["agreement_suggested"]["exact"] - metrics["agreement_current"]["exact"]
    run.message = (
        f"Fitted on {len(cases)} decided cases. Exact agreement with final "
        f"ratings {metrics['agreement_current']['exact']}% now vs "
        f"{metrics['agreement_suggested']['exact']}% with the suggested weights "
        f"({improved:+.1f} points)."
    )
    db.add(run)
    db.commit()
    return run


def serialize_run(run: TrainingRun) -> dict:
    def load(value):
        return json.loads(value) if value else None

    return {
        "id": run.id,
        "status": run.status,
        "cases_used": run.cases_used,
        "parameters": load(run.parameters_json),
        "current_weights": load(run.current_weights_json),
        "suggested_weights": load(run.suggested_weights_json),
        "metrics": load(run.metrics_json),
        "message": run.message,
        "methodology_version": run.methodology_version,
        "created_by": run.created_by,
        "created_at": run.created_at,
        "shared_at": run.shared_at,
        "shared_by": run.shared_by,
        "adopted_methodology_version_id": run.adopted_methodology_version_id,
    }


# ---------------------------------------------------------------------------
# Examples for the AI prompt
# ---------------------------------------------------------------------------

def learned_examples(db: Session, change_request_id: int) -> list[dict]:
    settings = get_all_settings(db)
    if not settings["ai_learning_enabled"]:
        return []
    from backend.similar_cases import _embed_text, _similarity, build_case_profile

    source_profile = build_case_profile(db, change_request_id)
    if len(source_profile.split()) < 3:
        return []
    source_vector = _embed_text(source_profile)

    candidates = [
        case
        for case in decided_cases(
            db, settings["training_max_cases"], settings["training_lookback_days"]
        )
        if case["change_request"].id != change_request_id
    ]
    scored = []
    for case in candidates:
        profile = build_case_profile(db, case["change_request"].id)
        if not profile.strip():
            continue
        vector = _embed_text(profile) if source_vector is not None else None
        scored.append((_similarity(source_profile, profile, source_vector, vector), case))
    scored.sort(key=lambda item: item[0], reverse=True)

    examples = []
    for similarity, case in scored[: settings["ai_learning_examples"]]:
        change_request, review, decision = (
            case["change_request"], case["review"], case["decision"]
        )
        examples.append({
            "request": change_request.request_number or f"CR-{change_request.id}",
            "title": change_request.title,
            "product_type": change_request.product_type,
            "similarity_percent": round(similarity * 100, 1),
            "system_residual_rating": case["assessment"].residual_rating,
            "analyst_final_rating": case["assessment"].final_rating,
            "override_direction": review.override_direction if review else "NONE",
            "override_reason_code": review.override_reason_code if review else None,
            "override_reason": (review.override_reason or "")[:400] if review else "",
            "committee_decision": decision.decision if decision else None,
            "committee_rationale": (decision.rationale or "")[:400] if decision else "",
        })
    return examples


# ---------------------------------------------------------------------------
# Model performance (Admin)
# ---------------------------------------------------------------------------

def model_performance(db: Session) -> dict:
    cases = decided_cases(db)
    by_month = defaultdict(lambda: {"cases": 0, "agree": 0})
    category_overrides = defaultdict(lambda: {"UPGRADE": 0, "DOWNGRADE": 0})
    agree = 0
    for case in cases:
        assessment = case["assessment"]
        matched = assessment.residual_rating == assessment.final_rating
        agree += matched
        month = (case["closed_at"] or datetime.utcnow()).strftime("%Y-%m")
        by_month[month]["cases"] += 1
        by_month[month]["agree"] += matched
        review = case["review"]
        if review and review.override_direction in {"UPGRADE", "DOWNGRADE"}:
            top = max(
                CATEGORIES,
                key=lambda c: getattr(assessment, CATEGORY_SCORE_FIELDS[c]) or 0,
            )
            category_overrides[top][review.override_direction] += 1

    reviews = db.query(AnalystOverride).all()
    directions = Counter(r.override_direction or "NONE" for r in reviews)
    reason_codes = Counter(r.override_reason_code for r in reviews if r.override_reason_code)

    feedback = db.query(AIFeedback).all()
    helpful = sum(1 for item in feedback if item.helpful)
    reasons = Counter(item.reason for item in feedback if item.reason and not item.helpful)
    models = Counter(
        row.model_version or "unknown" for row in db.query(AIRecommendation.model_version)
    )

    return {
        "decided_cases": len(cases),
        "system_vs_final_agreement": (
            round(agree / len(cases) * 100, 1) if cases else None
        ),
        "agreement_by_month": [
            {
                "month": month,
                "cases": values["cases"],
                "agreement": round(values["agree"] / values["cases"] * 100, 1),
            }
            for month, values in sorted(by_month.items())
        ],
        "reviews_total": len(reviews),
        "override_directions": dict(directions),
        "override_reason_codes": [
            {"code": code, "label": OVERRIDE_REASON_CODES.get(code, code), "count": count}
            for code, count in reason_codes.most_common()
        ],
        "overrides_by_top_category": [
            {"category": category, **values}
            for category, values in sorted(category_overrides.items())
        ],
        "ai_feedback": {
            "total": len(feedback),
            "helpful": helpful,
            "helpful_rate": round(helpful / len(feedback) * 100, 1) if feedback else None,
            "not_helpful_reasons": dict(reasons),
        },
        "ai_models_used": dict(models),
    }
