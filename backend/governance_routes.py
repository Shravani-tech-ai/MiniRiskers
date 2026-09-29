"""Governance endpoints: methodology versioning, approval conditions,
audit-trail verification and export, and cycle-time / SLA tracking."""

import copy
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.audit import create_audit_event, verify_chain
from backend.audit_export import (
    audit_events_to_csv,
    audit_pack_to_pdf_bytes,
    build_audit_pack,
)
from backend.auth import audit_actor_name, get_current_user
from backend.cycle_time import compute_cycle_time, summarize_portfolio
from backend.database import get_db
from backend.methodology_store import (
    STATUS_ACTIVE,
    STATUS_DRAFT,
    STATUS_PENDING,
    STATUS_REJECTED,
    STATUS_RETIRED,
    get_active_methodology,
    get_config_for_version,
    next_version_number,
    parse_config,
    record_methodology_event,
)
from backend.models import (
    AnalystOverride,
    ApprovalCondition,
    AuditEvent,
    ChangeRequest,
    MethodologyEvent,
    MethodologyVersion,
    RiskAssessment,
    RiskFactor,
    User,
)
from backend.permissions import (
    ROLE_ADMIN,
    ROLE_AUDITOR,
    ROLE_BUSINESS_OWNER,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    _identity_matches,
    assert_not_auditor_write,
    assert_role,
    filter_change_requests_for_user,
    get_change_request_or_404,
)
from backend.serializers import serialize_condition
from risk_engine.methodology import (
    CATEGORIES,
    framework_coverage_gaps,
    framework_refs_for_category,
    framework_refs_for_factor,
    framework_refs_for_rule,
    load_framework,
    rating_band_ranges,
    score_factors,
    validate_config,
)
from risk_engine.risk_calculator import factor_rows_to_inputs

router = APIRouter()

# The risk function: FCRM analysts propose methodology changes, the risk
# committee approves them. Admin can do either, but never both for the
# same version (maker-checker).
METHODOLOGY_PROPOSERS = (ROLE_RISK_ANALYST, ROLE_ADMIN)
METHODOLOGY_APPROVERS = (ROLE_RISK_COMMITTEE, ROLE_ADMIN)
METHODOLOGY_READERS = (
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    ROLE_AUDITOR,
    ROLE_ADMIN,
)


# ---------------------------------------------------------------------------
# Methodology
# ---------------------------------------------------------------------------

class MethodologyDraftPayload(BaseModel):
    change_summary: str = ""
    config: Optional[dict] = None


class MethodologyReviewPayload(BaseModel):
    note: str = ""


def _serialize_version(row: MethodologyVersion, include_config: bool = True) -> dict:
    data = {
        "id": row.id,
        "version": row.version,
        "status": row.status,
        "change_summary": row.change_summary,
        "based_on_version": row.based_on_version,
        "created_by": row.created_by,
        "created_by_user_id": row.created_by_user_id,
        "created_at": row.created_at,
        "submitted_at": row.submitted_at,
        "approved_by": row.approved_by,
        "approved_at": row.approved_at,
        "review_note": row.review_note,
        "effective_from": row.effective_from,
        "effective_to": row.effective_to,
    }
    if include_config:
        config = parse_config(row)
        data["config"] = config
        data["rating_band_ranges"] = rating_band_ranges(config)
    return data


