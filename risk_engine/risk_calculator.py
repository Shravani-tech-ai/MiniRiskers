from sqlalchemy.orm import Session

from backend.models import (
    Product,
    CustomerProfile,
    Geography,
    TransactionProfile,
    Channel,
    Vendor,
    Control,
    RiskFactor,
    RiskAssessment
)


# ============================================================
# MINI RISKERS RISK MODEL V1.0
# ============================================================

RISK_WEIGHTS = {
    "CUSTOMER": 0.20,
    "PRODUCT": 0.20,
    "GEOGRAPHY": 0.15,
    "TRANSACTION": 0.20,
    "CHANNEL": 0.10,
    "THIRD_PARTY": 0.10,
    "FRAUD": 0.05
}


def get_rating(score: float) -> str:
    """
    Convert a 0-100 risk score into a risk rating.

    MiniRiskers methodology:
    0-25   = LOW
    26-50  = MEDIUM
    51-75  = HIGH
    76-100 = CRITICAL
    """

    if score <= 25:
        return "LOW"

    if score <= 50:
        return "MEDIUM"

    if score <= 75:
        return "HIGH"

    return "CRITICAL"


def calculate_category_score(
    db: Session,
    change_request_id: int,
    category: str
) -> float:

    factors = (
        db.query(RiskFactor)
        .filter(
            RiskFactor.change_request_id == change_request_id,
            RiskFactor.risk_category == category
        )
        .all()
    )

    if not factors:
        return 0.0

    total_score = 0.0
    total_weight = 0.0

    for factor in factors:

        score = factor.factor_score or 0.0
        weight = factor.factor_weight or 0.0

        total_score += score * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    return total_score / total_weight


def calculate_inherent_risk(
    customer_score: float,
    product_score: float,
    geography_score: float,
    transaction_score: float,
    channel_score: float,
    third_party_score: float,
    fraud_score: float
) -> float:

    score = (
        customer_score * RISK_WEIGHTS["CUSTOMER"]
        + product_score * RISK_WEIGHTS["PRODUCT"]
        + geography_score * RISK_WEIGHTS["GEOGRAPHY"]
        + transaction_score * RISK_WEIGHTS["TRANSACTION"]
        + channel_score * RISK_WEIGHTS["CHANNEL"]
        + third_party_score * RISK_WEIGHTS["THIRD_PARTY"]
        + fraud_score * RISK_WEIGHTS["FRAUD"]
    )

    return round(score, 2)


def calculate_control_effectiveness(
    db: Session,
    change_request_id: int
) -> float:

    controls = (
        db.query(Control)
        .filter(Control.change_request_id == change_request_id)
        .all()
    )

    if not controls:
        return 0.0

    effectiveness_scores = []

    for control in controls:

        if control.effectiveness_score is not None:
            effectiveness_scores.append(
                control.effectiveness_score
            )

    if not effectiveness_scores:
        return 0.0

    return round(
        sum(effectiveness_scores) / len(effectiveness_scores),
        2
    )


def calculate_residual_risk(
    db: Session,
    change_request_id: int,
    inherent_score: float,
    control_effectiveness: float
) -> float:

    residual = inherent_score * (
        1 - control_effectiveness / 100
    )

    minimum_residual_risk = get_base_residual_floor(inherent_score)

    # Apply risk concentration floor
    concentration_floor = calculate_risk_concentration_floor(
        db,
        change_request_id
    )

    minimum_residual_risk = max(
        minimum_residual_risk,
        concentration_floor
    )

    residual = max(
        residual,
        minimum_residual_risk
    )

    return round(residual, 2)

