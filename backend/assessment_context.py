from sqlalchemy.orm import Session

from backend.models import (
    ChangeRequest,
    Product,
    CustomerProfile,
    Geography,
    TransactionProfile,
    Channel,
    Vendor,
    RiskFactor,
    RiskAssessment,
    Control,
    RegulatoryEvidence
)


def build_assessment_context(
    db: Session,
    change_request_id: int
):

    change_request = (
        db.query(ChangeRequest)
        .filter(
            ChangeRequest.id == change_request_id
        )
        .first()
    )

    if not change_request:
        raise ValueError(
            f"Change Request {change_request_id} not found"
        )

    product = (
        db.query(Product)
        .filter(
            Product.change_request_id == change_request_id
        )
        .first()
    )

    customer_profile = (
        db.query(CustomerProfile)
        .filter(
            CustomerProfile.change_request_id == change_request_id
        )
        .first()
    )

    geography = (
        db.query(Geography)
        .filter(
            Geography.change_request_id == change_request_id
        )
        .all()
    )

    transaction_profile = (
        db.query(TransactionProfile)
        .filter(
            TransactionProfile.change_request_id == change_request_id
        )
        .first()
    )

    channel = (
        db.query(Channel)
        .filter(
            Channel.change_request_id == change_request_id
        )
        .first()
    )

    vendor = (
        db.query(Vendor)
        .filter(
            Vendor.change_request_id == change_request_id
        )
        .first()
    )

    risk_factors = (
        db.query(RiskFactor)
        .filter(
            RiskFactor.change_request_id == change_request_id
        )
        .all()
    )

    risk_assessment = (
        db.query(RiskAssessment)
        .filter(
            RiskAssessment.change_request_id == change_request_id
        )
        .order_by(
            RiskAssessment.id.desc()
        )
        .first()
    )

    controls = (
        db.query(Control)
        .filter(
            Control.change_request_id == change_request_id
        )
        .all()
    )

    regulatory_evidence = (
        db.query(RegulatoryEvidence)
        .filter(
            RegulatoryEvidence.change_request_id == change_request_id
        )
        .all()
    )

    return {
        "change_request": {
            "id": change_request.id,
            "request_number": change_request.request_number,
            "title": change_request.title,
            "description": change_request.description,
            "change_type": change_request.change_type,
            "product_type": change_request.product_type,
            "business_unit": change_request.business_unit,
            "customer_segment": change_request.customer_segment,
            "requested_by": change_request.requested_by,
            "assigned_analyst": change_request.assigned_analyst,
            "status": change_request.status,
            "priority": change_request.priority,
            "proposed_go_live_date": change_request.proposed_go_live_date
        },

        "product": (
            product.__dict__.copy()
            if product
            else None
        ),

        "customer_profile": (
            customer_profile.__dict__.copy()
            if customer_profile
            else None
        ),

        "geographies": [
            geography_item.__dict__.copy()
            for geography_item in geography
        ],

        "transaction_profile": (
            transaction_profile.__dict__.copy()
            if transaction_profile
            else None
        ),

        "channel": (
            channel.__dict__.copy()
            if channel
            else None
        ),

        "vendor": (
            vendor.__dict__.copy()
            if vendor
            else None
        ),

        "risk_factors": [
            {
                "id": rf.id,
                "risk_category": rf.risk_category,
                "risk_factor": rf.risk_factor,
                "factor_value": rf.factor_value,
                "factor_score": rf.factor_score,
                "factor_weight": rf.factor_weight,
                "inherent_risk_contribution":
                    rf.inherent_risk_contribution,
                "source_type": rf.source_type,
                "source_reference": rf.source_reference
            }
            for rf in risk_factors
        ],

        "risk_assessment": (
            {
                "id": risk_assessment.id,
                "risk_model_version": risk_assessment.risk_model_version,

                "customer_risk_score":
                    risk_assessment.customer_risk_score,

                "product_risk_score":
                    risk_assessment.product_risk_score,

                "geography_risk_score":
                    risk_assessment.geography_risk_score,

                "transaction_risk_score":
                    risk_assessment.transaction_risk_score,

                "channel_risk_score":
                    risk_assessment.channel_risk_score,

                "third_party_risk_score":
                    risk_assessment.third_party_risk_score,

                "fraud_risk_score":
                    risk_assessment.fraud_risk_score,

                "inherent_score":
                    risk_assessment.inherent_score,

                "inherent_rating":
                    risk_assessment.inherent_rating,

                "control_adjustment":
                    risk_assessment.control_adjustment,

                "residual_score":
                    risk_assessment.residual_score,

                "residual_rating":
                    risk_assessment.residual_rating,

                "ai_recommendation":
                    risk_assessment.ai_recommendation,

                "assessment_status":
                    risk_assessment.assessment_status
            }
            if risk_assessment
            else None
        ),

        "controls": [
            {
                "id": control.id,
                "control_name": control.control_name,
                "control_category": control.control_category,
                "description": control.description,
                "control_type": control.control_type,
                "control_strength": control.control_strength,
                "implemented": control.implemented,
                "implementation_status":
                    control.implementation_status,
                "owner": control.owner,
                "effectiveness_score":
                    control.effectiveness_score
            }
            for control in controls
        ],

        "regulatory_evidence": [
            {
                "id": evidence.id,
                "risk_factor_id":
                    evidence.risk_factor_id,
                "query": evidence.query,
                "evidence_text":
                    evidence.evidence_text,
                "authority":
                    evidence.authority,
                "document_name":
                    evidence.document_name,
                "page_number":
                    evidence.page_number,
                "source_reference":
                    evidence.source_reference,
                "relevance_score":
                    evidence.relevance_score
            }
            for evidence in regulatory_evidence
        ]
    }