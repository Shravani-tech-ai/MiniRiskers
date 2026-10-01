import json
import re

from sqlalchemy.orm import Session

from backend.assessment_context import build_assessment_context
from backend.assessment_prompt import build_assessment_prompt
from backend.gemini_service import generate_json
from backend.models import AIRecommendation

def parse_gemini_json(response_text: str):
    if not response_text or not str(response_text).strip():
        raise ValueError("Gemini returned an empty response.")

    response_text = str(response_text).strip()

    # Remove Markdown code fences if Gemini adds them
    if response_text.startswith("```json"):
        response_text = response_text[7:]

    elif response_text.startswith("```"):
        response_text = response_text[3:]

    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    try:
        return json.loads(response_text)
    except json.JSONDecodeError as first_error:
        match = re.search(
            r"\{[\s\S]*\}",
            response_text,
        )

        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        raise ValueError(
            f"Gemini returned invalid JSON: {first_error}"
        )

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
    response_text = generate_json(prompt)

    # 4. Try to parse Gemini JSON
    try:
        assessment = parse_gemini_json(
            response_text
        )

    except json.JSONDecodeError as e:

        raise ValueError(
            f"Gemini returned invalid JSON: {e}"
        )

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