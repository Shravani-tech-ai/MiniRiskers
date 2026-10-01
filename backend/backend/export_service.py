import json
from datetime import datetime

from sqlalchemy.orm import Session

from backend.assessment_inputs import load_assessment_inputs
from backend.models import (
    AIRecommendation,
    AnalystOverride,
    CommitteeDecision,
    Control,
    RegulatoryEvidence,
    RiskAssessment,
    RiskFactor,
    ChangeRequest,
)


def build_assessment_export(
    db: Session,
    change_request_id: int,
) -> dict:
    change_request = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.id == change_request_id)
        .first()
    )

    if not change_request:
        raise ValueError("Change request not found")

    risk_assessment = (
        db.query(RiskAssessment)
        .filter(
            RiskAssessment.change_request_id == change_request_id
        )
        .order_by(RiskAssessment.id.desc())
        .first()
    )

    risk_factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .all()
    )

    evidence = (
        db.query(RegulatoryEvidence)
        .filter(
            RegulatoryEvidence.change_request_id == change_request_id
        )
        .all()
    )

    controls = (
        db.query(Control)
        .filter(Control.change_request_id == change_request_id)
        .all()
    )

    ai_recommendation = (
        db.query(AIRecommendation)
        .filter(
            AIRecommendation.change_request_id == change_request_id
        )
        .order_by(AIRecommendation.id.desc())
        .first()
    )

    analyst_review = (
        db.query(AnalystOverride)
        .filter(
            AnalystOverride.change_request_id == change_request_id
        )
        .order_by(AnalystOverride.id.desc())
        .first()
    )

    committee_decision = (
        db.query(CommitteeDecision)
        .filter(
            CommitteeDecision.change_request_id == change_request_id
        )
        .order_by(CommitteeDecision.id.desc())
        .first()
    )

    inputs = load_assessment_inputs(db, change_request_id)

    return {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "change_request": {
            "id": change_request.id,
            "request_number": change_request.request_number,
            "title": change_request.title,
            "description": change_request.description,
            "status": change_request.status,
            "current_stage": change_request.current_stage,
            "business_unit": change_request.business_unit,
            "product_type": change_request.product_type,
            "created_at": (
                change_request.created_at.isoformat()
                if change_request.created_at
                else None
            ),
        },
        "assessment_inputs": inputs,
        "risk_assessment": _serialize_risk_assessment(risk_assessment),
        "risk_factors": [
            {
                "id": factor.id,
                "risk_category": factor.risk_category,
                "risk_factor": factor.risk_factor,
                "factor_value": factor.factor_value,
                "factor_score": factor.factor_score,
                "factor_weight": factor.factor_weight,
                "source_type": factor.source_type,
                "source_reference": factor.source_reference,
            }
            for factor in risk_factors
        ],
        "controls": [
            {
                "id": control.id,
                "control_name": control.control_name,
                "control_category": control.control_category,
                "description": control.description,
                "control_type": control.control_type,
                "control_strength": control.control_strength,
                "implemented": control.implemented,
                "implementation_status": control.implementation_status,
                "owner": control.owner,
                "effectiveness_score": control.effectiveness_score,
            }
            for control in controls
        ],
        "regulatory_evidence": [
            {
                "id": item.id,
                "authority": item.authority,
                "document_name": item.document_name,
                "page_number": item.page_number,
                "query": item.query,
                "evidence_text": item.evidence_text,
                "source_reference": item.source_reference,
                "relevance_score": item.relevance_score,
            }
            for item in evidence
        ],
        "ai_assessment": _serialize_ai(ai_recommendation),
        "analyst_review": _serialize_analyst(analyst_review),
        "committee_decision": _serialize_committee(committee_decision),
    }


