"""Override analytics — surfaces where analysts disagree with the system.

Used as a feedback loop for methodology tuning: which categories and factors
correlate with downgrades, and what draft weight changes the risk function
might consider (always through maker-checker approval).
"""

from __future__ import annotations

from collections import Counter, defaultdict

from sqlalchemy.orm import Session

from backend.methodology_store import get_active_methodology
from backend.models import AnalystOverride, ChangeRequest, RiskAssessment, RiskFactor, User
from backend.permissions import filter_change_requests_for_user
from risk_engine.methodology import CATEGORIES

CATEGORY_SCORE_FIELDS = {
    "CUSTOMER": "customer_risk_score",
    "PRODUCT": "product_risk_score",
    "GEOGRAPHY": "geography_risk_score",
    "TRANSACTION": "transaction_risk_score",
    "CHANNEL": "channel_risk_score",
    "THIRD_PARTY": "third_party_risk_score",
    "FRAUD": "fraud_risk_score",
}


def _category_scores(assessment: RiskAssessment) -> list[tuple[str, float]]:
    scores = []
    for category in CATEGORIES:
        field = CATEGORY_SCORE_FIELDS[category]
        value = getattr(assessment, field, None)
        scores.append((category, float(value or 0)))
    scores.sort(key=lambda item: item[1], reverse=True)
    return scores


def _latest_assessment(db: Session, change_request_id: int) -> RiskAssessment | None:
    return (
        db.query(RiskAssessment)
        .filter(RiskAssessment.change_request_id == change_request_id)
        .order_by(RiskAssessment.id.desc())
        .first()
    )


def _load_portfolio(
    db: Session,
    current_user: User,
) -> tuple[list[ChangeRequest], list[AnalystOverride], list[RiskAssessment]]:
    requests = (
        filter_change_requests_for_user(current_user, db.query(ChangeRequest))
        .order_by(ChangeRequest.id.desc())
        .all()
    )
    if not requests:
        return [], [], []

    ids = [item.id for item in requests]
    reviews = (
        db.query(AnalystOverride)
        .filter(AnalystOverride.change_request_id.in_(ids))
        .order_by(AnalystOverride.id.asc())
        .all()
    )
    assessments = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.change_request_id.in_(ids))
        .order_by(RiskAssessment.id.asc())
        .all()
    )
    return requests, reviews, assessments


def _assessment_for_review(
    review: AnalystOverride,
    assessments_by_request: dict[int, list[RiskAssessment]],
) -> RiskAssessment | None:
    if review.risk_assessment_id:
        for assessment in assessments_by_request.get(review.change_request_id, []):
            if assessment.id == review.risk_assessment_id:
                return assessment
    items = assessments_by_request.get(review.change_request_id, [])
    return items[-1] if items else None


def _suggest_methodology_changes(
    category_downgrade_hits: Counter,
    factor_downgrade_hits: Counter,
    downgrade_count: int,
    config: dict,
) -> list[dict]:
    suggestions = []
    if downgrade_count == 0:
        return suggestions

    weights = config.get("category_weights", {})
    for category, hits in category_downgrade_hits.most_common(3):
        share = hits / downgrade_count
        if share < 0.4 or hits < 2:
            continue
        current = float(weights.get(category, 0))
        suggestions.append(
            {
                "type": "weight_increase",
                "category": category,
                "current_weight": round(current, 3),
                "suggested_weight": round(min(current + 0.03, 0.35), 3),
                "reason": (
                    f"{category} was a top contributor in {hits} of {downgrade_count} "
                    f"analyst downgrade(s) ({round(share * 100)}%)."
                ),
                "confidence": "high" if share >= 0.6 else "medium",
            }
        )

    for (category, factor), hits in factor_downgrade_hits.most_common(3):
        share = hits / downgrade_count
        if hits < 2 or share < 0.35:
            continue
        suggestions.append(
            {
                "type": "factor_review",
                "category": category,
                "factor": factor,
                "reason": (
                    f"Factor present in {hits} of {downgrade_count} downgrade(s) "
                    f"({round(share * 100)}%). Review score/weight in methodology."
                ),
                "confidence": "high" if share >= 0.5 else "medium",
            }
        )

    return suggestions[:5]


def build_override_insights(db: Session, current_user: User) -> dict:
    _, config = get_active_methodology(db)
    requests, reviews, assessments = _load_portfolio(db, current_user)

    assessments_by_request: dict[int, list[RiskAssessment]] = defaultdict(list)
    for assessment in assessments:
        assessments_by_request[assessment.change_request_id].append(assessment)

    assessed_count = sum(
        1
        for request in requests
        if any(item.inherent_rating for item in assessments_by_request.get(request.id, []))
    )

    downgrade_reviews = [
        review for review in reviews if (review.override_direction or "") == "DOWNGRADE"
    ]
    upgrade_reviews = [
        review for review in reviews if (review.override_direction or "") == "UPGRADE"
    ]

    category_downgrade_hits: Counter = Counter()
    category_assessment_totals: Counter = Counter()
    factor_downgrade_hits: Counter = Counter()

    for request in requests:
        assessment = _latest_assessment(db, request.id)
        if assessment is None or assessment.inherent_rating is None:
            continue
        top_categories = [name for name, _ in _category_scores(assessment)[:2]]
        for category in top_categories:
            category_assessment_totals[category] += 1

    for review in downgrade_reviews:
        assessment = _assessment_for_review(review, assessments_by_request)
        if assessment is None:
            continue
        for category, _ in _category_scores(assessment)[:2]:
            category_downgrade_hits[category] += 1

        factors = (
            db.query(RiskFactor)
            .filter(RiskFactor.change_request_id == review.change_request_id)
            .all()
        )
        for factor in factors:
            factor_downgrade_hits[(factor.risk_category, factor.risk_factor)] += 1

    by_category = []
    for category in CATEGORIES:
        total = category_assessment_totals[category]
        downgrades = category_downgrade_hits[category]
        by_category.append(
            {
                "category": category,
                "assessments_as_top_driver": total,
                "downgrade_correlation": downgrades,
                "downgrade_rate_pct": round(downgrades / total * 100, 1)
                if total
                else None,
            }
        )
    by_category.sort(
        key=lambda item: (item["downgrade_correlation"], item["assessments_as_top_driver"]),
        reverse=True,
    )

    top_factors = [
        {
            "category": category,
            "factor": factor,
            "downgrade_count": count,
        }
        for (category, factor), count in factor_downgrade_hits.most_common(8)
    ]

    suggestions = _suggest_methodology_changes(
        category_downgrade_hits,
        factor_downgrade_hits,
        len(downgrade_reviews),
        config,
    )

    return {
        "summary": {
            "assessed_requests": assessed_count,
            "analyst_reviews": len(reviews),
            "downgrades": len(downgrade_reviews),
            "upgrades": len(upgrade_reviews),
            "accepted": len(reviews)
            - len(downgrade_reviews)
            - len(upgrade_reviews),
        },
        "by_category": by_category,
        "top_factors_in_downgrades": top_factors,
        "methodology_suggestions": suggestions,
        "active_methodology_version": config.get("version"),
    }
