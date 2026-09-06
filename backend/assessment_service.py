import json

from sqlalchemy.orm import Session

from backend.assessment_context import build_assessment_context
from backend.assessment_prompt import build_assessment_prompt
from backend.gemini_service import generate_text
from backend.models import AIRecommendation


def generate_ai_assessment(
    db: Session,
    change_request_id: int
):

    # 1. Collect all existing assessment data
    context = build_assessment_context(
        db,
        change_request_id
    )

    # 2. Build FCRM-specific prompt
    prompt = build_assessment_prompt(
        context
    )

    # 3. Call Gemini
    response_text = generate_text(
        prompt
    )

    # 4. Try to parse Gemini JSON
    try:
        assessment = json.loads(response_text)
    except json.JSONDecodeError:

        assessment = {
            "executive_summary": response_text,
            "recommendation":
                "REQUIRES_FCRM_REVIEW"
        }

    # 5. Store AI assessment
    recommendation = AIRecommendation(
        change_request_id=change_request_id,

        risk_assessment_id=(
            context["risk_assessment"]["id"]
            if context["risk_assessment"]
            else None
        ),

        model_name="Gemini",

        model_version="gemini-2.5-flash",

        assessment_summary=(
            assessment.get(
                "executive_summary",
                ""
            )
        ),

        risk_analysis=json.dumps(
            assessment.get(
                "risk_assessment",
                {}
            )
        ),

        regulatory_considerations=json.dumps(
            assessment.get(
                "regulatory_considerations",
                []
            )
        ),

        analyst_review_questions=json.dumps(
            assessment.get(
                "analyst_review_questions",
                []
            )
        ),

        rationale=assessment.get(
            "rationale",
            ""
        ),

        recommendation=assessment.get(
            "recommendation",
            "REQUIRES_FCRM_REVIEW"
        ),

        evidence_references=json.dumps(
            assessment.get(
                "regulatory_evidence",
                []
            )
        ),

        status="DRAFT"
    )

    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    return recommendation, assessment