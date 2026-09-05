from sqlalchemy.orm import Session

from backend.models import RiskFactor, RegulatoryEvidence

from rag.query_engine import search_regulations
from rag.regulatory_queries import RISK_FACTOR_QUERIES


def build_regulatory_query(risk_factor: RiskFactor) -> str:

    return RISK_FACTOR_QUERIES.get(
        risk_factor.risk_factor,
        (
            "Indian banking regulatory requirements relating to "
            f"{risk_factor.risk_factor}"
        )
    )


def generate_evidence_for_risk_factor(
    db: Session,
    risk_factor: RiskFactor,
    number_of_results: int = 3
):

    query = build_regulatory_query(risk_factor)

    results = search_regulations(
        query,
        number_of_results=number_of_results
    )

    evidence_records = []

    for document, score in results:

        metadata = document.metadata or {}

        page_number = metadata.get("page")

        try:
            page_number = int(page_number)
        except (TypeError, ValueError):
            page_number = None

        evidence = RegulatoryEvidence(
            change_request_id=risk_factor.change_request_id,
            risk_factor_id=risk_factor.id,

            query=query,

            evidence_text=document.page_content,

            authority=metadata.get("authority"),
            document_name=metadata.get("document"),
            page_number=page_number,

            source_reference=(
                f"{metadata.get('document', 'Unknown Document')} "
                f"- Page {page_number if page_number is not None else 'N/A'}"
            ),

            relevance_score=float(score)
        )

        db.add(evidence)
        evidence_records.append(evidence)

    db.commit()

    for evidence in evidence_records:
        db.refresh(evidence)

    return evidence_records


def generate_evidence_for_change_request(
    db: Session,
    change_request_id: int,
    number_of_results: int = 3
):

    # Remove previously generated evidence for this assessment
    db.query(RegulatoryEvidence).filter(
        RegulatoryEvidence.change_request_id == change_request_id
    ).delete(synchronize_session=False)

    db.commit()

    risk_factors = (
        db.query(RiskFactor)
        .filter(
            RiskFactor.change_request_id == change_request_id
        )
        .all()
    )

    all_evidence = []

    for risk_factor in risk_factors:

        evidence = generate_evidence_for_risk_factor(
            db,
            risk_factor,
            number_of_results
        )

        all_evidence.extend(evidence)

    return all_evidence