def _get_version_or_404(db: Session, version_id: int) -> MethodologyVersion:
    row = db.query(MethodologyVersion).filter(MethodologyVersion.id == version_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Methodology version not found.")
    return row


def _config_diff(old: dict, new: dict, prefix: str = "") -> list[dict]:
    changes = []
    keys = sorted(set(old) | set(new)) if isinstance(old, dict) and isinstance(new, dict) else []
    if not keys:
        if old != new:
            changes.append({"path": prefix, "from": old, "to": new})
        return changes
    for key in keys:
        if key == "version":
            continue
        path = f"{prefix}.{key}" if prefix else key
        a, b = old.get(key), new.get(key)
        if isinstance(a, dict) and isinstance(b, dict):
            changes.extend(_config_diff(a, b, path))
        elif a != b:
            changes.append({"path": path, "from": a, "to": b})
    return changes


@router.get("/methodology/active")
def get_active(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row, _ = get_active_methodology(db)
    return _serialize_version(row)


@router.get("/methodology/versions")
def list_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *METHODOLOGY_READERS)
    rows = db.query(MethodologyVersion).order_by(MethodologyVersion.id.desc()).all()
    return {"versions": [_serialize_version(row, include_config=False) for row in rows]}


@router.get("/methodology/versions/{version_id}")
def get_version(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *METHODOLOGY_READERS)
    row = _get_version_or_404(db, version_id)
    data = _serialize_version(row)
    base = get_config_for_version(db, row.based_on_version) if row.based_on_version else None
    data["changes_from_base"] = _config_diff(base, data["config"]) if base else []
    data["validation_errors"] = validate_config(data["config"], get_active_methodology(db)[1])
    data["framework_gaps"] = framework_coverage_gaps(data["config"])
    data["history"] = [
        {
            "action": event.action,
            "actor": event.actor,
            "note": event.note,
            "created_at": event.created_at,
        }
        for event in db.query(MethodologyEvent)
        .filter(MethodologyEvent.methodology_version_id == row.id)
        .order_by(MethodologyEvent.id.asc())
        .all()
    ]
    return data


@router.post("/methodology/versions")
def create_draft(
    payload: MethodologyDraftPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *METHODOLOGY_PROPOSERS)
    active_row, active_config = get_active_methodology(db)
    config = copy.deepcopy(payload.config or active_config)
    version = next_version_number(db)
    config["version"] = version
    errors = validate_config(config, active_config)
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})

    row = MethodologyVersion(
        version=version,
        status=STATUS_DRAFT,
        config_json=json.dumps(config),
        change_summary=payload.change_summary.strip() or None,
        based_on_version=active_row.version,
        created_by=audit_actor_name(current_user),
        created_by_user_id=current_user.id,
    )
    db.add(row)
    db.flush()
    record_methodology_event(
        db, row, "DRAFT_CREATED", audit_actor_name(current_user), current_user.id,
        f"Drafted from v{active_row.version}.",
    )
    db.commit()
    return _serialize_version(row)


@router.put("/methodology/versions/{version_id}")
def update_draft(
    version_id: int,
    payload: MethodologyDraftPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *METHODOLOGY_PROPOSERS)
    row = _get_version_or_404(db, version_id)
    if row.status != STATUS_DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Only drafts can be edited. Published versions are immutable.",
        )
    if row.created_by_user_id != current_user.id and current_user.role != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Only the proposer can edit this draft.")
    if payload.config is not None:
        config = copy.deepcopy(payload.config)
        config["version"] = row.version
        errors = validate_config(config, get_active_methodology(db)[1])
        if errors:
            raise HTTPException(status_code=400, detail={"validation_errors": errors})
        row.config_json = json.dumps(config)
    if payload.change_summary.strip():
        row.change_summary = payload.change_summary.strip()
    record_methodology_event(db, row, "DRAFT_UPDATED", audit_actor_name(current_user), current_user.id)
    db.commit()
    return _serialize_version(row)


@router.post("/methodology/versions/{version_id}/submit")
def submit_for_approval(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *METHODOLOGY_PROPOSERS)
    row = _get_version_or_404(db, version_id)
    if row.status != STATUS_DRAFT:
        raise HTTPException(status_code=400, detail="Only drafts can be submitted.")
    if not (row.change_summary or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Describe what changed and why before submitting for approval.",
        )
    errors = validate_config(parse_config(row), get_active_methodology(db)[1])
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})
    row.status = STATUS_PENDING
    row.submitted_at = datetime.utcnow()
    record_methodology_event(db, row, "SUBMITTED_FOR_APPROVAL", audit_actor_name(current_user), current_user.id)
    db.commit()
    return _serialize_version(row)


@router.post("/methodology/versions/{version_id}/approve")
def approve_version(
    version_id: int,
    payload: MethodologyReviewPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *METHODOLOGY_APPROVERS)
    row = _get_version_or_404(db, version_id)
    if row.status != STATUS_PENDING:
        raise HTTPException(status_code=400, detail="Only versions pending approval can be approved.")
    if row.created_by_user_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Maker-checker: the proposer of a methodology change cannot approve it.",
        )
    errors = validate_config(parse_config(row), get_active_methodology(db)[1])
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})

    now = datetime.utcnow()
    previous = db.query(MethodologyVersion).filter(MethodologyVersion.status == STATUS_ACTIVE).all()
    for old in previous:
        old.status = STATUS_RETIRED
        old.effective_to = now
        record_methodology_event(
            db, old, "RETIRED", audit_actor_name(current_user), current_user.id,
            f"Superseded by v{row.version}.",
        )
    row.status = STATUS_ACTIVE
    row.approved_by = audit_actor_name(current_user)
    row.approved_by_user_id = current_user.id
    row.approved_at = now
    row.effective_from = now
    row.review_note = payload.note.strip() or None
    record_methodology_event(
        db, row, "APPROVED_AND_PUBLISHED", audit_actor_name(current_user), current_user.id,
        payload.note.strip() or None,
    )
    db.commit()
    return _serialize_version(row)


