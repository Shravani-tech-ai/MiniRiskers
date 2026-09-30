"""Residual risk pending until controls are documented."""

from backend.models import ChangeRequest, RiskFactor
from risk_engine.risk_calculator import (
    RESIDUAL_CALCULATED,
    RESIDUAL_PENDING,
    generate_risk_assessment,
)


def _seed_request(db, factors):
    change_request = ChangeRequest(
        title="Controls test",
        description="Synthetic",
        change_type="NEW_PRODUCT",
        product_type="Remittance",
        business_unit="Retail",
        customer_segment="Retail",
        requested_by="Analyst",
        status="SUBMITTED",
        current_stage="RISK_ASSESSMENT",
    )
    db.add(change_request)
    db.flush()
    for category, name in factors:
        db.add(
            RiskFactor(
                change_request_id=change_request.id,
                risk_category=category,
                risk_factor=name,
                factor_value="true",
                factor_score=0,
                factor_weight=0,
            )
        )
    db.commit()
    return change_request.id


def test_residual_pending_without_controls(db_session):
    request_id = _seed_request(
        db_session,
        [("GEOGRAPHY", "High Risk Jurisdiction")],
    )

    assessment = generate_risk_assessment(db_session, request_id)

    assert assessment.inherent_score is not None
    assert assessment.residual_status == RESIDUAL_PENDING
    assert assessment.controls_assessed is False
    assert assessment.residual_score is None
    assert assessment.residual_rating is None


def test_residual_calculated_after_control(db_session):
    from backend.models import Control

    request_id = _seed_request(
        db_session,
        [("GEOGRAPHY", "High Risk Jurisdiction")],
    )
    db_session.add(
        Control(
            change_request_id=request_id,
            control_name="Enhanced due diligence",
            control_category="AML",
            description="Manual EDD",
            control_type="PREVENTIVE",
            control_strength="MEDIUM",
            implemented=True,
            implementation_status="IMPLEMENTED",
            owner="FCRM",
            effectiveness_score=50,
        )
    )
    db_session.commit()

    assessment = generate_risk_assessment(db_session, request_id)

    assert assessment.residual_status == RESIDUAL_CALCULATED
    assert assessment.controls_assessed is True
    assert assessment.residual_score is not None
    assert assessment.residual_rating is not None
    assert assessment.residual_score <= assessment.inherent_score
