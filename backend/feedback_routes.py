"""Post-go-live feedback.

Business Owners rate each request (1-5 stars, quick tags, comment) once it
closes, within an Admin-configured window. Analysts and the committee mark
AI assessment drafts helpful or not. Admin sees both in aggregate.
"""

import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.learning import FINAL_STATUSES, _closed_at
from backend.models import (
    AIFeedback,
    AIRecommendation,
    ChangeRequest,
    RequestFeedback,
    User,
)
from backend.permissions import (
    ROLE_ADMIN,
    ROLE_BUSINESS_OWNER,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    _identity_matches,
    assert_role,
    filter_change_requests_for_user,
    get_change_request_or_404,
)
from backend.system_settings import get_setting

router = APIRouter(tags=["Feedback"])

FEEDBACK_TAGS = [
    "Accurate risk rating",
    "Clear explanation",
    "Fast turnaround",
    "Easy to use",
    "Rating felt too high",
    "Rating felt too low",
    "Too slow",
    "Unclear next steps",
]

AI_FEEDBACK_REASONS = {
    "INACCURATE": "Inaccurate or wrong facts",
    "MISSING_RISK": "Missed a relevant risk",
    "WEAK_EVIDENCE": "Weak or irrelevant regulatory evidence",
    "TOO_GENERIC": "Too generic",
    "OTHER": "Other",
}


def is_closed(change_request: ChangeRequest) -> bool:
    status = (change_request.status or "").upper()
    if status == "APPROVE_WITH_CONDITIONS":
        # Not closed until every condition is verified (CONDITIONS_MET).
        return False
    return change_request.current_stage == "COMPLETED" and status in FINAL_STATUSES


def feedback_window(db: Session, change_request: ChangeRequest) -> dict:
    days = get_setting(db, "feedback_window_days")
    closed_at = _closed_at(db, change_request) if is_closed(change_request) else None
    closes_at = closed_at + timedelta(days=days) if closed_at else None
    return {
        "window_days": days,
        "closed_at": closed_at,
        "closes_at": closes_at,
        "open": bool(closes_at and datetime.utcnow() <= closes_at),
    }


def _existing(db: Session, change_request_id: int, user_id: int):
    return (
        db.query(RequestFeedback)
        .filter(
            RequestFeedback.change_request_id == change_request_id,
            RequestFeedback.user_id == user_id,
        )
        .first()
    )


def serialize_feedback(row: RequestFeedback) -> dict:
    return {
        "id": row.id,
        "change_request_id": row.change_request_id,
        "rating": row.rating,
        "tags": json.loads(row.tags_json or "[]"),
        "comment": row.comment,
        "created_at": row.created_at,
    }


@router.get("/feedback/options")
def feedback_options(current_user: User = Depends(get_current_user)):
    return {
        "tags": FEEDBACK_TAGS,
        "ai_reasons": [
            {"code": code, "label": label} for code, label in AI_FEEDBACK_REASONS.items()
        ],
    }


