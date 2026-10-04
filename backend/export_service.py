import json
import re
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


def build_ai_assessment_payload(recommendation: AIRecommendation) -> dict:
    """API shape of a stored AI recommendation (shared by the JSON and PDF views)."""

    def _load(raw, default):
        try:
            return json.loads(raw) if raw else default
        except json.JSONDecodeError:
            return default

    return {
        "id": recommendation.id,
        "change_request_id": recommendation.change_request_id,
        "model": recommendation.model_name,
        "model_version": recommendation.model_version,
        "status": recommendation.status,
        "recommendation": recommendation.recommendation,
        "created_at": getattr(recommendation, "created_at", None),
        "assessment": {
            "executive_summary": recommendation.assessment_summary,
            "risk_assessment": _load(recommendation.risk_analysis, {}),
            "regulatory_considerations": _load(
                recommendation.regulatory_considerations, []
            ),
            "analyst_review_questions": _load(
                recommendation.analyst_review_questions, []
            ),
            "rationale": recommendation.rationale,
        },
    }


def _humanize(value) -> str:
    text = str(value or "").replace("_", " ").strip().capitalize()
    return re.sub(r"\b(fcrm|aml|kyc|edd|pep)\b", lambda m: m.group(1).upper(), text)


def _to_text(value) -> str:
    """Reduce model output (string, list or object) to display text."""
    if value is None:
        return ""
    if isinstance(value, (str, int, float)):
        return str(value)
    if isinstance(value, list):
        return "; ".join(filter(None, (_to_text(item) for item in value)))
    if isinstance(value, dict):
        for key in ("statement", "analysis", "description", "factor", "text", "summary"):
            if value.get(key):
                return _to_text(value[key])
        return " · ".join(
            f"{_humanize(key)}: {_to_text(item)}" for key, item in value.items()
        )
    return str(value)


def _source_label(item) -> str:
    if not isinstance(item, dict):
        return ""
    parts = [
        item.get("authority"),
        item.get("document"),
        f"p. {item['page_number']}" if item.get("page_number") else None,
    ]
    return " · ".join(str(part) for part in parts if part)


def ai_assessment_to_pdf_bytes(
    change_request: ChangeRequest,
    risk_assessment: RiskAssessment | None,
    ai_payload: dict,
) -> bytes:
    import io
    from html import escape

    import pymupdf

    assessment = ai_payload.get("assessment") or {}
    sections = []

    def section(title, body_html):
        if body_html:
            sections.append(f"<h2>{escape(title)}</h2>{body_html}")

    meta = [
        f"Model: {ai_payload.get('model') or '—'} "
        f"({ai_payload.get('model_version') or '—'})",
        f"Status: {ai_payload.get('status') or '—'}",
        f"Recommendation: {_humanize(ai_payload.get('recommendation')) or '—'}",
        f"Generated: {datetime.now().strftime('%d %b %Y, %H:%M')}",
    ]

    if risk_assessment:
        residual = (
            f"{risk_assessment.residual_score:.1f} ({risk_assessment.residual_rating})"
            if risk_assessment.residual_score is not None
            else "Pending controls"
        )
        section(
            "Calculated risk",
            "<table><tr><th>Inherent risk</th><th>Residual risk</th>"
            "<th>Model version</th></tr>"
            f"<tr><td>{risk_assessment.inherent_score:.1f} "
            f"({escape(str(risk_assessment.inherent_rating))})</td>"
            f"<td>{escape(residual)}</td>"
            f"<td>v{escape(str(risk_assessment.risk_model_version))}</td></tr></table>",
        )

    if assessment.get("executive_summary"):
        section(
            "Executive summary",
            f"<p>{escape(_to_text(assessment['executive_summary']))}</p>",
        )

    risk_by_category = assessment.get("risk_assessment") or {}
    if isinstance(risk_by_category, dict) and risk_by_category:
        section(
            "Risk assessment by category",
            "".join(
                f"<h3>{escape(_humanize(category))}</h3>"
                f"<p>{escape(_to_text(analysis))}</p>"
                for category, analysis in risk_by_category.items()
            ),
        )

    considerations = assessment.get("regulatory_considerations") or []
    if considerations:
        items = []
        for item in considerations:
            source = _source_label(item)
            items.append(
                f"<li>{escape(_to_text(item))}"
                + (f"<br/><span class='source'>{escape(source)}</span>" if source else "")
                + "</li>"
            )
        section("Regulatory considerations", f"<ul>{''.join(items)}</ul>")

    questions = assessment.get("analyst_review_questions") or []
    if questions:
        section(
            "Analyst review questions",
            "<ul>" + "".join(f"<li>{escape(_to_text(q))}</li>" for q in questions) + "</ul>",
        )

    if assessment.get("rationale"):
        section("Rationale", f"<p>{escape(_to_text(assessment['rationale']))}</p>")

    html = (
        "<h1>AI-Assisted FCRM Assessment</h1>"
        f"<p class='subtitle'>{escape(change_request.request_number or str(change_request.id))}"
        f" · {escape(change_request.title or '')}</p>"
        f"<p class='meta'>{'<br/>'.join(escape(line) for line in meta)}</p>"
        + "".join(sections)
        + "<p class='disclaimer'>This is an AI-generated draft prepared for FCRM "
        "review. It does not constitute the final FCRM decision.</p>"
    )
    css = """
        body { font-family: sans-serif; font-size: 10pt; color: #1e293b; }
        h1 { font-size: 17pt; color: #312e81; margin-bottom: 2pt; }
        h2 { font-size: 12pt; color: #312e81; margin-top: 14pt; margin-bottom: 4pt; }
        h3 { font-size: 10pt; margin-top: 8pt; margin-bottom: 2pt; }
        p, li { line-height: 1.4; }
        .subtitle { font-size: 11pt; font-weight: bold; }
        .meta { font-size: 9pt; color: #475569; }
        .source { font-size: 8pt; color: #64748b; }
        .disclaimer { margin-top: 18pt; font-size: 8pt; color: #64748b; font-style: italic; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 4pt; text-align: left; }
        th { background-color: #eef2ff; }
    """

    story = pymupdf.Story(html=html, user_css=css)
    buffer = io.BytesIO()
    writer = pymupdf.DocumentWriter(buffer)
    page_rect = pymupdf.paper_rect("a4")
    content_rect = page_rect + (48, 48, -48, -48)

    more = True
    while more:
        device = writer.begin_page(page_rect)
        more, _ = story.place(content_rect)
        story.draw(device)
        writer.end_page()
    writer.close()

    return buffer.getvalue()