# Residual risk can never drop below these floors, regardless of controls.
# Each rule fires when every listed risk factor is present on the request.
CONCENTRATION_RULES = [
    {
        "name": "Cross-border velocity concentration",
        "factors": [
            "Cross Border Transactions",
            "High Transaction Velocity",
            "Rapid Movement",
        ],
        "floor": 60,
    },
    {
        "name": "PEP and high-risk customer concentration",
        "factors": [
            "PEP Exposure",
            "High Risk Customer Exposure",
        ],
        "floor": 55,
    },
    {
        "name": "Third-party cross-border processing",
        "factors": [
            "Third Party Transaction Processing",
            "Cross Border Processing",
        ],
        "floor": 55,
    },
    {
        "name": "Sanctions exposure",
        "factors": ["Sanctions Exposure"],
        "floor": 65,
    },
]


def get_base_residual_floor(inherent_score: float) -> float:
    # Base floor based on inherent risk
    if inherent_score >= 76:
        return 51

    if inherent_score >= 51:
        return 26

    return 5


def get_triggered_concentration_rules(factor_names: set[str]) -> list[dict]:
    return [
        rule
        for rule in CONCENTRATION_RULES
        if all(factor in factor_names for factor in rule["factors"])
    ]


def calculate_risk_concentration_floor(
    db: Session,
    change_request_id: int
) -> float:

    factors = (
        db.query(RiskFactor)
        .filter(
            RiskFactor.change_request_id == change_request_id
        )
        .all()
    )

    factor_names = {
        factor.risk_factor
        for factor in factors
    }

    minimum_residual_risk = 5

    for rule in get_triggered_concentration_rules(factor_names):
        minimum_residual_risk = max(
            minimum_residual_risk,
            rule["floor"]
        )

    return minimum_residual_risk

def generate_risk_assessment(
    db: Session,
    change_request_id: int
):

    # --------------------------------------------------------
    # 1. Calculate category scores
    # --------------------------------------------------------

    customer_score = calculate_category_score(
        db, change_request_id, "CUSTOMER"
    )

    product_score = calculate_category_score(
        db, change_request_id, "PRODUCT"
    )

    geography_score = calculate_category_score(
        db, change_request_id, "GEOGRAPHY"
    )

    transaction_score = calculate_category_score(
        db, change_request_id, "TRANSACTION"
    )

    channel_score = calculate_category_score(
        db, change_request_id, "CHANNEL"
    )

    third_party_score = calculate_category_score(
        db, change_request_id, "THIRD_PARTY"
    )

    fraud_score = calculate_category_score(
        db, change_request_id, "FRAUD"
    )

    # --------------------------------------------------------
    # 2. Calculate overall inherent risk
    # --------------------------------------------------------

    inherent_score = calculate_inherent_risk(
        customer_score,
        product_score,
        geography_score,
        transaction_score,
        channel_score,
        third_party_score,
        fraud_score
    )

    inherent_rating = get_rating(inherent_score)

    # --------------------------------------------------------
    # 3. Calculate control effectiveness
    # --------------------------------------------------------

    control_effectiveness = calculate_control_effectiveness(
        db,
        change_request_id
    )

    # --------------------------------------------------------
    # 4. Calculate residual risk
    # --------------------------------------------------------

    residual_score = calculate_residual_risk(
        db,
        change_request_id,
        inherent_score,
        control_effectiveness
    )

    residual_rating = get_rating(residual_score)

    # --------------------------------------------------------
    # 5. Create assessment
    # --------------------------------------------------------

    assessment = RiskAssessment(
        change_request_id=change_request_id,

        risk_model_version="1.0",

        customer_risk_score=customer_score,
        product_risk_score=product_score,
        geography_risk_score=geography_score,
        transaction_risk_score=transaction_score,
        channel_risk_score=channel_score,
        third_party_risk_score=third_party_score,
        fraud_risk_score=fraud_score,

        inherent_score=inherent_score,
        inherent_rating=inherent_rating,

        control_adjustment=control_effectiveness,

        residual_score=residual_score,
        residual_rating=residual_rating,

        ai_recommendation="REQUIRES_FCRM_REVIEW",

        analyst_rating=None,
        final_rating=None,

        assessment_status="DRAFT"
    )

    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return assessment