@router.get("/change-requests/{change_request_id}/feedback")
def get_request_feedback(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(db, change_request_id, current_user)
    window = feedback_window(db, change_request)
    if current_user.role == ROLE_ADMIN:
        rows = (
            db.query(RequestFeedback)
            .filter(RequestFeedback.change_request_id == change_request_id)
            .all()
        )
        return {**window, "eligible": False, "feedback": [serialize_feedback(r) for r in rows]}

    mine = _existing(db, change_request_id, current_user.id)
    is_owner = current_user.role == ROLE_BUSINESS_OWNER and _identity_matches(
        change_request.requested_by, current_user
    )
    return {
        **window,
        "eligible": is_owner and window["open"] and mine is None,
        "submitted": serialize_feedback(mine) if mine else None,
    }


class FeedbackPayload(BaseModel):
    rating: int
    tags: list[str] = []
    comment: str = ""


@router.post("/change-requests/{change_request_id}/feedback", status_code=201)
def submit_request_feedback(
    change_request_id: int,
    payload: FeedbackPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_BUSINESS_OWNER)
    change_request = get_change_request_or_404(db, change_request_id, current_user)
    if not _identity_matches(change_request.requested_by, current_user):
        raise HTTPException(status_code=403, detail="Only the request owner can rate it.")
    if not 1 <= payload.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5 stars.")
    if any(tag not in FEEDBACK_TAGS for tag in payload.tags):
        raise HTTPException(status_code=400, detail="Unknown feedback tag.")
    window = feedback_window(db, change_request)
    if not window["closed_at"]:
        raise HTTPException(
            status_code=400,
            detail="Feedback opens once the request reaches its final outcome.",
        )
    if not window["open"]:
        raise HTTPException(
            status_code=400,
            detail=f"The {window['window_days']}-day feedback window has closed.",
        )
    if _existing(db, change_request_id, current_user.id):
        raise HTTPException(status_code=409, detail="You have already rated this request.")

    row = RequestFeedback(
        change_request_id=change_request_id,
        user_id=current_user.id,
        rating=payload.rating,
        tags_json=json.dumps(payload.tags),
        comment=payload.comment.strip()[:2000] or None,
    )
    db.add(row)
    db.commit()
    return serialize_feedback(row)


@router.get("/feedback/pending")
def pending_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """The Business Owner's closed requests still waiting for a rating."""
    if current_user.role != ROLE_BUSINESS_OWNER:
        return {"requests": []}
    rated = {
        row.change_request_id
        for row in db.query(RequestFeedback.change_request_id).filter(
            RequestFeedback.user_id == current_user.id
        )
    }
    pending = []
    query = filter_change_requests_for_user(
        current_user,
        db.query(ChangeRequest).filter(ChangeRequest.current_stage == "COMPLETED"),
    )
    for change_request in query.all():
        if change_request.id in rated:
            continue
        window = feedback_window(db, change_request)
        if window["open"]:
            pending.append({
                "id": change_request.id,
                "request_number": change_request.request_number,
                "title": change_request.title,
                "status": change_request.status,
                "closes_at": window["closes_at"],
            })
    pending.sort(key=lambda item: item["closes_at"])
    return {"requests": pending}


# ---------------------------------------------------------------------------
# AI assessment feedback
# ---------------------------------------------------------------------------

class AIFeedbackPayload(BaseModel):
    helpful: bool
    reason: Optional[str] = None
    comment: str = ""


def _latest_recommendation(db: Session, change_request_id: int):
    return (
        db.query(AIRecommendation)
        .filter(AIRecommendation.change_request_id == change_request_id)
        .order_by(AIRecommendation.id.desc())
        .first()
    )


def _serialize_ai_feedback(row: Optional[AIFeedback]) -> Optional[dict]:
    if row is None:
        return None
    return {
        "id": row.id,
        "ai_recommendation_id": row.ai_recommendation_id,
        "helpful": row.helpful,
        "reason": row.reason,
        "comment": row.comment,
        "created_at": row.created_at,
    }


@router.get("/change-requests/{change_request_id}/ai-feedback")
def get_ai_feedback(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    recommendation = _latest_recommendation(db, change_request_id)
    if recommendation is None:
        return {"ai_recommendation_id": None, "mine": None}
    mine = (
        db.query(AIFeedback)
        .filter(
            AIFeedback.ai_recommendation_id == recommendation.id,
            AIFeedback.user_id == current_user.id,
        )
        .first()
    )
    return {"ai_recommendation_id": recommendation.id, "mine": _serialize_ai_feedback(mine)}


@router.post("/change-requests/{change_request_id}/ai-feedback")
def submit_ai_feedback(
    change_request_id: int,
    payload: AIFeedbackPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_RISK_ANALYST, ROLE_RISK_COMMITTEE, ROLE_ADMIN)
    get_change_request_or_404(db, change_request_id, current_user)
    recommendation = _latest_recommendation(db, change_request_id)
    if recommendation is None:
        raise HTTPException(status_code=404, detail="No AI assessment to rate yet.")
    if not payload.helpful and payload.reason not in AI_FEEDBACK_REASONS:
        raise HTTPException(status_code=400, detail="Pick why the draft was not helpful.")

    row = (
        db.query(AIFeedback)
        .filter(
            AIFeedback.ai_recommendation_id == recommendation.id,
            AIFeedback.user_id == current_user.id,
        )
        .first()
    )
    if row is None:
        row = AIFeedback(
            change_request_id=change_request_id,
            ai_recommendation_id=recommendation.id,
            user_id=current_user.id,
            helpful=payload.helpful,
        )
        db.add(row)
    row.helpful = payload.helpful
    row.reason = None if payload.helpful else payload.reason
    row.comment = payload.comment.strip()[:2000] or None
    row.created_at = datetime.utcnow()
    db.commit()
    return _serialize_ai_feedback(row)


# ---------------------------------------------------------------------------
# Admin summary
# ---------------------------------------------------------------------------

def feedback_summary(db: Session) -> dict:
    rows = db.query(RequestFeedback).order_by(RequestFeedback.created_at.desc()).all()
    requests = {
        cr.id: cr
        for cr in db.query(ChangeRequest).filter(
            ChangeRequest.id.in_([row.change_request_id for row in rows] or [-1])
        )
    }
    distribution = Counter(row.rating for row in rows)
    tags = Counter(tag for row in rows for tag in json.loads(row.tags_json or "[]"))
    by_month = defaultdict(list)
    for row in rows:
        by_month[row.created_at.strftime("%Y-%m")].append(row.rating)

    closed_requests = [
        cr
        for cr in db.query(ChangeRequest).filter(ChangeRequest.current_stage == "COMPLETED")
        if is_closed(cr)
    ]

    def describe(row: RequestFeedback) -> dict:
        change_request = requests.get(row.change_request_id)
        return {
            **serialize_feedback(row),
            "request_number": change_request.request_number if change_request else None,
            "title": change_request.title if change_request else None,
        }

    return {
        "window_days": get_setting(db, "feedback_window_days"),
        "responses": len(rows),
        "closed_requests": len(closed_requests),
        "response_rate": (
            round(len(rows) / len(closed_requests) * 100, 1) if closed_requests else None
        ),
        "average_rating": (
            round(sum(row.rating for row in rows) / len(rows), 2) if rows else None
        ),
        "distribution": {str(star): distribution.get(star, 0) for star in range(1, 6)},
        "tags": [{"tag": tag, "count": count} for tag, count in tags.most_common()],
        "by_month": [
            {"month": month, "responses": len(values), "average": round(sum(values) / len(values), 2)}
            for month, values in sorted(by_month.items())
        ],
        "low_ratings": [describe(row) for row in rows if row.rating <= 2][:20],
        "recent_comments": [describe(row) for row in rows if row.comment][:20],
    }
