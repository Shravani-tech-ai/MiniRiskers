"""Examiner-ready audit pack for a change request.

The pack gathers, in one document, everything an examiner needs to follow
a rating from its inputs to the final decision: the system, AI, analyst
and committee outputs (kept separate), the methodology version and its
approval, the supervisory framework basis, cited regulatory evidence,
cycle-time against SLA, and the full hash-chained audit trail with its
verification result. The pack carries a SHA-256 digest of its own content.
"""

import csv
import hashlib
import io
import json
from datetime import datetime

from sqlalchemy.orm import Session

from backend.audit import verify_chain
from backend.cycle_time import compute_cycle_time
from backend.methodology_store import get_config_for_version
from backend.models import (
    AIRecommendation,
    AnalystOverride,
    ApprovalCondition,
    AuditEvent,
    ChangeRequest,
    CommitteeDecision,
    MethodologyVersion,
    RegulatoryEvidence,
    RiskAssessment,
    RiskFactor,
)
from backend.risk_methodology import _PDF_CSS, _cell, _table
from backend.serializers import serialize_condition
from risk_engine.methodology import (
    CATEGORIES,
    framework_refs_for_category,
    framework_refs_for_factor,
    load_framework,
)


def _iso(value):
    return value.isoformat() if value else None


def _json_list(value):
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except (TypeError, json.JSONDecodeError):
        return [str(value)]