@router.post("/methodology/versions/{version_id}/reject")
def reject_version(
    version_id: int,
    payload: MethodologyReviewPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *METHODOLOGY_APPROVERS)
    row = _get_version_or_404(db, version_id)
    if row.status != STATUS_PENDING:
        raise HTTPException(status_code=400, detail="Only versions pending approval can be rejected.")
    if not payload.note.strip():
        raise HTTPException(status_code=400, detail="Explain why the change is rejected.")
    row.status = STATUS_REJECTED
    row.review_note = payload.note.strip()
    record_methodology_event(
        db, row, "REJECTED", audit_actor_name(current_user), current_user.id, payload.note.strip(),
    )
    db.commit()
    return _serialize_version(row)


@router.get("/methodology/versions/{version_id}/impact")
def methodology_impact(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """What-if: re-score every assessed request under this version."""
    assert_role(current_user, *METHODOLOGY_READERS)
    row = _get_version_or_404(db, version_id)
    candidate = parse_config(row)

    latest = {}
    for assessment in db.query(RiskAssessment).order_by(RiskAssessment.id.desc()).all():
        latest.setdefault(assessment.change_request_id, assessment)

    requests = {
        cr.id: cr
        for cr in db.query(ChangeRequest).filter(ChangeRequest.id.in_(list(latest))).all()
    }
    rows = []
    for request_id, assessment in latest.items():
        factors = db.query(RiskFactor).filter(RiskFactor.change_request_id == request_id).all()
        inputs = factor_rows_to_inputs(factors)
        current_config = get_config_for_version(db, assessment.risk_model_version)
        current = score_factors(inputs, assessment.control_adjustment or 0, current_config)
        proposed = score_factors(inputs, assessment.control_adjustment or 0, candidate)
        cr = requests.get(request_id)
        rows.append({
            "change_request_id": request_id,
            "request_number": cr.request_number if cr else str(request_id),
            "title": cr.title if cr else "",
            "scored_under": assessment.risk_model_version,
            "current_residual": current["residual_score"],
            "current_rating": current["residual_rating"],
            "proposed_residual": proposed["residual_score"],
            "proposed_rating": proposed["residual_rating"],
            "delta": round(proposed["residual_score"] - current["residual_score"], 2),
            "rating_changed": proposed["residual_rating"] != current["residual_rating"],
        })

    rows.sort(key=lambda item: abs(item["delta"]), reverse=True)
    order = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    return {
        "version": row.version,
        "requests_rescored": len(rows),
        "ratings_up": sum(
            1 for r in rows if order.index(r["proposed_rating"]) > order.index(r["current_rating"])
        ),
        "ratings_down": sum(
            1 for r in rows if order.index(r["proposed_rating"]) < order.index(r["current_rating"])
        ),
        "unchanged": sum(1 for r in rows if not r["rating_changed"]),
        "rows": rows,
        "note": (
            "Preview only. Stored assessments are never re-rated "
            "retrospectively; the new version applies to calculations run "
            "after it is approved."
        ),
    }


@router.get("/methodology/framework")
def get_framework(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _, config = get_active_methodology(db)
    framework = load_framework()
    return {
        "framework_version": framework["framework_version"],
        "title": framework["title"],
        "description": framework["description"],
        "sources": framework["sources"],
        "methodology_basis": [
            {**item, "references": [
                {**ref, "source_title": framework["sources"].get(ref["source"], {}).get("title")}
                for ref in item["references"]
            ]}
            for item in framework["methodology_basis"]
        ],
        "categories": [
            {
                "category": category,
                "label": framework["categories"][category]["label"],
                "definition": framework["categories"][category]["definition"],
                "weight": config["category_weights"][category],
                "references": framework_refs_for_category(category),
                "factors": [
                    {
                        "name": name,
                        "score": entry["score"],
                        "weight": entry["weight"],
                        "references": framework_refs_for_factor(category, name),
                    }
                    for name, entry in config["factor_catalog"].get(category, {}).items()
                ],
            }
            for category in CATEGORIES
        ],
        "concentration_rules": [
            {**rule, "references": framework_refs_for_rule(rule["id"])}
            for rule in config["concentration_rules"]
        ],
        "coverage_gaps": framework_coverage_gaps(config),
    }


# ---------------------------------------------------------------------------
# Approval conditions
# ---------------------------------------------------------------------------

class ConditionEvidencePayload(BaseModel):
    evidence_note: str


class ConditionVerifyPayload(BaseModel):
    accepted: bool
    note: str = ""


def _get_condition(db: Session, condition_id: int, current_user: User):
    condition = db.query(ApprovalCondition).filter(ApprovalCondition.id == condition_id).first()
    if condition is None:
        raise HTTPException(status_code=404, detail="Condition not found.")
    change_request = get_change_request_or_404(db, condition.change_request_id, current_user)
    return condition, change_request


@router.get("/change-requests/{change_request_id}/conditions")
def list_conditions(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    conditions = (
        db.query(ApprovalCondition)
        .filter(ApprovalCondition.change_request_id == change_request_id)
        .order_by(ApprovalCondition.id.asc())
        .all()
    )
    items = [serialize_condition(c) for c in conditions]
    return {
        "change_request_id": change_request_id,
        "conditions": items,
        "open_count": sum(1 for c in items if c["status"] != "VERIFIED"),
        "overdue_count": sum(1 for c in items if c["overdue"]),
    }


@router.post("/conditions/{condition_id}/evidence")
def submit_condition_evidence(
    condition_id: int,
    payload: ConditionEvidencePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_BUSINESS_OWNER, ROLE_ADMIN)
    condition, change_request = _get_condition(db, condition_id, current_user)
    if condition.status == "VERIFIED":
        raise HTTPException(status_code=400, detail="This condition is already verified.")
    note = payload.evidence_note.strip()
    if not note:
        raise HTTPException(status_code=400, detail="Describe the evidence that the condition is met.")

    condition.status = "EVIDENCE_SUBMITTED"
    condition.evidence_note = note
    condition.evidence_submitted_by = audit_actor_name(current_user)
    condition.evidence_submitted_at = datetime.utcnow()
    create_audit_event(
        db=db,
        change_request_id=change_request.id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="CONDITION_EVIDENCE_SUBMITTED",
        entity_type="ApprovalCondition",
        entity_id=condition.id,
        new_value=condition.description,
        evidence=note,
    )
    db.commit()
    return serialize_condition(condition)


@router.post("/conditions/{condition_id}/verify")
def verify_condition(
    condition_id: int,
    payload: ConditionVerifyPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_RISK_ANALYST, ROLE_ADMIN)
    assert_not_auditor_write(current_user)
    condition, change_request = _get_condition(db, condition_id, current_user)
    if condition.status != "EVIDENCE_SUBMITTED":
        raise HTTPException(status_code=400, detail="There is no submitted evidence to verify.")
    if _identity_matches(condition.evidence_submitted_by, current_user):
        raise HTTPException(status_code=403, detail="Evidence cannot be verified by the person who submitted it.")
    if not payload.accepted and not payload.note.strip():
        raise HTTPException(status_code=400, detail="Explain why the evidence is not sufficient.")

    condition.status = "VERIFIED" if payload.accepted else "OPEN"
    condition.verified_by = audit_actor_name(current_user) if payload.accepted else None
    condition.verified_at = datetime.utcnow() if payload.accepted else None
    condition.verification_note = payload.note.strip() or None
    create_audit_event(
        db=db,
        change_request_id=change_request.id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="CONDITION_VERIFIED" if payload.accepted else "CONDITION_EVIDENCE_REJECTED",
        entity_type="ApprovalCondition",
        entity_id=condition.id,
        new_value=condition.description,
        reason=payload.note.strip() or None,
    )
    db.flush()

    remaining = (
        db.query(ApprovalCondition)
        .filter(
            ApprovalCondition.committee_decision_id == condition.committee_decision_id,
            ApprovalCondition.status != "VERIFIED",
        )
        .count()
    )
    if payload.accepted and remaining == 0:
        change_request.status = "CONDITIONS_MET"
        create_audit_event(
            db=db,
            change_request_id=change_request.id,
            actor="System",
            action="ALL_CONDITIONS_MET",
            entity_type="ChangeRequest",
            entity_id=change_request.id,
            old_value="APPROVE_WITH_CONDITIONS",
            new_value="CONDITIONS_MET",
            reason="Every approval condition has been evidenced and verified.",
        )
    db.commit()
    return {
        "condition": serialize_condition(condition),
        "remaining_open": remaining,
        "change_request_status": change_request.status,
    }


# ---------------------------------------------------------------------------
# Audit trail verification and export
# ---------------------------------------------------------------------------

AUDIT_EXPORT_ROLES = (ROLE_RISK_ANALYST, ROLE_RISK_COMMITTEE, ROLE_AUDITOR, ROLE_ADMIN)


@router.get("/change-requests/{change_request_id}/audit-events/verify")
def verify_audit_chain(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    return verify_chain(db, change_request_id)


@router.get("/change-requests/{change_request_id}/audit-export")
def export_audit_pack(
    change_request_id: int,
    format: str = "pdf",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(db, change_request_id, current_user)
    assert_role(current_user, *AUDIT_EXPORT_ROLES)
    pack = build_audit_pack(db, change_request_id, audit_actor_name(current_user))
    number = change_request.request_number or str(change_request_id)

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="AUDIT_PACK_EXPORTED",
        entity_type="AuditPack",
        new_value=format.lower(),
        reason=f"Examiner audit pack exported (digest {pack['pack_digest_sha256'][:16]}).",
    )
    db.commit()

    fmt = format.lower()
    if fmt == "pdf":
        return Response(
            content=audit_pack_to_pdf_bytes(pack),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{number}-audit-pack.pdf"'},
        )
    if fmt == "csv":
        return Response(
            content=audit_events_to_csv([pack]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{number}-audit-trail.csv"'},
        )
    return Response(
        content=json.dumps(pack, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{number}-audit-pack.json"'},
    )


@router.get("/audit/verify")
def verify_all_chains(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_AUDITOR, ROLE_ADMIN)
    ids = [row.id for row in db.query(ChangeRequest.id).all()]
    results = [verify_chain(db, request_id) for request_id in ids]
    return {
        "requests_checked": len(results),
        "all_valid": all(r["valid"] for r in results),
        "broken": [r for r in results if not r["valid"]],
        "events_checked": sum(r["event_count"] for r in results),
    }


@router.get("/audit/export")
def export_all_audit(
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Portfolio-wide audit trail for examiners (Auditor / Admin)."""
    assert_role(current_user, ROLE_AUDITOR, ROLE_ADMIN)
    actor = audit_actor_name(current_user)
    packs = [
        build_audit_pack(db, row.id, actor)
        for row in db.query(ChangeRequest).order_by(ChangeRequest.id.asc()).all()
    ]
    stamp = datetime.utcnow().strftime("%Y%m%d")
    if format.lower() == "json":
        return Response(
            content=json.dumps({"packs": packs}, indent=2, default=str),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="audit-export-{stamp}.json"'},
        )
    return Response(
        content=audit_events_to_csv(packs),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="audit-trail-{stamp}.csv"'},
    )


# ---------------------------------------------------------------------------
# Cycle time / SLA
# ---------------------------------------------------------------------------

def _events_by_request(db: Session, ids: list[int]) -> dict[int, list]:
    grouped = {request_id: [] for request_id in ids}
    if not ids:
        return grouped
    for event in (
        db.query(AuditEvent)
        .filter(AuditEvent.change_request_id.in_(ids))
        .order_by(AuditEvent.id.asc())
        .all()
    ):
        grouped[event.change_request_id].append(event)
    return grouped


@router.get("/change-requests/{change_request_id}/cycle-time")
def get_cycle_time(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    _, config = get_active_methodology(db)
    events = _events_by_request(db, [change_request_id])[change_request_id]
    return compute_cycle_time(events, config)


@router.get("/analytics/cycle-time")
def get_portfolio_cycle_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _, config = get_active_methodology(db)
    requests = (
        filter_change_requests_for_user(current_user, db.query(ChangeRequest))
        .order_by(ChangeRequest.id.desc())
        .all()
    )
    grouped = _events_by_request(db, [cr.id for cr in requests])
    items = []
    for cr in requests:
        timeline = compute_cycle_time(grouped[cr.id], config)
        items.append({
            "change_request_id": cr.id,
            "request_number": cr.request_number,
            "title": cr.title,
            **timeline,
        })
    ids = [cr.id for cr in requests]
    reviews = (
        db.query(AnalystOverride).filter(AnalystOverride.change_request_id.in_(ids)).all()
        if ids
        else []
    )
    return {
        "summary": summarize_portfolio(items, config),
        "items": items,
        "overrides": {
            "reviews": len(reviews),
            "downgrades": sum(1 for r in reviews if (r.override_direction or "") == "DOWNGRADE"),
            "upgrades": sum(1 for r in reviews if (r.override_direction or "") == "UPGRADE"),
            "acknowledge": sum(1 for r in reviews if (r.escalation_level or "") == "ACKNOWLEDGE"),
            "escalated": sum(1 for r in reviews if (r.escalation_level or "") == "ESCALATED"),
        },
    }
