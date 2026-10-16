"""Admin console: settings, users, model training and oversight."""

import copy
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import audit_actor_name, get_current_user
from backend.database import get_db
from backend.feedback_routes import feedback_summary
from backend.learning import (
    OVERRIDE_REASON_CODES,
    model_performance,
    run_training,
    serialize_run,
)
from backend.methodology_store import (
    STATUS_DRAFT,
    STATUS_PENDING,
    get_active_methodology,
    next_version_number,
    record_methodology_event,
)
from backend.models import (
    ChangeRequest,
    MethodologyVersion,
    RegulatorySource,
    TrainingRun,
    User,
)
from backend.notifications import active_users_with_roles, notify_users
from backend.permissions import (
    ALL_ROLES,
    ROLE_ADMIN,
    ROLE_RISK_COMMITTEE,
    assert_role,
)
from backend.system_settings import (
    SettingError,
    describe_settings,
    get_setting,
    update_settings,
)
from risk_engine.methodology import validate_config

router = APIRouter(tags=["Admin"])


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@router.get("/admin/settings")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    return {"settings": describe_settings(db)}


@router.put("/admin/settings")
def put_settings(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    try:
        update_settings(db, payload, audit_actor_name(current_user))
    except SettingError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"settings": describe_settings(db)}


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "role_retired": user.role not in ALL_ROLES,
        "created_at": user.created_at,
    }


@router.get("/admin/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    users = db.query(User).order_by(User.created_at.asc()).all()
    return {"users": [_serialize_user(user) for user in users]}


class UserUpdatePayload(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.patch("/admin/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot change your own role or deactivate yourself.",
        )
    if payload.role is not None:
        if payload.role not in ALL_ROLES:
            raise HTTPException(status_code=400, detail="Unknown role.")
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    db.commit()
    return _serialize_user(user)


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/admin/overview")
def admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    latest_run = db.query(TrainingRun).order_by(TrainingRun.id.desc()).first()
    feedback = feedback_summary(db)
    performance = model_performance(db)
    return {
        "pending_methodology": db.query(MethodologyVersion)
        .filter(MethodologyVersion.status == STATUS_PENDING)
        .count(),
        "pending_regulations": db.query(RegulatorySource)
        .filter(RegulatorySource.status == "PENDING_APPROVAL")
        .count(),
        "failed_regulation_indexing": db.query(RegulatorySource)
        .filter(RegulatorySource.index_status == "FAILED")
        .count(),
        "active_users": db.query(User).filter(User.is_active.is_(True)).count(),
        "users_needing_role": db.query(User)
        .filter(User.role.notin_(list(ALL_ROLES)))
        .count(),
        "open_requests": db.query(ChangeRequest)
        .filter(ChangeRequest.current_stage != "COMPLETED")
        .count(),
        "decided_cases": performance["decided_cases"],
        "system_vs_final_agreement": performance["system_vs_final_agreement"],
        "training_min_cases": get_setting(db, "training_min_cases"),
        "average_feedback_rating": feedback["average_rating"],
        "feedback_responses": feedback["responses"],
        "latest_training_run": serialize_run(latest_run) if latest_run else None,
    }


@router.get("/admin/feedback-summary")
def get_feedback_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    return feedback_summary(db)


@router.get("/admin/model-performance")
def get_model_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    return model_performance(db)


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

@router.get("/override-reason-codes")
def override_reason_codes(current_user: User = Depends(get_current_user)):
    return {
        "codes": [
            {"code": code, "label": label} for code, label in OVERRIDE_REASON_CODES.items()
        ]
    }


@router.get("/training-runs")
def list_training_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN, ROLE_RISK_COMMITTEE)
    query = db.query(TrainingRun)
    if current_user.role == ROLE_RISK_COMMITTEE:
        # The committee sees only suggestions an Admin has shared.
        query = query.filter(TrainingRun.shared_at.isnot(None))
    runs = query.order_by(TrainingRun.id.desc()).limit(50).all()
    return {"runs": [serialize_run(run) for run in runs]}


@router.post("/training-runs", status_code=201)
def start_training_run(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    run = run_training(db, audit_actor_name(current_user), current_user.id)
    return serialize_run(run)


@router.post("/training-runs/{run_id}/share")
def share_training_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    run = db.get(TrainingRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Training run not found.")
    if run.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Only completed runs can be shared.")
    if run.shared_at is None:
        run.shared_at = datetime.utcnow()
        run.shared_by = audit_actor_name(current_user)
        notify_users(
            db,
            active_users_with_roles(db, ROLE_RISK_COMMITTEE),
            notification_type=f"TRAINING_SHARED_{run.id}",
            title="Suggested methodology weights from model training",
            body=(
                f"{run.shared_by} shared training run #{run.id}. Review it on "
                "/methodology and start a draft if you agree."
            ),
            link_path="/methodology",
        )
        db.commit()
    return serialize_run(run)


@router.post("/training-runs/{run_id}/adopt")
def adopt_training_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Risk Committee starts a methodology draft from shared suggestions."""
    assert_role(current_user, ROLE_RISK_COMMITTEE)
    run = db.get(TrainingRun, run_id)
    if run is None or run.shared_at is None:
        raise HTTPException(status_code=404, detail="Training suggestion not found.")
    if run.adopted_methodology_version_id:
        raise HTTPException(status_code=400, detail="A draft was already started from this run.")
    open_draft = (
        db.query(MethodologyVersion.id)
        .filter(MethodologyVersion.status.in_([STATUS_DRAFT, STATUS_PENDING]))
        .first()
    )
    if open_draft:
        raise HTTPException(
            status_code=400,
            detail="Finish or withdraw the open methodology draft first.",
        )

    active_row, active_config = get_active_methodology(db)
    config = copy.deepcopy(active_config)
    config["category_weights"] = json.loads(run.suggested_weights_json)
    version = next_version_number(db)
    config["version"] = version
    errors = validate_config(config, active_config)
    if errors:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})

    actor = audit_actor_name(current_user)
    row = MethodologyVersion(
        version=version,
        status=STATUS_DRAFT,
        config_json=json.dumps(config),
        change_summary=(
            f"Category weights recalibrated from training run #{run.id} "
            f"({run.cases_used} decided cases). {run.message or ''}"
        ).strip(),
        based_on_version=active_row.version,
        created_by=actor,
        created_by_user_id=current_user.id,
    )
    db.add(row)
    db.flush()
    record_methodology_event(
        db, row, "DRAFT_CREATED", actor, current_user.id,
        f"Drafted from training run #{run.id} on v{active_row.version}.",
    )
    run.adopted_methodology_version_id = row.id
    db.commit()
    return {"methodology_version_id": row.id, "version": row.version}
