"""Tamper-evident audit trail.

Every AuditEvent stores a SHA-256 hash of its own content plus the hash of
the previous event for the same change request, forming one hash chain per
request. Editing, deleting or re-ordering any sealed event breaks the chain,
which `verify_chain` detects. On SQLite, triggers also reject UPDATE and
DELETE on sealed rows, so the table is append-only in practice as well as
in principle.
"""

import hashlib
import json
from datetime import datetime

from sqlalchemy import event as sa_event, inspect, text
from sqlalchemy.orm import Session

from backend.models import AuditEvent

GENESIS_HASH = "0" * 64

HASHED_FIELDS = (
    "change_request_id",
    "actor",
    "user_id",
    "action",
    "entity_type",
    "entity_id",
    "old_value",
    "new_value",
    "reason",
    "evidence",
    "model_version",
    "policy_version",
)


def _timestamp(value: datetime | None) -> str | None:
    return value.isoformat(timespec="microseconds") if value else None


def compute_event_hash(event: AuditEvent, prev_hash: str) -> str:
    payload = {field: getattr(event, field) for field in HASHED_FIELDS}
    payload["created_at"] = _timestamp(event.created_at)
    payload["prev_hash"] = prev_hash
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _chain_head(db: Session, change_request_id: int) -> str:
    last = (
        db.query(AuditEvent.event_hash)
        .filter(
            AuditEvent.change_request_id == change_request_id,
            AuditEvent.event_hash.isnot(None),
        )
        .order_by(AuditEvent.id.desc())
        .first()
    )
    return last[0] if last else GENESIS_HASH


def create_audit_event(
    db: Session,
    change_request_id: int,
    actor: str,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    old_value: str = None,
    new_value: str = None,
    reason: str = None,
    evidence: str = None,
    model_version: str = None,
    policy_version: str = None,
    user_id: int = None,
):
    event = AuditEvent(
        change_request_id=change_request_id,
        actor=actor,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        evidence=evidence,
        model_version=model_version,
        policy_version=policy_version,
        created_at=datetime.utcnow(),
    )
    # Values are stored as text; normalise before hashing so the hash
    # recomputed from the stored row matches.
    for field in ("old_value", "new_value", "reason", "evidence"):
        value = getattr(event, field)
        if value is not None and not isinstance(value, str):
            setattr(event, field, str(value))

    event.prev_hash = _chain_head(db, change_request_id)
    event.event_hash = compute_event_hash(event, event.prev_hash)

    db.add(event)
    # Flush so the next event in the same transaction chains onto this one.
    db.flush()

    return event


def verify_chain(db: Session, change_request_id: int) -> dict:
    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.change_request_id == change_request_id)
        .order_by(AuditEvent.id.asc())
        .all()
    )
    expected_prev = GENESIS_HASH
    problems = []
    unsealed = 0

    for event in events:
        if not event.event_hash:
            unsealed += 1
            problems.append({
                "event_id": event.id,
                "issue": "Event is not sealed (no hash).",
            })
            continue
        if event.prev_hash != expected_prev:
            problems.append({
                "event_id": event.id,
                "issue": (
                    "Chain link broken: previous-hash does not match the "
                    "preceding event (an event was removed or reordered)."
                ),
            })
        recomputed = compute_event_hash(event, event.prev_hash)
        if recomputed != event.event_hash:
            problems.append({
                "event_id": event.id,
                "issue": "Content hash mismatch: the event was modified after it was recorded.",
            })
        expected_prev = event.event_hash

    return {
        "change_request_id": change_request_id,
        "valid": not problems,
        "event_count": len(events),
        "unsealed_count": unsealed,
        "head_hash": expected_prev if events else None,
        "problems": problems,
        "algorithm": "SHA-256 hash chain per change request",
        "verified_at": datetime.utcnow().isoformat() + "Z",
    }


def seal_legacy_events(db: Session) -> int:
    """Chain events recorded before hashing existed (one-off migration)."""
    pending = (
        db.query(AuditEvent)
        .filter(AuditEvent.event_hash.is_(None))
        .order_by(AuditEvent.id.asc())
        .all()
    )
    if not pending:
        return 0

    heads: dict[int, str] = {}
    for event in pending:
        request_id = event.change_request_id
        if request_id not in heads:
            heads[request_id] = _chain_head(db, request_id)
        if event.created_at is None:
            event.created_at = datetime.utcnow()
        event.prev_hash = heads[request_id]
        event.event_hash = compute_event_hash(event, event.prev_hash)
        heads[request_id] = event.event_hash
    db.commit()
    return len(pending)


def install_append_only_guards(engine) -> None:
    """Reject UPDATE/DELETE of sealed audit rows at the database level."""
    if engine.dialect.name != "sqlite":
        return
    if "audit_events" not in inspect(engine).get_table_names():
        return
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TRIGGER IF NOT EXISTS audit_events_no_update "
            "BEFORE UPDATE ON audit_events "
            "WHEN OLD.event_hash IS NOT NULL "
            "BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;"
        ))
        connection.execute(text(
            "CREATE TRIGGER IF NOT EXISTS audit_events_no_delete "
            "BEFORE DELETE ON audit_events "
            "WHEN OLD.event_hash IS NOT NULL "
            "BEGIN SELECT RAISE(ABORT, 'audit_events is append-only'); END;"
        ))


@sa_event.listens_for(AuditEvent, "before_update")
def _block_audit_update(mapper, connection, target):
    history = inspect(target).attrs.event_hash.history
    was_sealed = bool(history.deleted and history.deleted[0]) or (
        not history.has_changes() and target.event_hash
    )
    if was_sealed:
        raise ValueError("Audit events are append-only and cannot be modified.")


@sa_event.listens_for(AuditEvent, "before_delete")
def _block_audit_delete(mapper, connection, target):
    if target.event_hash:
        raise ValueError("Audit events are append-only and cannot be deleted.")
