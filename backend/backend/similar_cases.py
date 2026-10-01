"""Similar-case retrieval for assessment consistency.

Embeds change-request intake profiles (same model as the RAG pipeline) and
returns the closest prior assessments the analyst can compare against. Falls
back to token overlap when embeddings are unavailable (e.g. offline tests).
"""

from __future__ import annotations

import math
import os
import re
from functools import lru_cache
from typing import Optional

from sqlalchemy.orm import Session

from backend.models import (
    AnalystOverride,
    ChangeRequest,
    CommitteeDecision,
    Product,
    RiskAssessment,
    RiskFactor,
    User,
)
from backend.permissions import filter_change_requests_for_user

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

CATEGORY_SCORE_FIELDS = {
    "CUSTOMER": "customer_risk_score",
    "PRODUCT": "product_risk_score",
    "GEOGRAPHY": "geography_risk_score",
    "TRANSACTION": "transaction_risk_score",
    "CHANNEL": "channel_risk_score",
    "THIRD_PARTY": "third_party_risk_score",
    "FRAUD": "fraud_risk_score",
}


def build_case_profile(db: Session, change_request_id: int) -> str:
    change_request = db.get(ChangeRequest, change_request_id)
    if not change_request:
        return ""

    parts = [
        change_request.title or "",
        change_request.description or "",
        change_request.product_type or "",
        change_request.business_unit or "",
        change_request.customer_segment or "",
        change_request.change_type or "",
    ]

    product = (
        db.query(Product)
        .filter(Product.change_request_id == change_request_id)
        .first()
    )
    if product:
        parts.extend(
            [
                product.product_name or "",
                product.product_category or "",
                product.product_description or "",
            ]
        )

    factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .order_by(RiskFactor.id.asc())
        .limit(25)
        .all()
    )
    for factor in factors:
        parts.append(
            f"{factor.risk_category} {factor.risk_factor} {factor.factor_value or ''}"
        )

    return " ".join(part.strip() for part in parts if part and part.strip())


def _token_similarity(left: str, right: str) -> float:
    tokens_left = set(re.findall(r"[a-z0-9]+", left.lower()))
    tokens_right = set(re.findall(r"[a-z0-9]+", right.lower()))
    if not tokens_left or not tokens_right:
        return 0.0
    union = tokens_left | tokens_right
    return len(tokens_left & tokens_right) / len(union)


@lru_cache(maxsize=1)
def _get_embedding_model():
    if os.environ.get("MINIRISKERS_DISABLE_EMBEDDINGS") == "1":
        return None
    try:
        from langchain_huggingface import HuggingFaceEmbeddings

        return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    except Exception:
        return None


def _embed_text(text: str) -> Optional[list[float]]:
    model = _get_embedding_model()
    if model is None or not text.strip():
        return None
    return model.embed_query(text)


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(a * a for a in left))
    norm_right = math.sqrt(sum(b * b for b in right))
    if norm_left == 0 or norm_right == 0:
        return 0.0
    return dot / (norm_left * norm_right)


def _similarity(
    profile_a: str,
    profile_b: str,
    vector_a: Optional[list[float]] = None,
    vector_b: Optional[list[float]] = None,
) -> float:
    if vector_a is not None and vector_b is not None:
        return _cosine_similarity(vector_a, vector_b)
    return _token_similarity(profile_a, profile_b)


def _latest_assessment(db: Session, change_request_id: int) -> Optional[RiskAssessment]:
    return (
        db.query(RiskAssessment)
        .filter(RiskAssessment.change_request_id == change_request_id)
        .order_by(RiskAssessment.id.desc())
        .first()
    )


def _latest_review(db: Session, change_request_id: int) -> Optional[AnalystOverride]:
    return (
        db.query(AnalystOverride)
        .filter(AnalystOverride.change_request_id == change_request_id)
        .order_by(AnalystOverride.id.desc())
        .first()
    )


def _latest_decision(db: Session, change_request_id: int) -> Optional[CommitteeDecision]:
    return (
        db.query(CommitteeDecision)
        .filter(CommitteeDecision.change_request_id == change_request_id)
        .order_by(CommitteeDecision.id.desc())
        .first()
    )


def _serialize_case(
    db: Session,
    change_request: ChangeRequest,
    assessment: RiskAssessment,
    similarity: float,
    method: str,
) -> dict:
    review = _latest_review(db, change_request.id)
    decision = _latest_decision(db, change_request.id)
    return {
        "change_request_id": change_request.id,
        "request_number": change_request.request_number,
        "title": change_request.title,
        "product_type": change_request.product_type,
        "business_unit": change_request.business_unit,
        "customer_segment": change_request.customer_segment,
        "similarity": round(similarity * 100, 1),
        "similarity_method": method,
        "system_rating": assessment.inherent_rating,
        "residual_rating": assessment.residual_rating,
        "analyst_rating": review.analyst_rating if review else assessment.analyst_rating,
        "final_rating": assessment.final_rating,
        "committee_decision": decision.decision if decision else None,
        "override_direction": review.override_direction if review else None,
        "status": change_request.status,
        "current_stage": change_request.current_stage,
    }


def find_similar_cases(
    db: Session,
    change_request_id: int,
    current_user: User,
    limit: int = 3,
) -> dict:
    source = db.get(ChangeRequest, change_request_id)
    if not source:
        raise ValueError("Change request not found")

    source_profile = build_case_profile(db, change_request_id)
    if len(source_profile.split()) < 3:
        return {
            "query_change_request_id": change_request_id,
            "similarity_method": "none",
            "cases": [],
            "message": "Add more intake detail (title, description, product) to find similar cases.",
        }

    source_vector = _embed_text(source_profile)
    method = "embedding" if source_vector is not None else "token_overlap"

    candidates = (
        filter_change_requests_for_user(
            current_user,
            db.query(ChangeRequest).filter(ChangeRequest.id != change_request_id),
        )
        .join(RiskAssessment, RiskAssessment.change_request_id == ChangeRequest.id)
        .filter(RiskAssessment.inherent_rating.isnot(None))
        .distinct()
        .all()
    )

    scored = []
    for candidate in candidates:
        profile = build_case_profile(db, candidate.id)
        if not profile.strip():
            continue
        candidate_vector = _embed_text(profile) if source_vector is not None else None
        score = _similarity(source_profile, profile, source_vector, candidate_vector)
        assessment = _latest_assessment(db, candidate.id)
        if assessment is None:
            continue
        scored.append((score, candidate, assessment))

    scored.sort(key=lambda item: item[0], reverse=True)
    top = scored[: max(1, min(limit, 10))]

    return {
        "query_change_request_id": change_request_id,
        "similarity_method": method,
        "cases": [
            _serialize_case(db, candidate, assessment, score, method)
            for score, candidate, assessment in top
        ],
    }
