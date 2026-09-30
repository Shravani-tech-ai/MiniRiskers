from sqlalchemy.orm import Session

from backend.methodology_store import get_active_methodology
from backend.models import (
    Control,
    RiskFactor,
    RiskAssessment
)
from risk_engine.methodology import score_factors


RESIDUAL_PENDING = "PENDING_CONTROLS"
RESIDUAL_CALCULATED = "CALCULATED"


def count_controls(db: Session, change_request_id: int) -> int:
    return (
        db.query(Control)
        .filter(Control.change_request_id == change_request_id)
        .count()
    )


def is_residual_calculated(assessment: RiskAssessment) -> bool:
    status = getattr(assessment, "residual_status", None)
    if status:
        return status == RESIDUAL_CALCULATED
    return assessment.residual_score is not None


# ============================================================
# MINI RISKERS RISK MODEL
# ============================================================
# Weights, bands, floors and factor scores come from the ACTIVE
# methodology version (see risk_engine/methodology.py), so the risk
# function can tune them without code changes. The pure scoring maths
# lives in risk_engine.methodology.score_factors.


def calculate_control_effectiveness(
    db: Session,
    change_request_id: int
) -> float:

    controls = (
        db.query(Control)
        .filter(Control.change_request_id == change_request_id)
        .all()
    )

    effectiveness_scores = [
        control.effectiveness_score
        for control in controls
        if control.effectiveness_score is not None
    ]

    if not effectiveness_scores:
        return 0.0

    return round(
        sum(effectiveness_scores) / len(effectiveness_scores),
        2
    )


def factor_rows_to_inputs(factors: list[RiskFactor]) -> list[dict]:
    return [
        {
            "category": factor.risk_category,
            "name": factor.risk_factor,
            "score": factor.factor_score,
            "weight": factor.factor_weight,
        }
        for factor in factors
    ]


def generate_risk_assessment(
    db: Session,
    change_request_id: int,
    revision: int = 1,
):
    methodology_row, config = get_active_methodology(db)

    factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .all()
    )

    controls_count = count_controls(db, change_request_id)
    control_effectiveness = calculate_control_effectiveness(
        db,
        change_request_id,
    )

    result = score_factors(
        factor_rows_to_inputs(factors),
        control_effectiveness,
        config,
    )
    category_scores = result["category_scores"]
    controls_assessed = controls_count > 0

    assessment = RiskAssessment(
        change_request_id=change_request_id,

        risk_model_version=config["version"],
        methodology_version_id=methodology_row.id,
        revision=revision,

        customer_risk_score=category_scores["CUSTOMER"],
        product_risk_score=category_scores["PRODUCT"],
        geography_risk_score=category_scores["GEOGRAPHY"],
        transaction_risk_score=category_scores["TRANSACTION"],
        channel_risk_score=category_scores["CHANNEL"],
        third_party_risk_score=category_scores["THIRD_PARTY"],
        fraud_risk_score=category_scores["FRAUD"],

        inherent_score=result["inherent_score"],
        inherent_rating=result["inherent_rating"],

        control_adjustment=(
            result["control_effectiveness"] if controls_assessed else None
        ),
        controls_assessed=controls_assessed,
        residual_status=(
            RESIDUAL_CALCULATED if controls_assessed else RESIDUAL_PENDING
        ),

        residual_score=(
            result["residual_score"] if controls_assessed else None
        ),
        residual_rating=(
            result["residual_rating"] if controls_assessed else None
        ),

        ai_recommendation="REQUIRES_FCRM_REVIEW",

        analyst_rating=None,
        final_rating=None,

        assessment_status="DRAFT"
    )

    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return assessment
