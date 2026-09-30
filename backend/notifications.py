"""In-app notifications for workflow events and SLA reminders."""

import json
from datetime import datetime

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.cycle_time import compute_cycle_time
from backend.methodology_store import get_active_methodology
from backend.models import ApprovalCondition, AuditEvent, ChangeRequest, Notification, User
from backend.permissions import (
    ROLE_ADMIN,
    ROLE_BUSINESS_OWNER,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    is_submitted,
)

STAGE_SLA_LABELS = {
    "AWAITING_ANALYST": "Awaiting analyst pickup",
    "RISK_ASSESSMENT": "Risk assessment",
    "ANALYST_REVIEW": "Analyst review",
    "COMMITTEE_REVIEW": "Committee review",
}


def request_label(change_request: ChangeRequest) -> str:
    return change_request.request_number or f"CR-{change_request.id}"


def assessment_link(change_request: ChangeRequest) -> str:
    return f"/assessment/{change_request.id}"


def _identity_matches(stored: str | None, user: User) -> bool:
    if not stored:
        return False
    normalized = stored.strip().lower()
    return normalized in {
        user.username.lower(),
        (user.full_name or "").strip().lower(),
    }


def find_users_matching_identity(db: Session, identity: str | None) -> list[User]:
    if not identity or not identity.strip():
        return []
    normalized = identity.strip().lower()
    return (
        db.query(User)
        .filter(
            User.is_active.is_(True),
            or_(
                func.lower(User.username) == normalized,
                func.lower(User.full_name) == normalized,
            ),
        )
        .all()
    )


def active_users_with_roles(db: Session, *roles: str) -> list[User]:
    return (
        db.query(User)
        .filter(User.is_active.is_(True), User.role.in_(roles))
        .all()
    )


def users_for_business_owner(db: Session, change_request: ChangeRequest) -> list[User]:
    matched = find_users_matching_identity(db, change_request.requested_by)
    if matched:
        return matched
    return active_users_with_roles(db, ROLE_BUSINESS_OWNER)


def users_for_analysts(db: Session, change_request: ChangeRequest) -> list[User]:
    assigned = (change_request.assigned_analyst or "").strip()
    if assigned:
        matched = find_users_matching_identity(db, assigned)
        if matched:
            return matched
    return active_users_with_roles(db, ROLE_RISK_ANALYST, ROLE_ADMIN)


def users_for_committee(db: Session) -> list[User]:
    return active_users_with_roles(db, ROLE_RISK_COMMITTEE, ROLE_ADMIN)


def _already_notified(
    db: Session,
    user_id: int,
    notification_type: str,
    change_request_id: int | None = None,
) -> bool:
    query = db.query(Notification.id).filter(
        Notification.user_id == user_id,
        Notification.notification_type == notification_type,
    )
    if change_request_id is not None:
        query = query.filter(Notification.change_request_id == change_request_id)
    return query.first() is not None


