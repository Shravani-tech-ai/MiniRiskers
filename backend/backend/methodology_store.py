"""Database access for versioned risk methodologies."""

import json
from datetime import datetime

from sqlalchemy.orm import Session

from backend.models import MethodologyEvent, MethodologyVersion
from risk_engine.methodology import default_config

STATUS_DRAFT = "DRAFT"
STATUS_PENDING = "PENDING_APPROVAL"
STATUS_ACTIVE = "ACTIVE"
STATUS_RETIRED = "RETIRED"
STATUS_REJECTED = "REJECTED"


def parse_config(row: MethodologyVersion) -> dict:
    config = json.loads(row.config_json)
    config["version"] = row.version
    return config


def record_methodology_event(
    db: Session,
    row: MethodologyVersion,
    action: str,
    actor: str,
    user_id: int | None = None,
    note: str | None = None,
) -> None:
    db.add(MethodologyEvent(
        methodology_version_id=row.id,
        version=row.version,
        action=action,
        actor=actor,
        user_id=user_id,
        note=note,
    ))


def ensure_default_methodology(db: Session) -> None:
    """Seed version 1.0 (the original engine constants) as ACTIVE."""
    if db.query(MethodologyVersion.id).first():
        return
    config = default_config()
    row = MethodologyVersion(
        version=config["version"],
        status=STATUS_ACTIVE,
        config_json=json.dumps(config),
        change_summary=(
            "Baseline methodology: the weights, bands, floors and factor "
            "scores the risk engine shipped with."
        ),
        created_by="System",
        approved_by="System (baseline)",
        approved_at=datetime.utcnow(),
        effective_from=datetime.utcnow(),
    )
    db.add(row)
    db.flush()
    record_methodology_event(
        db, row, "SEEDED", "System", note="Baseline methodology seeded."
    )
    db.commit()


def get_active_methodology(db: Session) -> tuple[MethodologyVersion, dict]:
    row = (
        db.query(MethodologyVersion)
        .filter(MethodologyVersion.status == STATUS_ACTIVE)
        .order_by(MethodologyVersion.id.desc())
        .first()
    )
    if row is None:
        ensure_default_methodology(db)
        return get_active_methodology(db)
    return row, parse_config(row)


def get_config_for_version(db: Session, version: str | None) -> dict:
    """Config an assessment was scored under (falls back to the baseline)."""
    if version:
        row = (
            db.query(MethodologyVersion)
            .filter(MethodologyVersion.version == version)
            .first()
        )
        if row is not None:
            return parse_config(row)
    if version in (None, "", "1.0"):
        return default_config()
    return get_active_methodology(db)[1]


def next_version_number(db: Session) -> str:
    versions = [row.version for row in db.query(MethodologyVersion).all()]
    best = (1, 0)
    for value in versions:
        try:
            major, minor = (int(part) for part in value.split(".")[:2])
        except ValueError:
            continue
        best = max(best, (major, minor))
    return f"{best[0]}.{best[1] + 1}"