def build_audit_pack(db: Session, change_request_id: int, generated_by: str) -> dict:
    change_request = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.id == change_request_id)
        .first()
    )
    if not change_request:
        raise ValueError("Change request not found")

    assessments = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.change_request_id == change_request_id)
        .order_by(RiskAssessment.id.asc())
        .all()
    )
    latest = assessments[-1] if assessments else None
    config = get_config_for_version(db, latest.risk_model_version if latest else None)
    methodology_row = (
        db.query(MethodologyVersion)
        .filter(MethodologyVersion.version == config["version"])
        .first()
    )

    factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .order_by(RiskFactor.id.asc())
        .all()
    )
    evidence = (
        db.query(RegulatoryEvidence)
        .filter(RegulatoryEvidence.change_request_id == change_request_id)
        .all()
    )
    ai = (
        db.query(AIRecommendation)
        .filter(AIRecommendation.change_request_id == change_request_id)
        .order_by(AIRecommendation.id.asc())
        .all()
    )
    reviews = (
        db.query(AnalystOverride)
        .filter(AnalystOverride.change_request_id == change_request_id)
        .order_by(AnalystOverride.id.asc())
        .all()
    )
    decisions = (
        db.query(CommitteeDecision)
        .filter(CommitteeDecision.change_request_id == change_request_id)
        .order_by(CommitteeDecision.id.asc())
        .all()
    )
    conditions = (
        db.query(ApprovalCondition)
        .filter(ApprovalCondition.change_request_id == change_request_id)
        .order_by(ApprovalCondition.id.asc())
        .all()
    )
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.change_request_id == change_request_id)
        .order_by(AuditEvent.id.asc())
        .all()
    )

    factor_names = {f.id: f"{f.risk_category}:{f.risk_factor}" for f in factors}
    sources = load_framework()["sources"]
    used_categories = sorted({f.risk_category for f in factors}, key=CATEGORIES.index)

    pack = {
        "pack_type": "MiniRiskers examiner audit pack",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "generated_by": generated_by,
        "principle": (
            "The system prepares, humans decide. System score, AI "
            "recommendation, analyst judgement and committee decision are "
            "stored separately and never overwrite one another."
        ),
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
            "status": change_request.status,
            "current_stage": change_request.current_stage,
            "revision": change_request.revision or 1,
            "created_at": _iso(change_request.created_at),
        },
        "system_assessments": [
            {
                "id": a.id,
                "revision": a.revision or 1,
                "methodology_version": a.risk_model_version,
                "calculated_at": _iso(a.created_at),
                "category_scores": {
                    "CUSTOMER": a.customer_risk_score,
                    "PRODUCT": a.product_risk_score,
                    "GEOGRAPHY": a.geography_risk_score,
                    "TRANSACTION": a.transaction_risk_score,
                    "CHANNEL": a.channel_risk_score,
                    "THIRD_PARTY": a.third_party_risk_score,
                    "FRAUD": a.fraud_risk_score,
                },
                "inherent_score": a.inherent_score,
                "inherent_rating": a.inherent_rating,
                "control_effectiveness": a.control_adjustment,
                "residual_score": a.residual_score,
                "residual_rating": a.residual_rating,
                "final_rating": a.final_rating,
                "status": a.assessment_status,
            }
            for a in assessments
        ],
        "risk_factors": [
            {
                "category": f.risk_category,
                "factor": f.risk_factor,
                "value": f.factor_value,
                "score": f.factor_score,
                "weight": f.factor_weight,
                "source": f.source_reference,
                "framework_basis": [
                    f"{sources.get(r['source'], {}).get('title', r['source'])} — {r['clause']}"
                    for r in framework_refs_for_factor(f.risk_category, f.risk_factor)
                ],
            }
            for f in factors
        ],
        "ai_recommendations": [
            {
                "id": r.id,
                "model": r.model_name,
                "model_version": r.model_version,
                "recommendation": r.recommendation,
                "summary": r.assessment_summary,
                "generated_at": _iso(r.generated_at),
                "status": r.status,
            }
            for r in ai
        ],
        "analyst_reviews": [
            {
                "id": r.id,
                "revision": r.revision or 1,
                "reviewed_by": r.reviewed_by,
                "reviewed_at": _iso(r.created_at),
                "system_rating": r.system_rating,
                "analyst_rating": r.analyst_rating,
                "override_direction": r.override_direction or "NONE",
                "band_delta": r.band_delta or 0,
                "override_reason": r.override_reason,
                "suggestions": r.consequences,
                "escalation_level": r.escalation_level or "NONE",
                "escalation_reasons": _json_list(r.escalation_reasons),
                "acknowledged_by": r.acknowledged_by,
                "acknowledged_at": _iso(r.acknowledged_at),
                "acknowledgement_note": r.acknowledgement_note,
            }
            for r in reviews
        ],
        "committee_decisions": [
            {
                "id": d.id,
                "revision": d.revision or 1,
                "decision": d.decision,
                "deferred_to": d.deferred_to,
                "rationale": d.rationale,
                "decided_by": d.decided_by,
                "decided_at": _iso(d.created_at),
            }
            for d in decisions
        ],
        "conditions": [
            {
                key: (_iso(value) if isinstance(value, datetime) else value)
                for key, value in serialize_condition(c).items()
            }
            for c in conditions
        ],
        "methodology": {
            "version": config["version"],
            "status": methodology_row.status if methodology_row else "BASELINE",
            "change_summary": methodology_row.change_summary if methodology_row else None,
            "proposed_by": methodology_row.created_by if methodology_row else None,
            "approved_by": methodology_row.approved_by if methodology_row else None,
            "approved_at": _iso(methodology_row.approved_at) if methodology_row else None,
            "category_weights": config["category_weights"],
            "rating_bands": config["rating_bands"],
            "concentration_rules": config["concentration_rules"],
            "override_policy": config["override_policy"],
            "sla_target_hours": config["workflow"]["sla_target_hours"],
        },
        "framework_basis": {
            "framework_version": load_framework()["framework_version"],
            "categories": [
                {
                    "category": category,
                    "references": [
                        f"{r['source_title']} — {r['clause']}"
                        for r in framework_refs_for_category(category)
                    ],
                }
                for category in used_categories
            ],
        },
        "regulatory_evidence": [
            {
                "risk_factor": factor_names.get(e.risk_factor_id),
                "authority": e.authority,
                "document": e.document_name,
                "page": e.page_number,
                "relevance_score": e.relevance_score,
                "excerpt": (e.evidence_text or "")[:400],
            }
            for e in evidence
        ],
        "cycle_time": compute_cycle_time(events, config),
        "audit_events": [
            {
                "sequence": index,
                "id": e.id,
                "timestamp": _iso(e.created_at),
                "actor": e.actor,
                "user_id": e.user_id,
                "action": e.action,
                "entity": f"{e.entity_type or ''}{'#' + str(e.entity_id) if e.entity_id else ''}",
                "old_value": e.old_value,
                "new_value": e.new_value,
                "reason": e.reason,
                "evidence": e.evidence,
                "model_version": e.model_version,
                "policy_version": e.policy_version,
                "prev_hash": e.prev_hash,
                "event_hash": e.event_hash,
            }
            for index, e in enumerate(events, start=1)
        ],
        "chain_verification": verify_chain(db, change_request_id),
    }
    pack["pack_digest_sha256"] = hashlib.sha256(
        json.dumps(pack, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()
    return pack


AUDIT_CSV_COLUMNS = [
    "request_number", "sequence", "id", "timestamp", "actor", "user_id",
    "action", "entity", "old_value", "new_value", "reason", "evidence",
    "model_version", "policy_version", "prev_hash", "event_hash",
]


def audit_events_to_csv(packs: list[dict]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=AUDIT_CSV_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    for pack in packs:
        number = pack["change_request"]["request_number"]
        for event in pack["audit_events"]:
            writer.writerow({"request_number": number, **event})
    return buffer.getvalue()


def _pack_html(pack: dict) -> str:
    cr = pack["change_request"]
    verification = pack["chain_verification"]
    cycle = pack["cycle_time"]
    methodology = pack["methodology"]
    parts = [
        "<h1>Examiner audit pack</h1>",
        f"<p><b>{_cell(cr['request_number'])}</b> — {_cell(cr['title'])}</p>",
        (
            f'<p class="muted">Generated {_cell(pack["generated_at"][:19].replace("T", " "))} UTC '
            f"by {_cell(pack['generated_by'])} · Status {_cell(cr['status'])} · "
            f"Stage {_cell(cr['current_stage'])} · Revision {cr['revision']}</p>"
        ),
        f"<p>{_cell(pack['principle'])}</p>",
        "<h2>1. Audit trail integrity</h2>",
        _table(
            ["Check", "Result"],
            [
                ["Hash chain", "VALID" if verification["valid"] else "BROKEN"],
                ["Events in chain", verification["event_count"]],
                ["Head hash", verification["head_hash"] or "—"],
                ["Algorithm", verification["algorithm"]],
                ["Pack digest (SHA-256)", pack["pack_digest_sha256"]],
            ],
        ),
    ]
    for problem in verification["problems"]:
        parts.append(f"<p><b>Event {problem['event_id']}:</b> {_cell(problem['issue'])}</p>")

    parts.append("<h2>2. Decision trail</h2>")
    parts.append("<h3>System assessment (deterministic)</h3>")
    parts.append(_table(
        ["Rev", "Methodology", "Inherent", "Controls", "Residual", "Final", "Calculated"],
        [
            [a["revision"], f"v{a['methodology_version']}",
             f"{a['inherent_score']} ({a['inherent_rating']})",
             f"{a['control_effectiveness']}%",
             f"{a['residual_score']} ({a['residual_rating']})",
             a["final_rating"] or "—", (a["calculated_at"] or "")[:16]]
            for a in pack["system_assessments"]
        ] or [["—", "", "", "", "", "", ""]],
    ))
    parts.append("<h3>AI recommendation (advisory)</h3>")
    parts.append(_table(
        ["Model", "Recommendation", "Generated"],
        [[r["model"], r["recommendation"], (r["generated_at"] or "")[:16]]
         for r in pack["ai_recommendations"]] or [["—", "", ""]],
    ))
    parts.append("<h3>Analyst review (human)</h3>")
    for review in pack["analyst_reviews"]:
        parts.append(_table(
            ["Field", "Value"],
            [
                ["Revision", review["revision"]],
                ["Reviewed by", f"{review['reviewed_by']} at {(review['reviewed_at'] or '')[:16]}"],
                ["System → analyst rating", f"{review['system_rating']} → {review['analyst_rating']}"],
                ["Override", f"{review['override_direction']} ({review['band_delta']:+d} bands)"],
                ["Reason", review["override_reason"] or "—"],
                ["Escalation", review["escalation_level"]],
                ["Escalation reasons", " ".join(review["escalation_reasons"]) or "—"],
                ["Acknowledged by committee",
                 f"{review['acknowledged_by']}: {review['acknowledgement_note']}"
                 if review["acknowledged_by"] else "—"],
            ],
        ))
    parts.append("<h3>Committee decisions (human)</h3>")
    parts.append(_table(
        ["Rev", "Decision", "Returned to", "Decided by", "Rationale", "Date"],
        [[d["revision"], d["decision"], d["deferred_to"] or "—", d["decided_by"],
          d["rationale"], (d["decided_at"] or "")[:16]]
         for d in pack["committee_decisions"]] or [["—", "", "", "", "", ""]],
    ))
    if pack["conditions"]:
        parts.append("<h3>Approval conditions</h3>")
        parts.append(_table(
            ["Condition", "Due", "Status", "Evidence", "Verified by"],
            [[c["description"], (c["due_date"] or "")[:10], c["status"],
              c["evidence_note"] or "—", c["verified_by"] or "—"]
             for c in pack["conditions"]],
        ))

    parts.append("<h2>3. Cycle time against SLA</h2>")
    parts.append(_table(
        ["Measure", "Value"],
        [
            ["Submitted", (cycle["submitted_at"] or "—")[:16]],
            ["Decided", (cycle["decided_at"] or "—")[:16]],
            ["SLA clock (hours)", cycle["sla_hours"] if cycle["sla_hours"] is not None else "—"],
            ["Paused while with Business Owner (hours)", cycle["paused_hours"]],
            ["Target (hours)", cycle["sla_target_hours"]],
            ["SLA status", cycle["sla_status"]],
            ["Deferrals", cycle["deferrals"]],
        ],
    ))
    parts.append(_table(
        ["Stage", "Hours", "Target"],
        [[s["label"], s["hours"], s["target_hours"] or "—"] for s in cycle["stages"]],
        numeric=(1, 2),
    ))

    parts.append("<h2>4. Methodology and framework basis</h2>")
    parts.append(
        f"<p>Scored under methodology <b>v{_cell(methodology['version'])}</b> "
        f"({_cell(methodology['status'])}), proposed by "
        f"{_cell(methodology['proposed_by'] or '—')}, approved by "
        f"{_cell(methodology['approved_by'] or '—')} "
        f"{_cell((methodology['approved_at'] or '')[:10])}.</p>"
    )
    parts.append(_table(
        ["Category", "Weight"],
        [[k, v] for k, v in methodology["category_weights"].items()],
        numeric=(1,),
    ))
    for category in pack["framework_basis"]["categories"]:
        parts.append(f"<h3>{_cell(category['category'])}</h3>")
        parts.append("<ul>" + "".join(
            f"<li>{_cell(ref)}</li>" for ref in category["references"]
        ) + "</ul>")
    parts.append(_table(
        ["Factor", "Value", "Score", "Weight", "Framework basis"],
        [[f"{f['category']}: {f['factor']}", f["value"], f["score"], f["weight"],
          "; ".join(f["framework_basis"])] for f in pack["risk_factors"]] or [["—", "", "", "", ""]],
        numeric=(2, 3),
    ))

    parts.append("<h2>5. Regulatory evidence cited</h2>")
    parts.append(_table(
        ["Risk factor", "Document", "Page", "Relevance"],
        [[e["risk_factor"] or "—", e["document"], e["page"], e["relevance_score"]]
         for e in pack["regulatory_evidence"]] or [["—", "", "", ""]],
    ))

    parts.append("<h2>6. Audit trail</h2>")
    parts.append(_table(
        ["#", "Timestamp (UTC)", "Actor", "Action", "Change", "Reason", "Hash"],
        [
            [
                e["sequence"],
                (e["timestamp"] or "")[:19].replace("T", " "),
                e["actor"],
                e["action"],
                " → ".join(v for v in (e["old_value"], e["new_value"]) if v) or "—",
                (e["reason"] or "")[:180],
                (e["event_hash"] or "")[:12],
            ]
            for e in pack["audit_events"]
        ],
    ))
    return f"<body>{''.join(parts)}</body>"


def audit_pack_to_pdf_bytes(pack: dict) -> bytes:
    import pymupdf

    story = pymupdf.Story(html=_pack_html(pack), user_css=_PDF_CSS)
    buffer = io.BytesIO()
    writer = pymupdf.DocumentWriter(buffer)
    mediabox = pymupdf.paper_rect("a4")
    where = mediabox + (36, 44, -36, -50)
    more = True
    while more:
        device = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(device)
        writer.end_page()
    writer.close()

    document = pymupdf.open("pdf", buffer.getvalue())
    label = (
        f"MiniRiskers · {pack['change_request']['request_number']} · "
        f"Examiner audit pack · digest {pack['pack_digest_sha256'][:16]}"
    )
    for index, page in enumerate(document, start=1):
        y = page.rect.height - 26
        page.insert_text((36, y), label, fontsize=7, color=(0.4, 0.45, 0.5))
        page.insert_text(
            (page.rect.width - 86, y),
            f"Page {index} of {document.page_count}",
            fontsize=7,
            color=(0.4, 0.45, 0.5),
        )
    output = document.tobytes()
    document.close()
    return output
