"""Control library (Admin-maintained) and structured per-request controls.

Mirrors how banks run a risk-and-control framework: a standard catalogue of
controls, each with a type (preventive / detective / corrective), nature
(manual / automated), frequency, key-control flag and mapping to the risk
categories and regulations it addresses. Analysts pick controls for a
request from the library and record tested design and operating
effectiveness; the effectiveness score is derived from those ratings under
the active methodology rather than typed in.
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.audit import create_audit_event
from backend.auth import audit_actor_name, get_current_user
from backend.database import get_db
from backend.methodology_store import get_active_methodology
from backend.models import Control, LibraryControl, User
from backend.permissions import (
    ROLE_ADMIN,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    assert_role,
    assert_submitted,
    assert_workflow_stage,
    get_change_request_or_404,
)
from risk_engine.methodology import (
    CATEGORIES,
    CONTROL_RATINGS,
    rated_control_effectiveness,
)

router = APIRouter(tags=["Controls"])

CONTROL_TYPES = ["PREVENTIVE", "DETECTIVE", "CORRECTIVE"]
CONTROL_NATURES = ["MANUAL", "AUTOMATED", "HYBRID"]
FREQUENCIES = [
    "CONTINUOUS",
    "PER_EVENT",
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "ANNUAL",
]

# Same stages as backend.main.CONTROL_EDITABLE_STAGES.
CONTROL_EDITABLE_STAGES = {
    "RISK_ASSESSMENT",
    "REGULATORY_EVIDENCE",
    "AI_ASSESSMENT",
    "ANALYST_REVIEW",
}

# Standard financial-crime controls the library starts with.
SEED_CONTROLS = [
    {
        "code": "CDD-01",
        "name": "Customer due diligence (KYC) at onboarding",
        "description": "Identify and verify customers and beneficial owners before establishing the relationship.",
        "risk_categories": ["CUSTOMER", "CHANNEL"],
        "control_type": "PREVENTIVE",
        "control_nature": "HYBRID",
        "frequency": "PER_EVENT",
        "is_key_control": True,
        "owner": "Operations / KYC",
        "regulatory_references": "RBI Master Direction on KYC; PML Rules 2005 Rule 9",
    },
    {
        "code": "EDD-01",
        "name": "Enhanced due diligence for high-risk customers",
        "description": "Additional verification, source of funds/wealth and senior approval for high-risk and PEP customers.",
        "risk_categories": ["CUSTOMER"],
        "control_type": "PREVENTIVE",
        "control_nature": "MANUAL",
        "frequency": "PER_EVENT",
        "is_key_control": True,
        "owner": "FCRM",
        "regulatory_references": "RBI Master Direction on KYC (EDD, PEPs)",
    },
    {
        "code": "SCR-01",
        "name": "Sanctions screening",
        "description": "Screen customers, counterparties and payments against UN/domestic sanctions lists, including UAPA 51A designations.",
        "risk_categories": ["CUSTOMER", "GEOGRAPHY", "TRANSACTION"],
        "control_type": "PREVENTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "CONTINUOUS",
        "is_key_control": True,
        "owner": "Sanctions Compliance",
        "regulatory_references": "Section 51A UAPA implementation procedure",
    },
    {
        "code": "PEP-01",
        "name": "PEP and adverse media screening",
        "description": "Identify politically exposed persons and adverse media at onboarding and periodically.",
        "risk_categories": ["CUSTOMER"],
        "control_type": "DETECTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "DAILY",
        "is_key_control": False,
        "owner": "FCRM",
        "regulatory_references": "RBI Master Direction on KYC",
    },
    {
        "code": "TM-01",
        "name": "Transaction monitoring scenarios",
        "description": "Automated scenarios that alert on unusual velocity, structuring, rapid movement of funds and high-risk corridors.",
        "risk_categories": ["TRANSACTION", "GEOGRAPHY", "PRODUCT"],
        "control_type": "DETECTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "CONTINUOUS",
        "is_key_control": True,
        "owner": "FCRM / Monitoring",
        "regulatory_references": "PMLA 2002 s.12; FIU-IND reporting",
    },
    {
        "code": "STR-01",
        "name": "Suspicious transaction reporting to FIU-IND",
        "description": "Investigation of alerts and timely filing of STRs/CTRs with FIU-IND.",
        "risk_categories": ["TRANSACTION"],
        "control_type": "CORRECTIVE",
        "control_nature": "MANUAL",
        "frequency": "PER_EVENT",
        "is_key_control": True,
        "owner": "Principal Officer",
        "regulatory_references": "PMLA 2002 s.12; FIU-IND reporting format",
    },
    {
        "code": "LIM-01",
        "name": "Transaction and product limits",
        "description": "Per-transaction, daily and cumulative limits enforced in the product.",
        "risk_categories": ["PRODUCT", "TRANSACTION"],
        "control_type": "PREVENTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "CONTINUOUS",
        "is_key_control": False,
        "owner": "Product",
        "regulatory_references": "",
    },
    {
        "code": "DIG-01",
        "name": "Digital onboarding identity verification (V-CIP / liveness)",
        "description": "Video-based customer identification and liveness checks for non-face-to-face onboarding.",
        "risk_categories": ["CHANNEL", "CUSTOMER", "FRAUD"],
        "control_type": "PREVENTIVE",
        "control_nature": "HYBRID",
        "frequency": "PER_EVENT",
        "is_key_control": True,
        "owner": "Digital Channels",
        "regulatory_references": "RBI Master Direction on KYC (V-CIP)",
    },
    {
        "code": "FRD-01",
        "name": "Fraud detection and early warning signals",
        "description": "Real-time fraud rules, device fingerprinting and early warning signals with case management.",
        "risk_categories": ["FRAUD", "CHANNEL"],
        "control_type": "DETECTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "CONTINUOUS",
        "is_key_control": True,
        "owner": "Fraud Risk Management",
        "regulatory_references": "RBI Master Directions on Fraud Risk Management",
    },
    {
        "code": "TPR-01",
        "name": "Third-party due diligence and outsourcing oversight",
        "description": "Due diligence, contractual AML obligations, audit rights and periodic review of vendors and agents.",
        "risk_categories": ["THIRD_PARTY"],
        "control_type": "PREVENTIVE",
        "control_nature": "MANUAL",
        "frequency": "ANNUAL",
        "is_key_control": True,
        "owner": "Vendor Risk",
        "regulatory_references": "RBI Master Direction on Outsourcing of IT Services, 2023",
    },
    {
        "code": "REC-01",
        "name": "Record keeping and retention",
        "description": "Retain transaction and identification records for the statutory period and make them retrievable.",
        "risk_categories": ["TRANSACTION", "CUSTOMER"],
        "control_type": "PREVENTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "CONTINUOUS",
        "is_key_control": False,
        "owner": "Operations",
        "regulatory_references": "PML (Maintenance of Records) Rules, 2005",
    },
    {
        "code": "GEO-01",
        "name": "High-risk jurisdiction restrictions",
        "description": "Block or escalate transactions involving FATF high-risk or restricted jurisdictions.",
        "risk_categories": ["GEOGRAPHY"],
        "control_type": "PREVENTIVE",
        "control_nature": "AUTOMATED",
        "frequency": "CONTINUOUS",
        "is_key_control": True,
        "owner": "FCRM",
        "regulatory_references": "FATF high-risk jurisdiction lists",
    },
    {
        "code": "TRN-01",
        "name": "AML training for staff and agents",
        "description": "Periodic AML/CFT training for staff, business correspondents and agents.",
        "risk_categories": [],
        "control_type": "PREVENTIVE",
        "control_nature": "MANUAL",
        "frequency": "ANNUAL",
        "is_key_control": False,
        "owner": "Compliance",
        "regulatory_references": "",
    },
]


def ensure_control_library_seeded(db: Session) -> None:
    if db.query(LibraryControl.id).first():
        return
    for entry in SEED_CONTROLS:
        db.add(LibraryControl(
            **{**entry, "risk_categories": json.dumps(entry["risk_categories"])},
            default_design_rating="EFFECTIVE",
            default_operating_rating="NOT_TESTED",
            created_by="System (standard library)",
        ))
    db.commit()


def _categories(value: Optional[str]) -> list[str]:
    try:
        parsed = json.loads(value or "[]")
    except (TypeError, json.JSONDecodeError):
        return []
    return [c for c in parsed if c in CATEGORIES]


def serialize_library_control(row: LibraryControl) -> dict:
    return {
        "id": row.id,
        "code": row.code,
        "name": row.name,
        "description": row.description,
        "risk_categories": _categories(row.risk_categories),
        "control_type": row.control_type,
        "control_nature": row.control_nature,
        "frequency": row.frequency,
        "is_key_control": bool(row.is_key_control),
        "owner": row.owner,
        "regulatory_references": row.regulatory_references,
        "default_design_rating": row.default_design_rating,
        "default_operating_rating": row.default_operating_rating,
        "active": bool(row.active),
        "created_by": row.created_by,
        "updated_by": row.updated_by,
        "updated_at": row.updated_at,
    }


def serialize_control(control: Control) -> dict:
    return {
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
        "library_control_id": control.library_control_id,
        "design_effectiveness_rating": control.design_effectiveness_rating,
        "operating_effectiveness_rating": control.operating_effectiveness_rating,
        "mapped_categories": _categories(control.mapped_categories),
        "control_nature": control.control_nature,
        "frequency": control.frequency,
        "is_key_control": bool(control.is_key_control),
    }


class LibraryControlPayload(BaseModel):
    code: str
    name: str
    description: str = ""
    risk_categories: list[str] = []
    control_type: str = "PREVENTIVE"
    control_nature: str = "MANUAL"
    frequency: str = "PER_EVENT"
    is_key_control: bool = False
    owner: str = ""
    regulatory_references: str = ""
    default_design_rating: str = "EFFECTIVE"
    default_operating_rating: str = "NOT_TESTED"
    active: bool = True


def _validate_library_payload(payload: LibraryControlPayload) -> None:
    problems = []
    if not payload.code.strip() or not payload.name.strip():
        problems.append("Code and name are required.")
    if payload.control_type not in CONTROL_TYPES:
        problems.append("Unknown control type.")
    if payload.control_nature not in CONTROL_NATURES:
        problems.append("Unknown control nature.")
    if payload.frequency not in FREQUENCIES:
        problems.append("Unknown frequency.")
    if any(c not in CATEGORIES for c in payload.risk_categories):
        problems.append("Unknown risk category.")
    if payload.default_design_rating not in CONTROL_RATINGS or (
        payload.default_operating_rating not in CONTROL_RATINGS
    ):
        problems.append("Unknown effectiveness rating.")
    if problems:
        raise HTTPException(status_code=400, detail=" ".join(problems))


@router.get("/control-library")
def list_library(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_RISK_ANALYST, ROLE_RISK_COMMITTEE, ROLE_ADMIN)
    query = db.query(LibraryControl)
    if not (include_inactive and current_user.role == ROLE_ADMIN):
        query = query.filter(LibraryControl.active.is_(True))
    rows = query.order_by(LibraryControl.code.asc()).all()
    return {
        "controls": [serialize_library_control(row) for row in rows],
        "options": {
            "control_types": CONTROL_TYPES,
            "control_natures": CONTROL_NATURES,
            "frequencies": FREQUENCIES,
            "ratings": CONTROL_RATINGS,
            "categories": CATEGORIES,
        },
    }


@router.post("/control-library", status_code=201)
def create_library_control(
    payload: LibraryControlPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    _validate_library_payload(payload)
    code = payload.code.strip().upper()
    if db.query(LibraryControl.id).filter(LibraryControl.code == code).first():
        raise HTTPException(status_code=409, detail=f"Control code {code} already exists.")
    actor = audit_actor_name(current_user)
    row = LibraryControl(
        **{
            **payload.model_dump(),
            "code": code,
            "name": payload.name.strip(),
            "risk_categories": json.dumps(payload.risk_categories),
        },
        created_by=actor,
        updated_by=actor,
    )
    db.add(row)
    db.commit()
    return serialize_library_control(row)


@router.put("/control-library/{control_id}")
def update_library_control(
    control_id: int,
    payload: LibraryControlPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    _validate_library_payload(payload)
    row = db.get(LibraryControl, control_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Library control not found.")
    code = payload.code.strip().upper()
    clash = (
        db.query(LibraryControl.id)
        .filter(LibraryControl.code == code, LibraryControl.id != control_id)
        .first()
    )
    if clash:
        raise HTTPException(status_code=409, detail=f"Control code {code} already exists.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    row.code = code
    row.name = payload.name.strip()
    row.risk_categories = json.dumps(payload.risk_categories)
    row.updated_by = audit_actor_name(current_user)
    row.updated_at = datetime.utcnow()
    db.commit()
    return serialize_library_control(row)


class RequestControlPayload(BaseModel):
    library_control_id: Optional[int] = None
    # Required for custom controls; ignored when picked from the library
    # unless given (to tailor the name to the request).
    control_name: str = ""
    description: str = ""
    risk_categories: list[str] = []
    control_type: str = "PREVENTIVE"
    control_nature: str = "MANUAL"
    frequency: str = "PER_EVENT"
    is_key_control: bool = False
    owner: str = ""
    design_effectiveness_rating: str
    operating_effectiveness_rating: str
    implementation_status: str = "IMPLEMENTED"


def _authorize_control_edit(db: Session, change_request_id: int, user: User):
    change_request = get_change_request_or_404(db, change_request_id, user)
    assert_role(user, ROLE_RISK_ANALYST, ROLE_ADMIN)
    assert_submitted(change_request)
    assert_workflow_stage(
        change_request,
        CONTROL_EDITABLE_STAGES,
        "Controls can no longer be changed at the current workflow stage.",
    )
    return change_request


@router.post("/change-requests/{change_request_id}/controls", status_code=201)
def add_request_control(
    change_request_id: int,
    payload: RequestControlPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _authorize_control_edit(db, change_request_id, current_user)
    if (
        payload.design_effectiveness_rating not in CONTROL_RATINGS
        or payload.operating_effectiveness_rating not in CONTROL_RATINGS
    ):
        raise HTTPException(status_code=400, detail="Choose design and operating effectiveness ratings.")

    library = None
    if payload.library_control_id:
        library = db.get(LibraryControl, payload.library_control_id)
        if library is None or not library.active:
            raise HTTPException(status_code=404, detail="Library control not found.")
        name = payload.control_name.strip() or library.name
        categories = _categories(library.risk_categories)
        fields = {
            "control_type": library.control_type,
            "control_nature": library.control_nature,
            "frequency": library.frequency,
            "is_key_control": bool(library.is_key_control),
            "owner": library.owner,
            "description": payload.description.strip() or library.description,
        }
    else:
        if not payload.control_name.strip():
            raise HTTPException(status_code=400, detail="Name the custom control.")
        if payload.control_type not in CONTROL_TYPES or payload.control_nature not in CONTROL_NATURES:
            raise HTTPException(status_code=400, detail="Unknown control type or nature.")
        if any(c not in CATEGORIES for c in payload.risk_categories):
            raise HTTPException(status_code=400, detail="Unknown risk category.")
        name = payload.control_name.strip()
        categories = payload.risk_categories
        fields = {
            "control_type": payload.control_type,
            "control_nature": payload.control_nature,
            "frequency": payload.frequency,
            "is_key_control": payload.is_key_control,
            "owner": payload.owner.strip() or None,
            "description": payload.description.strip() or None,
        }

    config = get_active_methodology(db)[1]
    score = rated_control_effectiveness(
        payload.design_effectiveness_rating,
        payload.operating_effectiveness_rating,
        config,
    )
    control = Control(
        change_request_id=change_request_id,
        control_name=name,
        control_category=", ".join(categories) if categories else "ALL",
        control_strength=payload.operating_effectiveness_rating,
        implemented=payload.implementation_status == "IMPLEMENTED",
        implementation_status=payload.implementation_status,
        effectiveness_score=score,
        library_control_id=library.id if library else None,
        design_effectiveness_rating=payload.design_effectiveness_rating,
        operating_effectiveness_rating=payload.operating_effectiveness_rating,
        mapped_categories=json.dumps(categories),
        **fields,
    )
    db.add(control)
    db.flush()
    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="CONTROL_ADDED",
        entity_type="Control",
        entity_id=control.id,
        new_value=f"{name} ({score:g}%)",
        reason=(
            f"Design {payload.design_effectiveness_rating}, operating "
            f"{payload.operating_effectiveness_rating}"
            + (f"; library control {library.code}" if library else "; custom control")
            + "."
        ),
        policy_version=config["version"],
    )
    db.commit()
    return serialize_control(control)


@router.delete("/change-requests/{change_request_id}/controls/{control_id}")
def remove_request_control(
    change_request_id: int,
    control_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _authorize_control_edit(db, change_request_id, current_user)
    control = (
        db.query(Control)
        .filter(Control.id == control_id, Control.change_request_id == change_request_id)
        .first()
    )
    if control is None:
        raise HTTPException(status_code=404, detail="Control not found.")
    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="CONTROL_REMOVED",
        entity_type="Control",
        entity_id=control.id,
        old_value=control.control_name,
        reason="Control removed by analyst.",
    )
    db.delete(control)
    db.commit()
    return {"removed": control_id}
