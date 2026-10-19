"""Shared API serializers."""

import re
from datetime import datetime

from backend.models import ApprovalCondition


def display_document_name(name):
    """Drop the corpus file-order prefix ("1-RBI ..." -> "RBI ...").

    The prefixed stem stays the stored key that links Chroma chunks and
    PDFs; only what users see is cleaned.
    """
    return re.sub(r"^\d+-", "", name) if name else name


def serialize_condition(condition: ApprovalCondition) -> dict:
    overdue = bool(
        condition.status != "VERIFIED"
        and condition.due_date
        and condition.due_date < datetime.utcnow()
    )
    return {
        "id": condition.id,
        "change_request_id": condition.change_request_id,
        "committee_decision_id": condition.committee_decision_id,
        "description": condition.description,
        "due_date": condition.due_date,
        "status": condition.status,
        "overdue": overdue,
        "evidence_note": condition.evidence_note,
        "evidence_submitted_by": condition.evidence_submitted_by,
        "evidence_submitted_at": condition.evidence_submitted_at,
        "verified_by": condition.verified_by,
        "verified_at": condition.verified_at,
        "verification_note": condition.verification_note,
        "created_at": condition.created_at,
    }
