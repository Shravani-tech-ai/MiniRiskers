from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Query, Session

from backend.models import ChangeRequest, User

ROLE_BUSINESS_OWNER = "BUSINESS_OWNER"
ROLE_RISK_ANALYST = "RISK_ANALYST"
ROLE_RISK_COMMITTEE = "RISK_COMMITTEE"
ROLE_AUDITOR = "AUDITOR"
ROLE_ADMIN = "ADMIN"

ALL_ROLES = {
    ROLE_BUSINESS_OWNER,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    ROLE_AUDITOR,
    ROLE_ADMIN,
}

COMMITTEE_STAGES = {"COMMITTEE_REVIEW", "COMPLETED"}
COMMITTEE_STATUSES = {
    "COMMITTEE_REVIEW",
    "APPROVE",
    "APPROVE_WITH_CONDITIONS",
    "DEFER",
    "REJECT",
    "APPROVED",
    "REJECTED",
}

DRAFT_STATUSES = {"", "DRAFT"}
INTAKE_STAGE = "REQUEST_CREATED"


def is_submitted(change_request: ChangeRequest) -> bool:
    # A request counts as submitted once the Business Owner hands it off
    # (status leaves DRAFT). Requests that already progressed past intake
    # are treated as submitted so legacy data stays visible to analysts.
    status_value = (change_request.status or "").strip().upper()
    if status_value not in DRAFT_STATUSES:
        return True
    stage = change_request.current_stage or INTAKE_STAGE
    return stage != INTAKE_STAGE


def _identity_matches(stored: str | None, user: User) -> bool:
    if not stored:
        return False
    normalized = stored.strip().lower()
    return normalized in {
        user.username.lower(),
        (user.full_name or "").strip().lower(),
    }


def can_read_change_request(user: User, change_request: ChangeRequest) -> bool:
    if user.role == ROLE_ADMIN:
        return True

    if user.role == ROLE_AUDITOR:
        return True

    if user.role == ROLE_BUSINESS_OWNER:
        return _identity_matches(change_request.requested_by, user)

    if user.role == ROLE_RISK_ANALYST:
        if not is_submitted(change_request):
            return False
        assigned = (change_request.assigned_analyst or "").strip()
        if not assigned:
            return True
        return _identity_matches(change_request.assigned_analyst, user)

    if user.role == ROLE_RISK_COMMITTEE:
        stage = change_request.current_stage or ""
        status_value = change_request.status or ""
        if stage in COMMITTEE_STAGES:
            return True
        if status_value in COMMITTEE_STATUSES:
            return True
        return False

    return False


def filter_change_requests_for_user(
    user: User,
    query: Query,
) -> Query:
    if user.role in {ROLE_ADMIN, ROLE_AUDITOR}:
        return query

    if user.role == ROLE_BUSINESS_OWNER:
        clauses = [
            func.lower(ChangeRequest.requested_by) == user.username.lower(),
        ]
        if user.full_name:
            clauses.append(
                func.lower(ChangeRequest.requested_by)
                == user.full_name.strip().lower()
            )
        return query.filter(or_(*clauses))

    if user.role == ROLE_RISK_ANALYST:
        clauses = [
            ChangeRequest.assigned_analyst.is_(None),
            ChangeRequest.assigned_analyst == "",
            func.lower(ChangeRequest.assigned_analyst) == user.username.lower(),
        ]
        if user.full_name:
            clauses.append(
                func.lower(ChangeRequest.assigned_analyst)
                == user.full_name.strip().lower()
            )
        submitted_clause = or_(
            func.upper(func.coalesce(ChangeRequest.status, "")).notin_(
                [value for value in DRAFT_STATUSES]
            ),
            func.coalesce(ChangeRequest.current_stage, INTAKE_STAGE)
            != INTAKE_STAGE,
        )
        return query.filter(or_(*clauses)).filter(submitted_clause)

    if user.role == ROLE_RISK_COMMITTEE:
        return query.filter(
            (ChangeRequest.current_stage.in_(list(COMMITTEE_STAGES)))
            | (ChangeRequest.status.in_(list(COMMITTEE_STATUSES)))
        )

    return query.filter(ChangeRequest.id == -1)


def assert_can_read(user: User, change_request: ChangeRequest) -> None:
    if not can_read_change_request(user, change_request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this change request.",
        )


def assert_role(user: User, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )


def assert_not_auditor_write(user: User) -> None:
    if user.role == ROLE_AUDITOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Auditors have read-only access.",
        )


def assert_submitted(change_request: ChangeRequest) -> None:
    if not is_submitted(change_request):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The Business Owner has not submitted this request for "
                "Risk Analyst review yet."
            ),
        )


def assert_intake_editable(user: User, change_request: ChangeRequest) -> None:
    if user.role == ROLE_ADMIN:
        return
    if is_submitted(change_request):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This request has been submitted for Risk Analyst review "
                "and its inputs are now locked."
            ),
        )


def assert_workflow_stage(
    change_request: ChangeRequest,
    allowed_stages: set[str],
    message: str,
) -> None:
    stage = change_request.current_stage or "REQUEST_CREATED"
    if stage not in allowed_stages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )


def get_change_request_or_404(
    db: Session,
    change_request_id: int,
    user: User,
) -> ChangeRequest:
    change_request = (
        db.query(ChangeRequest)
        .filter(ChangeRequest.id == change_request_id)
        .first()
    )

    if not change_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Change request not found",
        )

    assert_can_read(user, change_request)
    return change_request