def _serialize_risk_assessment(assessment: RiskAssessment | None):
    if not assessment:
        return None

    return {
        "risk_model_version": assessment.risk_model_version,
        "customer_risk_score": assessment.customer_risk_score,
        "product_risk_score": assessment.product_risk_score,
        "geography_risk_score": assessment.geography_risk_score,
        "transaction_risk_score": assessment.transaction_risk_score,
        "channel_risk_score": assessment.channel_risk_score,
        "third_party_risk_score": assessment.third_party_risk_score,
        "fraud_risk_score": assessment.fraud_risk_score,
        "inherent_score": assessment.inherent_score,
        "inherent_rating": assessment.inherent_rating,
        "control_adjustment": assessment.control_adjustment,
        "residual_score": assessment.residual_score,
        "residual_rating": assessment.residual_rating,
        "analyst_rating": assessment.analyst_rating,
        "final_rating": assessment.final_rating,
        "assessment_status": assessment.assessment_status,
        "updated_at": (
            assessment.updated_at.isoformat()
            if assessment.updated_at
            else None
        ),
    }


def _serialize_ai(recommendation: AIRecommendation | None):
    if not recommendation:
        return None

    return {
        "model": recommendation.model_name,
        "model_version": recommendation.model_version,
        "status": recommendation.status,
        "recommendation": recommendation.recommendation,
        "assessment_summary": recommendation.assessment_summary,
        "rationale": recommendation.rationale,
        "risk_analysis": recommendation.risk_analysis,
        "regulatory_considerations": (
            recommendation.regulatory_considerations
        ),
    }


def _serialize_analyst(review: AnalystOverride | None):
    if not review:
        return None

    return {
        "system_rating": review.system_rating,
        "analyst_rating": review.analyst_rating,
        "override_reason": review.override_reason,
        "consequences": review.consequences,
        "reviewed_by": review.reviewed_by,
        "status": review.status,
        "created_at": (
            review.created_at.isoformat()
            if review.created_at
            else None
        ),
    }


def _serialize_committee(decision: CommitteeDecision | None):
    if not decision:
        return None

    return {
        "decision": decision.decision,
        "rationale": decision.rationale,
        "conditions": decision.conditions,
        "decided_by": decision.decided_by,
        "status": decision.status,
        "created_at": (
            decision.created_at.isoformat()
            if decision.created_at
            else None
        ),
    }


def export_to_pdf_bytes(export_data: dict) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=14)
    pdf.cell(0, 10, "MiniRiskers Assessment Export", ln=True)

    pdf.set_font("Helvetica", size=10)
    cr = export_data.get("change_request") or {}
    pdf.cell(
        0,
        8,
        f"Request: {cr.get('request_number', '')} - {cr.get('title', '')}",
        ln=True,
    )
    pdf.cell(
        0,
        8,
        f"Stage: {cr.get('current_stage', '')} | Status: {cr.get('status', '')}",
        ln=True,
    )
    pdf.ln(4)

    risk = export_data.get("risk_assessment") or {}
    if risk:
        pdf.set_font("Helvetica", style="B", size=11)
        pdf.cell(0, 8, "Risk summary", ln=True)
        pdf.set_font("Helvetica", size=10)
        pdf.cell(
            0,
            6,
            (
                f"Inherent: {risk.get('inherent_score')} "
                f"({risk.get('inherent_rating')})"
            ),
            ln=True,
        )
        pdf.cell(
            0,
            6,
            (
                f"Residual: {risk.get('residual_score')} "
                f"({risk.get('residual_rating')})"
            ),
            ln=True,
        )
        pdf.cell(
            0,
            6,
            f"Model version: {risk.get('risk_model_version')}",
            ln=True,
        )
        pdf.ln(4)

    pdf.set_font("Helvetica", style="B", size=11)
    pdf.cell(0, 8, "Full JSON appendix", ln=True)
    pdf.set_font("Courier", size=7)
    json_text = json.dumps(export_data, indent=2)
    for line in json_text.splitlines():
        pdf.multi_cell(0, 3.5, line)

    return pdf.output()