def create_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    title: str,
    body: str = "",
    change_request_id: int | None = None,
    link_path: str | None = None,
    metadata: dict | None = None,
    dedupe: bool = True,
) -> Notification | None:
    if dedupe and _already_notified(
        db, user_id, notification_type, change_request_id
    ):
        return None

    notification = Notification(
        user_id=user_id,
        change_request_id=change_request_id,
        notification_type=notification_type,
        title=title,
        body=body,
        link_path=link_path,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(notification)
    return notification


def notify_users(
    db: Session,
    users: list[User],
    *,
    notification_type: str,
    title: str,
    body: str = "",
    change_request_id: int | None = None,
    link_path: str | None = None,
    metadata: dict | None = None,
    dedupe: bool = True,
) -> list[Notification]:
    created = []
    seen_ids = set()
    for user in users:
        if user.id in seen_ids:
            continue
        seen_ids.add(user.id)
        item = create_notification(
            db,
            user_id=user.id,
            notification_type=notification_type,
            title=title,
            body=body,
            change_request_id=change_request_id,
            link_path=link_path,
            metadata=metadata,
            dedupe=dedupe,
        )
        if item is not None:
            created.append(item)
    return created


def notify_request_created(
    db: Session,
    change_request: ChangeRequest,
    actor_user: User | None = None,
) -> None:
    label = request_label(change_request)
    recipients = []
    if actor_user is not None:
        recipients.append(actor_user)
    else:
        recipients.extend(users_for_business_owner(db, change_request))

    notify_users(
        db,
        recipients,
        notification_type="REQUEST_CREATED",
        title=f"Request {label} created",
        body=(
            f'"{change_request.title}" was created successfully. '
            "Complete intake details and submit for analyst review."
        ),
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_request_submitted(db: Session, change_request: ChangeRequest) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_analysts(db, change_request),
        notification_type="REQUEST_SUBMITTED",
        title=f"New request {label} submitted",
        body=(
            f'"{change_request.title}" is ready for risk assessment. '
            "Pick it up from your assessment queue."
        ),
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_analyst_review_submitted(
    db: Session,
    change_request: ChangeRequest,
    analyst_rating: str,
) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_committee(db),
        notification_type="ANALYST_REVIEW_SUBMITTED",
        title=f"Request {label} ready for committee",
        body=(
            f'Analyst review is complete with rating {analyst_rating}. '
            "A committee decision is required."
        ),
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_override_escalated(
    db: Session,
    change_request: ChangeRequest,
    system_rating: str,
    analyst_rating: str,
) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_committee(db),
        notification_type="OVERRIDE_ESCALATED",
        title=f"Escalated override on {label}",
        body=(
            f"Analyst downgraded the system rating from {system_rating} "
            f"to {analyst_rating}. Committee acknowledgement is required."
        ),
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_committee_decision(
    db: Session,
    change_request: ChangeRequest,
    decision: str,
) -> None:
    label = request_label(change_request)
    recipients = users_for_business_owner(db, change_request)

    messages = {
        "APPROVE": (
            f"Request {label} approved",
            "The committee approved your change request. The workflow is complete.",
        ),
        "APPROVE_WITH_CONDITIONS": (
            f"Request {label} approved with conditions",
            "The committee approved subject to conditions. Submit evidence for each condition.",
        ),
        "REJECT": (
            f"Request {label} rejected",
            "The committee rejected your change request.",
        ),
        "DEFER": (
            f"Request {label} deferred",
            "The committee deferred your request. Review the rationale and resubmit when ready.",
        ),
    }
    title, body = messages.get(
        decision,
        (f"Decision recorded for {label}", f"Committee decision: {decision}."),
    )
    notify_users(
        db,
        recipients,
        notification_type=f"COMMITTEE_{decision}",
        title=title,
        body=body,
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )

    if decision == "DEFER":
        deferred_to = (change_request.assigned_analyst or "").strip()
        if change_request.status == "REASSESSMENT":
            notify_users(
                db,
                users_for_analysts(db, change_request),
                notification_type="REQUEST_DEFERRED_TO_ANALYST",
                title=f"Request {label} returned for reassessment",
                body="The committee deferred this request back to the Risk Analyst queue.",
                change_request_id=change_request.id,
                link_path=assessment_link(change_request),
            )


def notify_condition_opened(
    db: Session,
    change_request: ChangeRequest,
    condition: ApprovalCondition,
) -> None:
    label = request_label(change_request)
    due = condition.due_date.date().isoformat() if condition.due_date else "TBD"
    notify_users(
        db,
        users_for_business_owner(db, change_request),
        notification_type=f"CONDITION_OPENED_{condition.id}",
        title=f"Condition opened on {label}",
        body=f"{condition.description} (due {due}).",
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_condition_evidence_submitted(
    db: Session,
    change_request: ChangeRequest,
    condition: ApprovalCondition,
) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_analysts(db, change_request),
        notification_type=f"CONDITION_EVIDENCE_{condition.id}",
        title=f"Evidence submitted for {label}",
        body=f"Business owner submitted evidence for: {condition.description}.",
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_condition_evidence_rejected(
    db: Session,
    change_request: ChangeRequest,
    condition: ApprovalCondition,
) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_business_owner(db, change_request),
        notification_type=f"CONDITION_REJECTED_{condition.id}",
        title=f"Evidence rejected on {label}",
        body=f"Analyst rejected evidence for: {condition.description}. Please resubmit.",
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_condition_verified(
    db: Session,
    change_request: ChangeRequest,
    condition: ApprovalCondition,
) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_business_owner(db, change_request),
        notification_type=f"CONDITION_VERIFIED_{condition.id}",
        title=f"Condition verified on {label}",
        body=f"Analyst verified: {condition.description}.",
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_all_conditions_met(db: Session, change_request: ChangeRequest) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_business_owner(db, change_request),
        notification_type="ALL_CONDITIONS_MET",
        title=f"All conditions met on {label}",
        body="Every approval condition has been verified.",
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )
    notify_users(
        db,
        users_for_committee(db),
        notification_type="ALL_CONDITIONS_MET_COMMITTEE",
        title=f"All conditions met on {label}",
        body="Every approval condition has been verified by the analyst.",
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_brd_extracted(db: Session, change_request: ChangeRequest) -> None:
    label = request_label(change_request)
    notify_users(
        db,
        users_for_business_owner(db, change_request),
        notification_type="BRD_EXTRACTED",
        title=f"BRD extracted for {label}",
        body="AI extracted intake fields from your BRD. Review and apply them before submitting.",
        change_request_id=change_request.id,
        link_path=assessment_link(change_request),
    )


def notify_methodology_pending(db: Session, version_label: str) -> None:
    notify_users(
        db,
        users_for_committee(db),
        notification_type=f"METHODOLOGY_PENDING_{version_label}",
        title=f"Methodology v{version_label} pending approval",
        body="A risk methodology change is waiting for committee review on /methodology.",
        link_path="/methodology",
        dedupe=True,
    )


def _notify_stage_sla(
    db: Session,
    change_request: ChangeRequest,
    timeline: dict,
    stage_key: str,
    at_risk_pct: float,
) -> None:
    stage = next(
        (item for item in timeline.get("stages") or [] if item.get("stage") == stage_key),
        None,
    )
    if not stage or not stage.get("in_progress"):
        return

    target = stage.get("target_hours")
    hours = float(stage.get("hours") or 0)
    if not target:
        return

    label = request_label(change_request)
    stage_label = STAGE_SLA_LABELS.get(stage_key, stage_key)
    link = assessment_link(change_request)

    if stage.get("over_target"):
        if stage_key == "RISK_ASSESSMENT":
            recipients = users_for_analysts(db, change_request)
            title = f"Risk assessment overdue on {label}"
            body = (
                f"{stage_label} has exceeded the {int(target)}-hour SLA "
                f"({hours:.1f} hours elapsed). Complete the assessment promptly."
            )
            notification_type = f"SLA_{stage_key}_OVERDUE"
        elif stage_key == "COMMITTEE_REVIEW":
            recipients = users_for_committee(db)
            title = f"Committee review overdue on {label}"
            body = (
                f"{stage_label} has exceeded the {int(target)}-hour SLA "
                f"({hours:.1f} hours elapsed)."
            )
            notification_type = f"SLA_{stage_key}_OVERDUE"
        else:
            recipients = users_for_analysts(db, change_request)
            title = f"{stage_label} overdue on {label}"
            body = (
                f"This stage has exceeded the {int(target)}-hour SLA "
                f"({hours:.1f} hours elapsed)."
            )
            notification_type = f"SLA_{stage_key}_OVERDUE"

        notify_users(
            db,
            recipients,
            notification_type=notification_type,
            title=title,
            body=body,
            change_request_id=change_request.id,
            link_path=link,
        )
        return

    threshold = float(target) * at_risk_pct / 100
    if hours >= threshold:
        remaining = max(float(target) - hours, 0)
        if stage_key == "RISK_ASSESSMENT":
            recipients = users_for_analysts(db, change_request)
            title = f"Risk assessment due within {remaining:.0f}h on {label}"
            body = (
                f"Complete risk analysis within {remaining:.0f} hours "
                f"({hours:.1f} of {int(target)} hours used)."
            )
        elif stage_key == "COMMITTEE_REVIEW":
            recipients = users_for_committee(db)
            title = f"Committee decision due within {remaining:.0f}h on {label}"
            body = (
                f"Record a committee decision within {remaining:.0f} hours "
                f"({hours:.1f} of {int(target)} hours used)."
            )
        else:
            recipients = users_for_analysts(db, change_request)
            title = f"{stage_label} due within {remaining:.0f}h on {label}"
            body = (
                f"Complete this stage within {remaining:.0f} hours "
                f"({hours:.1f} of {int(target)} hours used)."
            )

        notify_users(
            db,
            recipients,
            notification_type=f"SLA_{stage_key}_AT_RISK",
            title=title,
            body=body,
            change_request_id=change_request.id,
            link_path=link,
        )


def _notify_overall_sla(
    db: Session,
    change_request: ChangeRequest,
    timeline: dict,
) -> None:
    status = timeline.get("sla_status")
    if status not in {"AT_RISK", "BREACHED"}:
        return

    label = request_label(change_request)
    link = assessment_link(change_request)
    remaining = timeline.get("sla_remaining_hours")
    used_pct = timeline.get("sla_used_pct")

    if status == "AT_RISK":
        notify_users(
            db,
            users_for_analysts(db, change_request),
            notification_type="SLA_OVERALL_AT_RISK",
            title=f"Intake-to-decision SLA at risk on {label}",
            body=(
                f"{used_pct}% of the overall SLA used "
                f"({remaining:.1f} hours remaining)."
            ),
            change_request_id=change_request.id,
            link_path=link,
        )
        notify_users(
            db,
            users_for_committee(db),
            notification_type="SLA_OVERALL_AT_RISK_COMMITTEE",
            title=f"Intake-to-decision SLA at risk on {label}",
            body=(
                f"{used_pct}% of the overall SLA used "
                f"({remaining:.1f} hours remaining)."
            ),
            change_request_id=change_request.id,
            link_path=link,
        )
    else:
        notify_users(
            db,
            users_for_analysts(db, change_request),
            notification_type="SLA_OVERALL_BREACHED",
            title=f"Intake-to-decision SLA breached on {label}",
            body="The 48-hour intake-to-decision SLA has been exceeded.",
            change_request_id=change_request.id,
            link_path=link,
        )
        notify_users(
            db,
            users_for_committee(db),
            notification_type="SLA_OVERALL_BREACHED_COMMITTEE",
            title=f"Intake-to-decision SLA breached on {label}",
            body="The 48-hour intake-to-decision SLA has been exceeded.",
            change_request_id=change_request.id,
            link_path=link,
        )


def check_sla_notifications(db: Session, user: User | None = None) -> None:
    """Create SLA reminder notifications for open submitted requests."""
    _, config = get_active_methodology(db)
    workflow = config["workflow"]
    at_risk_pct = float(workflow.get("at_risk_threshold_pct", 75))

    query = db.query(ChangeRequest).filter(
        ChangeRequest.current_stage != "COMPLETED",
    )
    change_requests = query.all()

    for change_request in change_requests:
        if not is_submitted(change_request):
            continue

        events = (
            db.query(AuditEvent)
            .filter(AuditEvent.change_request_id == change_request.id)
            .order_by(AuditEvent.id.asc())
            .all()
        )
        timeline = compute_cycle_time(events, config)

        for stage_key in (
            "AWAITING_ANALYST",
            "RISK_ASSESSMENT",
            "ANALYST_REVIEW",
            "COMMITTEE_REVIEW",
        ):
            _notify_stage_sla(
                db, change_request, timeline, stage_key, at_risk_pct
            )

        _notify_overall_sla(db, change_request, timeline)

    overdue_conditions = (
        db.query(ApprovalCondition)
        .filter(
            ApprovalCondition.status != "VERIFIED",
            ApprovalCondition.due_date.isnot(None),
            ApprovalCondition.due_date < datetime.utcnow(),
        )
        .all()
    )
    for condition in overdue_conditions:
        change_request = db.get(ChangeRequest, condition.change_request_id)
        if not change_request:
            continue
        label = request_label(change_request)
        notify_users(
            db,
            users_for_business_owner(db, change_request),
            notification_type=f"CONDITION_OVERDUE_{condition.id}",
            title=f"Condition overdue on {label}",
            body=f"Past due: {condition.description}.",
            change_request_id=change_request.id,
            link_path=assessment_link(change_request),
        )


def serialize_notification(notification: Notification) -> dict:
    metadata = None
    if notification.metadata_json:
        try:
            metadata = json.loads(notification.metadata_json)
        except json.JSONDecodeError:
            metadata = notification.metadata_json

    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "change_request_id": notification.change_request_id,
        "notification_type": notification.notification_type,
        "title": notification.title,
        "body": notification.body,
        "link_path": notification.link_path,
        "read": notification.read_at is not None,
        "read_at": notification.read_at.isoformat() if notification.read_at else None,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "metadata": metadata,
    }
