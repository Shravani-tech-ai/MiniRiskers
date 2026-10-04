import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend.auth import (
    audit_actor_name,
    get_current_user,
)
from backend.auth_routes import router as auth_router
from backend.database import SessionLocal, engine, get_db
from backend.permissions import (
    ROLE_ADMIN,
    ROLE_AUDITOR,
    ROLE_BUSINESS_OWNER,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    assert_intake_editable,
    assert_not_auditor_write,
    assert_role,
    assert_submitted,
    assert_workflow_stage,
    filter_change_requests_for_user,
    get_change_request_or_404,
    is_submitted,
)
from backend.seed_users import seed_development_users
from backend.audit import (
    create_audit_event,
    install_append_only_guards,
    seal_legacy_events,
)
from backend.methodology_store import (
    ensure_default_methodology,
    get_active_methodology,
    get_config_for_version,
)
from backend.override_policy import evaluate_override
from backend.serializers import serialize_condition
from backend.governance_routes import router as governance_router
from backend.notification_routes import router as notification_router
from backend.notifications import (
    notify_analyst_review_submitted,
    notify_brd_extracted,
    notify_committee_decision,
    notify_condition_opened,
    notify_override_escalated,
    notify_request_created,
    notify_request_submitted,
    notify_stage_progress,
)
from risk_engine.methodology import score_factors
from risk_engine.risk_calculator import factor_rows_to_inputs
from risk_engine.risk_calculator import (
    generate_risk_assessment,
    is_residual_calculated,
)
from risk_engine.risk_factor_generator import generate_risk_factors
from rag.evidence_service import generate_evidence_for_change_request
from backend.assessment_service import generate_ai_assessment
from backend.models import (
    ApprovalCondition,
    Base,
    ChangeRequest,
    Product,
    CustomerProfile,
    Geography,
    TransactionProfile,
    Channel,
    Vendor,
    Control,
    ControlEffectiveness,
    RiskFactor,
    RiskAssessment,
    RiskModelConfig,
    RiskModelWeight,
    RegulatoryEvidence,
    AnalystOverride,
    CommitteeDecision,
    AuditEvent,
    AIRecommendation,
    User,
)
from backend.assessment_inputs import (
    compute_field_diff,
    compute_missing_fields,
    load_assessment_inputs,
    merge_extraction_with_inputs,
)
from backend.export_service import (
    build_assessment_export,
    export_to_pdf_bytes,
)
from backend.risk_methodology import (
    build_risk_methodology,
    methodology_to_pdf_bytes,
)
from backend.request_numbers import (
    allocate_request_number,
    peek_next_request_number,
)
from backend.intake_service import (
    completeness_percent,
    extract_intake_from_brd,
    extract_text_from_bytes,
    delete_brd_uploads,
    get_latest_brd_upload,
    save_assessment_inputs,
    save_brd_file,
)

class ApplyExtractionRequest(BaseModel):
    extracted: dict


class SyncInputsRequest(BaseModel):
    inputs: dict


class CreateChangeRequestPayload(BaseModel):
    title: str
    description: str
    change_type: str
    product_type: str
    business_unit: str
    customer_segment: str
    requested_by: str


app = FastAPI(
    title="MiniRiskers",
    description="AI-Assisted Financial Crime Risk Assessment Workbench",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "MINIRISKERS_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(governance_router)
app.include_router(notification_router)

# Create database tables
Base.metadata.create_all(bind=engine)


# Columns added after the first release. SQLite's create_all does not alter
# existing tables, so missing columns are added here on startup.
SCHEMA_PATCHES = {
    "audit_events": {
        "user_id": "INTEGER",
        "prev_hash": "VARCHAR",
        "event_hash": "VARCHAR",
    },
    "change_requests": {
        "current_stage": "VARCHAR NOT NULL DEFAULT 'REQUEST_CREATED'",
        "revision": "INTEGER NOT NULL DEFAULT 1",
    },
    "risk_assessments": {
        "methodology_version_id": "INTEGER",
        "revision": "INTEGER DEFAULT 1",
        "controls_assessed": "INTEGER DEFAULT 0",
        "residual_status": "VARCHAR DEFAULT 'CALCULATED'",
    },
    "analyst_overrides": {
        "revision": "INTEGER DEFAULT 1",
        "override_direction": "VARCHAR DEFAULT 'NONE'",
        "band_delta": "INTEGER DEFAULT 0",
        "escalation_level": "VARCHAR DEFAULT 'NONE'",
        "escalation_reasons": "TEXT",
        "acknowledged_by": "VARCHAR",
        "acknowledged_at": "DATETIME",
        "acknowledgement_note": "TEXT",
    },
    "committee_decisions": {
        "revision": "INTEGER DEFAULT 1",
        "deferred_to": "VARCHAR",
    },
    "users": {
        "preferences_json": "TEXT",
    },
}


def apply_sqlite_schema_patches():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    for table, columns in SCHEMA_PATCHES.items():
        if table not in table_names:
            continue
        existing = {
            column["name"] for column in inspector.get_columns(table)
        }
        for name, ddl in columns.items():
            if name in existing:
                continue
            with engine.begin() as connection:
                connection.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
                )


def get_change_request_access(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChangeRequest:
    return get_change_request_or_404(
        db,
        change_request_id,
        current_user,
    )


def authorize_intake_write(
    db: Session,
    change_request_id: int,
    current_user: User,
) -> ChangeRequest:
    change_request = get_change_request_or_404(
        db,
        change_request_id,
        current_user,
    )
    assert_role(current_user, ROLE_BUSINESS_OWNER, ROLE_ADMIN)
    assert_not_auditor_write(current_user)
    assert_intake_editable(current_user, change_request)
    return change_request


def authorize_analyst_action(
    db: Session,
    change_request_id: int,
    current_user: User,
) -> ChangeRequest:
    change_request = get_change_request_or_404(
        db,
        change_request_id,
        current_user,
    )
    assert_role(current_user, ROLE_RISK_ANALYST, ROLE_ADMIN)
    assert_not_auditor_write(current_user)
    assert_submitted(change_request)
    return change_request


def authorize_assessment_inputs_sync(
    db: Session,
    change_request_id: int,
    current_user: User,
) -> ChangeRequest:
    # Business Owners sync inputs while completing intake, and
    # Risk Analysts sync the already-saved inputs as the first step
    # of running the risk calculation pipeline.
    change_request = get_change_request_or_404(
        db,
        change_request_id,
        current_user,
    )
    assert_role(
        current_user,
        ROLE_BUSINESS_OWNER,
        ROLE_RISK_ANALYST,
        ROLE_ADMIN,
    )
    assert_not_auditor_write(current_user)
    if current_user.role == ROLE_BUSINESS_OWNER:
        assert_intake_editable(current_user, change_request)
    elif current_user.role == ROLE_RISK_ANALYST:
        assert_submitted(change_request)
    return change_request


RISK_RELEASED_STAGES = {"COMMITTEE_REVIEW", "COMPLETED"}


def risk_results_released(db: Session, change_request: ChangeRequest) -> bool:
    # Risk results are shared with the Business Owner only once the Risk
    # Analyst has reviewed (accepted or adjusted) the calculated risk.
    if (change_request.current_stage or "") in RISK_RELEASED_STAGES:
        return True
    return (
        db.query(AnalystOverride.id)
        .filter(AnalystOverride.change_request_id == change_request.id)
        .first()
        is not None
    )


def assert_risk_results_visible(
    db: Session,
    current_user: User,
    change_request: ChangeRequest,
) -> None:
    if current_user.role != ROLE_BUSINESS_OWNER:
        return
    if not risk_results_released(db, change_request):
        raise HTTPException(
            status_code=403,
            detail=(
                "Risk results will be shared once the Risk Analyst "
                "completes their review."
            ),
        )


@app.on_event("startup")
def on_startup():
    apply_sqlite_schema_patches()
    db = SessionLocal()
    try:
        seed_development_users(db)
        ensure_default_methodology(db)
        seal_legacy_events(db)
    finally:
        db.close()
    install_append_only_guards(engine)


@app.get("/")
def root():

    return {
        "application": "MiniRiskers",
        "status": "running",
        "message": "Risk Assessment Workbench API"
    }


@app.get("/health")
def health():
    return {"status": "ok", "application": "MiniRiskers"}


@app.get("/ready")
def ready():
    chroma_dir = Path(__file__).resolve().parent.parent / "chroma_db"
    rag_available = chroma_dir.exists() and any(chroma_dir.iterdir())
    return {
        "status": "ok",
        "rag_available": rag_available,
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


@app.get("/request-numbers/next")
def get_next_request_number(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "request_number": peek_next_request_number(db),
    }


@app.get("/change-requests/suggest-request-number")
def suggest_request_number_legacy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "request_number": peek_next_request_number(db),
    }


@app.get("/change-requests")
def get_change_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ChangeRequest)
    query = filter_change_requests_for_user(current_user, query)
    return query.order_by(ChangeRequest.id.desc()).all()


@app.get("/change-requests/{change_request_id}")
def get_change_request(
    change_request: ChangeRequest = Depends(get_change_request_access),
):
    return {
        "id": change_request.id,
        "request_number": change_request.request_number,
        "title": change_request.title,
        "description": change_request.description,
        "change_type": change_request.change_type,
        "product_type": change_request.product_type,
        "business_unit": change_request.business_unit,
        "customer_segment": change_request.customer_segment,
        "requested_by": change_request.requested_by,
        "assigned_analyst": change_request.assigned_analyst,
        "status": change_request.status,
        "priority": change_request.priority,
        "proposed_go_live_date": change_request.proposed_go_live_date,
        "current_stage": change_request.current_stage,
        "revision": change_request.revision or 1,
        "created_at": change_request.created_at
    }

@app.get("/change-requests/{change_request_id}/risk-assessment")
def get_risk_assessment(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )
    assert_risk_results_visible(db, current_user, change_request)

    risk_assessment = (
        db.query(RiskAssessment)
        .filter(
            RiskAssessment.change_request_id == change_request_id
        )
        .order_by(RiskAssessment.id.desc())
        .first()
    )

    if not risk_assessment:
        raise HTTPException(
            status_code=404,
            detail="Risk assessment not found"
        )

    return {
        "id": risk_assessment.id,
        "change_request_id": risk_assessment.change_request_id,
        "risk_model_version": risk_assessment.risk_model_version,

        "customer_risk_score": risk_assessment.customer_risk_score,
        "product_risk_score": risk_assessment.product_risk_score,
        "geography_risk_score": risk_assessment.geography_risk_score,
        "transaction_risk_score": risk_assessment.transaction_risk_score,
        "channel_risk_score": risk_assessment.channel_risk_score,
        "third_party_risk_score": risk_assessment.third_party_risk_score,
        "fraud_risk_score": risk_assessment.fraud_risk_score,

        "inherent_score": risk_assessment.inherent_score,
        "inherent_rating": risk_assessment.inherent_rating,

        "control_adjustment": risk_assessment.control_adjustment,
        "controls_assessed": bool(risk_assessment.controls_assessed),
        "residual_status": (
            risk_assessment.residual_status or "CALCULATED"
        ),

        "residual_score": risk_assessment.residual_score,
        "residual_rating": risk_assessment.residual_rating,

        "ai_recommendation": risk_assessment.ai_recommendation,
        "analyst_rating": risk_assessment.analyst_rating,
        "final_rating": risk_assessment.final_rating,

        "assessment_status": risk_assessment.assessment_status,

        "created_at": risk_assessment.created_at,
        "updated_at": risk_assessment.updated_at
    }

@app.post("/change-requests")
def create_change_request(
    payload: CreateChangeRequestPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_BUSINESS_OWNER, ROLE_ADMIN)
    assert_not_auditor_write(current_user)

    title = payload.title.strip()
    description = payload.description.strip()
    change_type = payload.change_type.strip()
    product_type = payload.product_type.strip()
    business_unit = payload.business_unit.strip()
    customer_segment = payload.customer_segment.strip()
    requested_by = audit_actor_name(current_user)
    if current_user.role == ROLE_ADMIN and payload.requested_by.strip():
        requested_by = payload.requested_by.strip()

    if not all(
        [
            title,
            description,
            change_type,
            product_type,
            business_unit,
            customer_segment,
        ]
    ):
        raise HTTPException(
            status_code=422,
            detail="All change request fields are required.",
        )

    for _ in range(5):
        normalized_number = allocate_request_number(db)

        change_request = ChangeRequest(
            request_number=normalized_number,
            title=title,
            description=description,
            change_type=change_type,
            product_type=product_type,
            business_unit=business_unit,
            customer_segment=customer_segment,
            requested_by=requested_by,
        )

        db.add(change_request)

        try:
            db.flush()
            create_audit_event(
                db=db,
                change_request_id=change_request.id,
                actor=audit_actor_name(current_user),
                user_id=current_user.id,
                action="CREATED_CHANGE_REQUEST",
                entity_type="ChangeRequest",
                entity_id=change_request.id,
                new_value=change_request.status,
                reason="Change request created.",
            )
            notify_request_created(db, change_request, current_user)
            db.commit()
            db.refresh(change_request)
            return change_request
        except IntegrityError:
            db.rollback()
            continue

    raise HTTPException(
        status_code=500,
        detail="Could not assign a unique request number. Please retry.",
    )

@app.post("/change-requests/{change_request_id}/product")
def create_product(
    change_request_id: int,
    product_name: str,
    transaction_type: str,
    product_category: str = "",
    product_description: str = "",
    digital_channel: bool = False,
    branch_channel: bool = False,
    agent_channel: bool = False,
    cross_border: bool = False,
    cash_involved: bool = False,
    transaction_limit: Optional[float] = None,
    expected_transaction_volume: Optional[float] = None,
    expected_transaction_frequency: str = "",
    currency: str = "",
    countries_supported: str = "",
    new_product_flag: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    product = Product(
        change_request_id=change_request_id,
        product_name=product_name,
        product_category=product_category,
        product_description=product_description,
        digital_channel=digital_channel,
        branch_channel=branch_channel,
        agent_channel=agent_channel,
        cross_border=cross_border,
        cash_involved=cash_involved,
        transaction_type=transaction_type,
        transaction_limit=transaction_limit,
        expected_transaction_volume=expected_transaction_volume,
        expected_transaction_frequency=expected_transaction_frequency,
        currency=currency,
        countries_supported=countries_supported,
        new_product_flag=new_product_flag
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product

@app.post("/change-requests/{change_request_id}/customer-profile")
def create_customer_profile(
    change_request_id: int,
    customer_type: str,
    onboarding_method: str,
    customer_segment: str = "",
    individual_customer: bool = False,
    business_customer: bool = False,
    foreign_customer: bool = False,
    kyc_required: bool = False,
    kyc_method: str = "",
    beneficial_owner_required: bool = False,
    pep_exposure: bool = False,
    high_risk_customer_exposure: bool = False,
    expected_customer_count: Optional[int] = None,
    customer_geographic_distribution: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    customer_profile = CustomerProfile(
        change_request_id=change_request_id,
        customer_type=customer_type,
        customer_segment=customer_segment,
        individual_customer=individual_customer,
        business_customer=business_customer,
        foreign_customer=foreign_customer,
        onboarding_method=onboarding_method,
        kyc_required=kyc_required,
        kyc_method=kyc_method,
        beneficial_owner_required=beneficial_owner_required,
        pep_exposure=pep_exposure,
        high_risk_customer_exposure=high_risk_customer_exposure,
        expected_customer_count=expected_customer_count,
        customer_geographic_distribution=customer_geographic_distribution
    )

    db.add(customer_profile)
    db.commit()
    db.refresh(customer_profile)

    return customer_profile

@app.post("/change-requests/{change_request_id}/geography")
def create_geography(
    change_request_id: int,
    country: str,
    transaction_country: str,
    beneficiary_country: str,
    country_code: str = "",
    domestic_or_cross_border: str = "",
    customer_country: str = "",
    high_risk_jurisdiction_flag: bool = False,
    sanctions_exposure: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    geography = Geography(
        change_request_id=change_request_id,
        country=country,
        country_code=country_code,
        domestic_or_cross_border=domestic_or_cross_border,
        customer_country=customer_country,
        transaction_country=transaction_country,
        beneficiary_country=beneficiary_country,
        high_risk_jurisdiction_flag=high_risk_jurisdiction_flag,
        sanctions_exposure=sanctions_exposure
    )

    db.add(geography)
    db.commit()
    db.refresh(geography)

    return geography

@app.post("/change-requests/{change_request_id}/transaction-profile")
def create_transaction_profile(
    change_request_id: int,
    transaction_type: str,
    average_transaction_amount: Optional[float] = None,
    maximum_transaction_amount: Optional[float] = None,
    expected_daily_volume: Optional[float] = None,
    expected_monthly_volume: Optional[float] = None,
    expected_frequency: str = "",
    cash_involved: bool = False,
    cross_border: bool = False,
    number_of_countries: Optional[int] = None,
    transaction_velocity: Optional[float] = None,
    round_amount_risk: bool = False,
    rapid_movement_possible: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    transaction_profile = TransactionProfile(
        change_request_id=change_request_id,
        transaction_type=transaction_type,
        average_transaction_amount=average_transaction_amount,
        maximum_transaction_amount=maximum_transaction_amount,
        expected_daily_volume=expected_daily_volume,
        expected_monthly_volume=expected_monthly_volume,
        expected_frequency=expected_frequency,
        cash_involved=cash_involved,
        cross_border=cross_border,
        number_of_countries=number_of_countries,
        transaction_velocity=transaction_velocity,
        round_amount_risk=round_amount_risk,
        rapid_movement_possible=rapid_movement_possible
    )

    db.add(transaction_profile)
    db.commit()
    db.refresh(transaction_profile)

    return transaction_profile

@app.post("/change-requests/{change_request_id}/channel")
def create_channel(
    change_request_id: int,
    channel_type: str,
    mobile_banking: bool = False,
    internet_banking: bool = False,
    branch: bool = False,
    agent: bool = False,
    api: bool = False,
    third_party_channel: bool = False,
    remote_onboarding: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    channel = Channel(
        change_request_id=change_request_id,
        channel_type=channel_type,
        mobile_banking=mobile_banking,
        internet_banking=internet_banking,
        branch=branch,
        agent=agent,
        api=api,
        third_party_channel=third_party_channel,
        remote_onboarding=remote_onboarding
    )

    db.add(channel)
    db.commit()
    db.refresh(channel)

    return channel

@app.post("/change-requests/{change_request_id}/vendor")
def create_vendor(
    change_request_id: int,
    vendor_name: str,
    vendor_type: str,
    country: str = "",
    india_based: bool = False,
    service_description: str = "",
    handles_customer_data: bool = False,
    handles_transactions: bool = False,
    handles_payment_data: bool = False,
    criticality: str = "",
    outsourcing_type: str = "",
    due_diligence_completed: bool = False,
    contract_completed: bool = False,
    audit_rights: bool = False,
    business_continuity_plan: bool = False,
    cross_border_processing: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    vendor = Vendor(
        change_request_id=change_request_id,
        vendor_name=vendor_name,
        vendor_type=vendor_type,
        country=country,
        india_based=india_based,
        service_description=service_description,
        handles_customer_data=handles_customer_data,
        handles_transactions=handles_transactions,
        handles_payment_data=handles_payment_data,
        criticality=criticality,
        outsourcing_type=outsourcing_type,
        due_diligence_completed=due_diligence_completed,
        contract_completed=contract_completed,
        audit_rights=audit_rights,
        business_continuity_plan=business_continuity_plan,
        cross_border_processing=cross_border_processing
    )

    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    return vendor

@app.post("/change-requests/{change_request_id}/control")
def create_control(
    change_request_id: int,
    control_name: str,
    control_category: str,
    description: str,
    control_type: str,
    control_strength: str,
    implemented: bool,
    implementation_status: str,
    owner: str,
    evidence_document_id: int | None = None,
    effectiveness_score: float | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_analyst_action(db, change_request_id, current_user)

    control = Control(
        change_request_id=change_request_id,
        control_name=control_name,
        control_category=control_category,
        description=description,
        control_type=control_type,
        control_strength=control_strength,
        implemented=implemented,
        implementation_status=implementation_status,
        owner=owner,
        evidence_document_id=evidence_document_id,
        effectiveness_score=effectiveness_score
    )

    db.add(control)
    db.commit()
    db.refresh(control)

    return control

@app.post("/controls/{control_id}/effectiveness")
def create_control_effectiveness(
    control_id: int,
    design_effectiveness: float,
    operating_effectiveness: float,
    coverage: float,
    automation_level: float,
    evidence_quality: float,
    effectiveness_score: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    control = db.query(Control).filter(Control.id == control_id).first()
    if not control:
        raise HTTPException(status_code=404, detail="Control not found.")
    authorize_analyst_action(db, control.change_request_id, current_user)

    effectiveness = ControlEffectiveness(
        control_id=control_id,
        design_effectiveness=design_effectiveness,
        operating_effectiveness=operating_effectiveness,
        coverage=coverage,
        automation_level=automation_level,
        evidence_quality=evidence_quality,
        effectiveness_score=effectiveness_score
    )

    db.add(effectiveness)
    db.commit()
    db.refresh(effectiveness)

    return effectiveness

@app.post("/change-requests/{change_request_id}/risk-factor")
def create_risk_factor(
    change_request_id: int,
    risk_category: str,
    risk_factor: str,
    factor_value: str,
    factor_score: float,
    factor_weight: float,
    source_type: str,
    source_reference: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_analyst_action(db, change_request_id, current_user)

    contribution = factor_score * factor_weight

    risk_factor_record = RiskFactor(
        change_request_id=change_request_id,
        risk_category=risk_category,
        risk_factor=risk_factor,
        factor_value=factor_value,
        factor_score=factor_score,
        factor_weight=factor_weight,
        inherent_risk_contribution=contribution,
        source_type=source_type,
        source_reference=source_reference
    )

    db.add(risk_factor_record)
    db.commit()
    db.refresh(risk_factor_record)

    return risk_factor_record

@app.post("/change-requests/{change_request_id}/calculate-risk")
def calculate_risk(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = authorize_analyst_action(
        db,
        change_request_id,
        current_user,
    )
    assert_workflow_stage(
        change_request,
        {
            "REQUEST_CREATED",
            "RISK_ASSESSMENT",
            "REGULATORY_EVIDENCE",
            "AI_ASSESSMENT",
        },
        "Risk calculation is not allowed at the current workflow stage.",
    )

    assessment = generate_risk_assessment(
        db,
        change_request_id,
        revision=change_request.revision or 1,
    )

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="System",
        action="RISK_ASSESSMENT_CALCULATED",
        entity_type="RiskAssessment",
        entity_id=assessment.id,
        new_value=(
            f"{assessment.inherent_score} "
            f"({assessment.inherent_rating})"
        ),
        reason=(
            "Weighted risk assessment calculated under methodology "
            f"v{assessment.risk_model_version}. "
            + (
                f"Residual {assessment.residual_score} "
                f"({assessment.residual_rating})."
                if is_residual_calculated(assessment)
                else "Inherent risk calculated; residual pending control assessment."
            )
        ),
        policy_version=assessment.risk_model_version
    )

    change_request.current_stage = "RISK_ASSESSMENT"

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="System",
        action="WORKFLOW_STAGE_CHANGED",
        entity_type="ChangeRequest",
        entity_id=change_request.id,
        new_value="RISK_ASSESSMENT",
        reason="Risk assessment calculated successfully.",
    )
    notify_stage_progress(
        db,
        change_request,
        "RISK_ASSESSMENT",
        f"inherent risk {assessment.inherent_rating}",
    )

    db.commit()
    db.refresh(assessment)

    return assessment

@app.post("/change-requests/{change_request_id}/generate-risk-factors")
def generate_factors(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = authorize_analyst_action(
        db,
        change_request_id,
        current_user,
    )
    assert_workflow_stage(
        change_request,
        {
            "REQUEST_CREATED",
            "RISK_ASSESSMENT",
            "REGULATORY_EVIDENCE",
            "AI_ASSESSMENT",
        },
        "Risk factor generation is not allowed at the current workflow stage.",
    )

    factors = generate_risk_factors(
        db,
        change_request_id
    )

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="System",
        action="RISK_FACTORS_GENERATED",
        entity_type="RiskFactor",
        new_value=f"{len(factors)} risk factors generated",
        reason="System generated risk factors from change request inputs."
    )

    db.commit()

    for factor in factors:
        db.refresh(factor)

    return {
        "change_request_id": change_request_id,
        "risk_factors_generated": len(factors),
        "risk_factors": factors
    }

@app.post("/change-requests/{change_request_id}/generate-regulatory-evidence")
def generate_regulatory_evidence(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = authorize_analyst_action(
        db,
        change_request_id,
        current_user,
    )
    assert_workflow_stage(
        change_request,
        {
            "REQUEST_CREATED",
            "RISK_ASSESSMENT",
            "REGULATORY_EVIDENCE",
            "AI_ASSESSMENT",
        },
        "Regulatory evidence generation is not allowed at the current workflow stage.",
    )

    evidence = generate_evidence_for_change_request(
        db,
        change_request_id,
        number_of_results=3
    )

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="System",
        action="REGULATORY_EVIDENCE_GENERATED",
        entity_type="RegulatoryEvidence",
        new_value=f"{len(evidence)} evidence records generated",
        reason="Relevant regulatory evidence retrieved using the RAG pipeline."
    )

    db.commit()

    evidence_response = []

    for item in evidence:
        evidence_response.append({
            "id": item.id,
            "change_request_id": item.change_request_id,
            "risk_factor_id": item.risk_factor_id,
            "query": item.query,
            "evidence_text": item.evidence_text,
            "authority": item.authority,
            "document_name": item.document_name,
            "page_number": item.page_number,
            "source_reference": item.source_reference,
            "relevance_score": item.relevance_score,
            "created_at": item.created_at
        })

    return {
        "change_request_id": change_request_id,
        "evidence_generated": len(evidence_response),
        "evidence": evidence_response
    }

@app.get("/change-requests/{change_request_id}/regulatory-evidence")
def get_regulatory_evidence(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )
    assert_risk_results_visible(db, current_user, change_request)

    evidence = (
        db.query(RegulatoryEvidence)
        .filter(
            RegulatoryEvidence.change_request_id == change_request_id
        )
        .all()
    )

    evidence_response = []

    for item in evidence:
        evidence_response.append({
            "id": item.id,
            "risk_factor_id": item.risk_factor_id,
            "query": item.query,
            "authority": item.authority,
            "document_name": item.document_name,
            "page_number": item.page_number,
            "source_reference": item.source_reference,
            "relevance_score": item.relevance_score,
            "evidence_text": item.evidence_text,
            "created_at": item.created_at
        })

    return {
        "change_request_id": change_request_id,
        "evidence_count": len(evidence_response),
        "evidence": evidence_response
    }

@app.post(
    "/change-requests/{change_request_id}/generate-ai-assessment"
)
def generate_ai_assessment_endpoint(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = authorize_analyst_action(
        db,
        change_request_id,
        current_user,
    )
    assert_workflow_stage(
        change_request,
        {
            "RISK_ASSESSMENT",
            "REGULATORY_EVIDENCE",
            "AI_ASSESSMENT",
            "ANALYST_REVIEW",
        },
        "AI assessment generation is not allowed at the current workflow stage.",
    )

    risk_assessment = _latest_risk_assessment(db, change_request_id)
    if not risk_assessment:
        raise HTTPException(
            status_code=400,
            detail="Run the risk assessment before generating the AI draft.",
        )
    if not is_residual_calculated(risk_assessment):
        raise HTTPException(
            status_code=400,
            detail=(
                "Document mitigating controls and calculate residual risk "
                "before generating the AI assessment."
            ),
        )

    recommendation, assessment = generate_ai_assessment(
        db,
        change_request_id
    )

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="AI",
        action="AI_ASSESSMENT_GENERATED",
        entity_type="AIRecommendation",
        entity_id=recommendation.id,
        new_value=recommendation.recommendation,
        reason="AI assessment generated for analyst review.",
        model_version=recommendation.model_version
    )

    change_request.current_stage = "ANALYST_REVIEW"

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="System",
        action="WORKFLOW_STAGE_CHANGED",
        entity_type="ChangeRequest",
        entity_id=change_request.id,
        new_value="ANALYST_REVIEW",
        reason="AI assessment generated successfully and is ready for analyst review.",
    )
    notify_stage_progress(
        db,
        change_request,
        "ANALYST_REVIEW",
        "AI recommendation: "
        + recommendation.recommendation.replace("_", " ").lower()[:60]
        if recommendation.recommendation
        else "",
    )

    db.commit()

    return {
        "id": recommendation.id,
        "change_request_id": recommendation.change_request_id,

        "model": recommendation.model_name,

        "model_version": recommendation.model_version,

        "status": recommendation.status,

        "recommendation": recommendation.recommendation,

        "assessment": assessment
    }

RATING_VALUES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
FINAL_DECISION_STATUS = {
    "APPROVE": "APPROVED",
    "APPROVE_WITH_CONDITIONS": "APPROVE_WITH_CONDITIONS",
    "REJECT": "REJECTED",
}
DEFER_TARGETS = {
    # target: (status, workflow stage it returns to)
    "BUSINESS_OWNER": ("RETURNED", "REQUEST_CREATED"),
    "RISK_ANALYST": ("REASSESSMENT", "ANALYST_REVIEW"),
}


def _current_revision(change_request: ChangeRequest) -> int:
    return change_request.revision or 1


def _latest_risk_assessment(db: Session, change_request_id: int):
    return (
        db.query(RiskAssessment)
        .filter(RiskAssessment.change_request_id == change_request_id)
        .order_by(RiskAssessment.id.desc())
        .first()
    )


def _current_record(db: Session, model, change_request: ChangeRequest):
    """Latest analyst review / committee decision for the current revision."""
    record = (
        db.query(model)
        .filter(model.change_request_id == change_request.id)
        .order_by(model.id.desc())
        .first()
    )
    if record is None:
        return None
    if (record.revision or 1) != _current_revision(change_request):
        return None
    return record


def _evaluate_override_for(
    db: Session,
    change_request_id: int,
    risk_assessment: RiskAssessment,
    analyst_rating: str,
) -> dict:
    config = get_config_for_version(db, risk_assessment.risk_model_version)
    factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .all()
    )
    scored = score_factors(
        factor_rows_to_inputs(factors),
        risk_assessment.control_adjustment or 0,
        config,
    )
    return evaluate_override(
        risk_assessment.residual_rating,
        analyst_rating,
        config,
        scored["concentration_floor"],
    )


def _json_list(value) -> list:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except (TypeError, json.JSONDecodeError):
        return [str(value)]


def serialize_analyst_review(review: AnalystOverride) -> dict:
    return {
        "id": review.id,
        "change_request_id": review.change_request_id,
        "risk_assessment_id": review.risk_assessment_id,
        "revision": review.revision or 1,
        "system_rating": review.system_rating,
        "analyst_rating": review.analyst_rating,
        "override_reason": review.override_reason,
        "consequences": review.consequences,
        "override_direction": review.override_direction or "NONE",
        "band_delta": review.band_delta or 0,
        "escalation_level": review.escalation_level or "NONE",
        "escalation_reasons": _json_list(review.escalation_reasons),
        "acknowledged_by": review.acknowledged_by,
        "acknowledged_at": review.acknowledged_at,
        "acknowledgement_note": review.acknowledgement_note,
        "reviewed_by": review.reviewed_by,
        "status": review.status,
        "created_at": review.created_at,
    }


def serialize_committee_decision(db: Session, decision: CommitteeDecision) -> dict:
    conditions = (
        db.query(ApprovalCondition)
        .filter(ApprovalCondition.committee_decision_id == decision.id)
        .order_by(ApprovalCondition.id.asc())
        .all()
    )
    return {
        "id": decision.id,
        "change_request_id": decision.change_request_id,
        "risk_assessment_id": decision.risk_assessment_id,
        "analyst_override_id": decision.analyst_override_id,
        "revision": decision.revision or 1,
        "decision": decision.decision,
        "rationale": decision.rationale,
        "conditions": decision.conditions,
        "condition_items": [serialize_condition(c) for c in conditions],
        "deferred_to": decision.deferred_to,
        "decided_by": decision.decided_by,
        "status": decision.status,
        "created_at": decision.created_at,
    }


@app.get("/change-requests/{change_request_id}/override-preview")
def preview_override(
    change_request_id: int,
    analyst_rating: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    assert_role(
        current_user,
        ROLE_RISK_ANALYST,
        ROLE_RISK_COMMITTEE,
        ROLE_AUDITOR,
        ROLE_ADMIN,
    )
    if analyst_rating not in RATING_VALUES:
        raise HTTPException(status_code=400, detail="Unknown rating.")
    risk_assessment = _latest_risk_assessment(db, change_request_id)
    if not risk_assessment:
        raise HTTPException(status_code=404, detail="Risk assessment not found.")
    return _evaluate_override_for(
        db, change_request_id, risk_assessment, analyst_rating
    )


@app.post("/change-requests/{change_request_id}/analyst-review")
def submit_analyst_review(
    change_request_id: int,
    analyst_rating: str,
    override_reason: str = "",
    consequences: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = authorize_analyst_action(
        db,
        change_request_id,
        current_user,
    )
    assert_workflow_stage(
        change_request,
        {"ANALYST_REVIEW"},
        "Analyst review is not allowed at the current workflow stage.",
    )
    if analyst_rating not in RATING_VALUES:
        raise HTTPException(status_code=400, detail="Unknown analyst rating.")

    risk_assessment = _latest_risk_assessment(db, change_request_id)

    if not risk_assessment:
        raise HTTPException(
            status_code=404,
            detail="Risk assessment not found."
        )

    if not is_residual_calculated(risk_assessment):
        raise HTTPException(
            status_code=400,
            detail=(
                "Residual risk is pending control assessment. Document "
                "controls and recalculate before submitting analyst review."
            ),
        )

    system_rating = risk_assessment.residual_rating

    # Override reason is mandatory when analyst
    # rating differs from system rating
    if analyst_rating != system_rating and not override_reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Override reason is required when analyst rating differs from system rating."
        )

    evaluation = _evaluate_override_for(
        db, change_request_id, risk_assessment, analyst_rating
    )
    min_chars = evaluation["min_reason_chars"]
    if min_chars and len(override_reason.strip()) < min_chars:
        raise HTTPException(
            status_code=400,
            detail=(
                "Lowering the system rating needs a fuller justification: "
                f"at least {min_chars} characters."
            ),
        )

    analyst_override = AnalystOverride(
        change_request_id=change_request_id,
        risk_assessment_id=risk_assessment.id,
        revision=_current_revision(change_request),
        system_rating=system_rating,
        analyst_rating=analyst_rating,
        override_reason=override_reason,
        consequences=consequences,
        override_direction=evaluation["direction"],
        band_delta=evaluation["band_delta"],
        escalation_level=evaluation["escalation_level"],
        escalation_reasons=json.dumps(evaluation["reasons"]),
        reviewed_by=audit_actor_name(current_user),
        status="SUBMITTED"
    )

    db.add(analyst_override)

    # Store the analyst rating on the risk assessment itself
    risk_assessment.analyst_rating = analyst_rating
    risk_assessment.final_rating = analyst_rating
    risk_assessment.updated_at = datetime.utcnow()

    db.flush()

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="ANALYST_REVIEW_SUBMITTED",
        entity_type="AnalystOverride",
        entity_id=analyst_override.id,
        old_value=system_rating,
        new_value=analyst_rating,
        reason=override_reason,
        evidence=consequences,
        policy_version=risk_assessment.risk_model_version,
    )

    if evaluation["escalation_level"] != "NONE":
        create_audit_event(
            db=db,
            change_request_id=change_request_id,
            actor="System",
            action=(
                "OVERRIDE_ESCALATED"
                if evaluation["escalation_level"] == "ESCALATED"
                else "OVERRIDE_FLAGGED_FOR_ACKNOWLEDGEMENT"
            ),
            entity_type="AnalystOverride",
            entity_id=analyst_override.id,
            old_value=system_rating,
            new_value=analyst_rating,
            reason=" ".join(evaluation["reasons"]),
            evidence=" ".join(evaluation["consequences"]),
            policy_version=risk_assessment.risk_model_version,
        )
        if evaluation["escalation_level"] == "ESCALATED":
            notify_override_escalated(
                db,
                change_request,
                system_rating,
                analyst_rating,
            )

    change_request.current_stage = "COMMITTEE_REVIEW"
    change_request.status = "COMMITTEE_REVIEW"

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="System",
        action="WORKFLOW_STAGE_CHANGED",
        entity_type="ChangeRequest",
        entity_id=change_request.id,
        new_value="COMMITTEE_REVIEW",
        reason="Analyst review submitted successfully and is ready for committee review."
    )
    notify_analyst_review_submitted(db, change_request, analyst_rating)
    notify_stage_progress(
        db,
        change_request,
        "COMMITTEE_REVIEW",
        f"analyst rating {analyst_rating}",
    )

    db.commit()
    db.refresh(analyst_override)

    return {
        "message": "Analyst review submitted successfully.",
        "review": serialize_analyst_review(analyst_override),
        "override_evaluation": evaluation,
    }

@app.get("/change-requests/{change_request_id}/analyst-review")
def get_analyst_review(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )

    history = (
        db.query(AnalystOverride)
        .filter(
            AnalystOverride.change_request_id == change_request_id
        )
        .order_by(AnalystOverride.id.asc())
        .all()
    )
    review = _current_record(db, AnalystOverride, change_request)

    return {
        "reviewed": review is not None,
        "review": serialize_analyst_review(review) if review else None,
        "revision": _current_revision(change_request),
        "history": [serialize_analyst_review(item) for item in history],
    }


class ConditionInput(BaseModel):
    description: str
    due_date: Optional[str] = None


class CommitteeDecisionPayload(BaseModel):
    decision: str
    rationale: str
    conditions: list[ConditionInput] = []
    deferred_to: Optional[str] = None
    override_acknowledgement: Optional[str] = None


def _parse_due_date(value: Optional[str], default_days: int) -> datetime:
    if value:
        try:
            return datetime.fromisoformat(value[:10])
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid condition due date: {value}. Use YYYY-MM-DD.",
            )
    return datetime.utcnow() + timedelta(days=default_days)


@app.post("/change-requests/{change_request_id}/committee-decision")
def submit_committee_decision(
    change_request_id: int,
    payload: CommitteeDecisionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db,
        change_request_id,
        current_user,
    )
    assert_role(current_user, ROLE_RISK_COMMITTEE, ROLE_ADMIN)
    assert_not_auditor_write(current_user)
    assert_workflow_stage(
        change_request,
        {"COMMITTEE_REVIEW"},
        "Committee decision is not allowed at the current workflow stage.",
    )

    decision = payload.decision
    rationale = payload.rationale.strip()
    conditions = [
        item for item in payload.conditions if item.description.strip()
    ]

    if decision not in {"APPROVE", "APPROVE_WITH_CONDITIONS", "DEFER", "REJECT"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid committee decision."
        )

    if not rationale:
        raise HTTPException(
            status_code=400,
            detail="Committee rationale is required."
        )

    if decision == "APPROVE_WITH_CONDITIONS" and not conditions:
        raise HTTPException(
            status_code=400,
            detail="At least one condition is required for APPROVE_WITH_CONDITIONS."
        )

    if decision == "DEFER" and payload.deferred_to not in DEFER_TARGETS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Choose who the deferred request goes back to: the Business "
                "Owner (inputs or controls must change) or the Risk Analyst "
                "(the assessment must be revisited)."
            ),
        )

    risk_assessment = _latest_risk_assessment(db, change_request_id)

    if not risk_assessment:
        raise HTTPException(
            status_code=404,
            detail="Risk assessment not found."
        )

    analyst_review = _current_record(db, AnalystOverride, change_request)

    # Consequences of an analyst override: acknowledgement and, when
    # escalated, no unconditional approval.
    escalation = (
        (analyst_review.escalation_level or "NONE")
        if analyst_review
        else "NONE"
    )
    acknowledgement = (payload.override_acknowledgement or "").strip()
    if escalation != "NONE":
        if not acknowledgement:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The analyst lowered the system rating. Acknowledge the "
                    "override with a note before recording a decision."
                ),
            )
        config = get_config_for_version(db, risk_assessment.risk_model_version)
        if (
            escalation == "ESCALATED"
            and decision == "APPROVE"
            and config["override_policy"].get(
                "escalated_blocks_unconditional_approval"
            )
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "This request carries an escalated analyst downgrade and "
                    "cannot be approved without conditions. Approve with "
                    "conditions, defer or reject."
                ),
            )

    revision = _current_revision(change_request)
    committee_decision = CommitteeDecision(
        change_request_id=change_request_id,
        risk_assessment_id=risk_assessment.id,
        analyst_override_id=(
            analyst_review.id
            if analyst_review
            else None
        ),
        revision=revision,
        decision=decision,
        rationale=rationale,
        conditions="\n".join(
            f"- {item.description.strip()}" for item in conditions
        ),
        deferred_to=payload.deferred_to if decision == "DEFER" else None,
        decided_by=audit_actor_name(current_user),
        status="FINAL" if decision != "DEFER" else "DEFERRED"
    )

    db.add(committee_decision)
    db.flush()

    if escalation != "NONE" and analyst_review:
        analyst_review.acknowledged_by = audit_actor_name(current_user)
        analyst_review.acknowledged_at = datetime.utcnow()
        analyst_review.acknowledgement_note = acknowledgement
        create_audit_event(
            db=db,
            change_request_id=change_request_id,
            actor=audit_actor_name(current_user),
            user_id=current_user.id,
            action="OVERRIDE_ACKNOWLEDGED",
            entity_type="AnalystOverride",
            entity_id=analyst_review.id,
            old_value=analyst_review.system_rating,
            new_value=analyst_review.analyst_rating,
            reason=acknowledgement,
        )

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="COMMITTEE_DECISION",
        entity_type="CommitteeDecision",
        entity_id=committee_decision.id,
        new_value=decision,
        reason=rationale,
        evidence=committee_decision.conditions or None,
        policy_version=risk_assessment.risk_model_version,
    )

    if decision == "DEFER":
        status_value, return_stage = DEFER_TARGETS[payload.deferred_to]
        change_request.status = status_value
        change_request.current_stage = return_stage
        change_request.revision = revision + 1
        risk_assessment.assessment_status = "DEFERRED"
        stage_reason = (
            "Committee deferred the request back to the Business Owner to "
            "revise inputs or controls. SLA clock paused until resubmission."
            if payload.deferred_to == "BUSINESS_OWNER"
            else "Committee deferred the request back to the Risk Analyst "
            "for reassessment."
        )
        create_audit_event(
            db=db,
            change_request_id=change_request_id,
            actor="System",
            action="WORKFLOW_STAGE_CHANGED",
            entity_type="ChangeRequest",
            entity_id=change_request.id,
            old_value="COMMITTEE_REVIEW",
            new_value=return_stage,
            reason=f"{stage_reason} Revision {revision + 1} opened.",
        )
    else:
        # The analyst's rating (or the system rating) is the final rating.
        risk_assessment.final_rating = (
            analyst_review.analyst_rating
            if analyst_review
            else risk_assessment.residual_rating
        )
        risk_assessment.assessment_status = "DECIDED"
        change_request.status = FINAL_DECISION_STATUS[decision]
        change_request.current_stage = "COMPLETED"

        if decision == "APPROVE_WITH_CONDITIONS":
            default_days = get_active_methodology(db)[1]["workflow"].get(
                "condition_default_due_days", 30
            )
            for item in conditions:
                condition = ApprovalCondition(
                    change_request_id=change_request_id,
                    committee_decision_id=committee_decision.id,
                    description=item.description.strip(),
                    due_date=_parse_due_date(item.due_date, default_days),
                    status="OPEN",
                )
                db.add(condition)
                db.flush()
                create_audit_event(
                    db=db,
                    change_request_id=change_request_id,
                    actor="System",
                    action="CONDITION_OPENED",
                    entity_type="ApprovalCondition",
                    entity_id=condition.id,
                    new_value=condition.description,
                    reason=f"Due {condition.due_date.date().isoformat()}.",
                )
                notify_condition_opened(db, change_request, condition)

        outcome_reason = {
            "APPROVE": "Committee approved the request. Workflow completed.",
            "APPROVE_WITH_CONDITIONS": (
                "Committee approved the request subject to conditions. "
                "Conditions are tracked until verified."
            ),
            "REJECT": "Committee rejected the request. Workflow closed.",
        }[decision]
        create_audit_event(
            db=db,
            change_request_id=change_request_id,
            actor="System",
            action="WORKFLOW_STAGE_CHANGED",
            entity_type="ChangeRequest",
            entity_id=change_request.id,
            old_value="COMMITTEE_REVIEW",
            new_value="COMPLETED",
            reason=outcome_reason,
        )

    notify_committee_decision(db, change_request, decision)

    risk_assessment.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(committee_decision)

    return {
        "message": "Committee decision submitted successfully.",
        "decision": serialize_committee_decision(db, committee_decision),
        "change_request": {
            "status": change_request.status,
            "current_stage": change_request.current_stage,
            "revision": change_request.revision,
        },
    }

@app.get("/change-requests/{change_request_id}/committee-decision")
def get_committee_decision(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )

    history = (
        db.query(CommitteeDecision)
        .filter(
            CommitteeDecision.change_request_id == change_request_id
        )
        .order_by(CommitteeDecision.id.asc())
        .all()
    )
    decision = _current_record(db, CommitteeDecision, change_request)

    return {
        "decided": decision is not None,
        "decision": (
            serialize_committee_decision(db, decision) if decision else None
        ),
        "revision": _current_revision(change_request),
        "history": [
            serialize_committee_decision(db, item) for item in history
        ],
    }

@app.get("/change-requests/{change_request_id}/assessment-inputs")
def get_assessment_inputs(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    inputs = load_assessment_inputs(db, change_request_id)
    missing = compute_missing_fields(inputs)

    return {
        "change_request_id": change_request_id,
        "inputs": inputs,
        "missing_fields": missing,
        "completeness_percent": completeness_percent(missing),
    }


@app.get("/change-requests/{change_request_id}/intake/completeness")
def get_intake_completeness(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    inputs = load_assessment_inputs(db, change_request_id)
    missing = compute_missing_fields(inputs)

    return {
        "change_request_id": change_request_id,
        "missing_fields": missing,
        "completeness_percent": completeness_percent(missing),
        "ready_for_risk_calculation": len(missing) == 0,
    }


@app.post("/change-requests/{change_request_id}/submit-for-analyst")
def submit_for_analyst(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db,
        change_request_id,
        current_user,
    )
    assert_role(current_user, ROLE_BUSINESS_OWNER, ROLE_ADMIN)
    assert_not_auditor_write(current_user)

    if is_submitted(change_request):
        raise HTTPException(
            status_code=400,
            detail="This change request has already been submitted.",
        )

    inputs = load_assessment_inputs(db, change_request_id)
    missing = compute_missing_fields(inputs)

    if missing:
        labels = ", ".join(item["label"] for item in missing)
        raise HTTPException(
            status_code=400,
            detail=(
                "Please save all required fields before submitting. "
                f"Missing: {labels}."
            ),
        )

    change_request.status = "SUBMITTED"

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="CHANGE_REQUEST_SUBMITTED",
        entity_type="ChangeRequest",
        entity_id=change_request_id,
        new_value="SUBMITTED",
        reason="Business owner submitted the request for Risk Analyst review.",
    )
    notify_request_submitted(db, change_request)
    notify_stage_progress(db, change_request, "SUBMITTED")
    db.commit()

    return {
        "change_request_id": change_request_id,
        "status": "SUBMITTED",
        "message": "Change request submitted. It is now visible in the Risk Analyst queue.",
    }


@app.get("/change-requests/{change_request_id}/intake/brd-status")
def get_brd_status(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    upload = get_latest_brd_upload(change_request_id)

    return {
        "change_request_id": change_request_id,
        "uploaded": upload is not None,
        "upload": upload,
    }


@app.post("/change-requests/{change_request_id}/intake/upload-brd")
async def upload_brd(
    change_request_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    file_bytes = await file.read()
    filename = file.filename or "brd-upload.pdf"

    try:
        text = extract_text_from_bytes(file_bytes, filename)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    save_brd_file(change_request_id, file_bytes, filename)

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="BRD_UPLOADED",
        entity_type="IntakeDocument",
        new_value=filename,
        reason=f"BRD uploaded ({len(text)} characters extracted for processing).",
    )
    db.commit()

    return {
        "change_request_id": change_request_id,
        "filename": filename,
        "character_count": len(text),
        "preview": text[:1500],
    }


@app.delete("/change-requests/{change_request_id}/intake/brd")
def delete_brd(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    removed = delete_brd_uploads(change_request_id)
    if not removed:
        raise HTTPException(status_code=404, detail="No BRD upload found.")

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="BRD_REMOVED",
        entity_type="IntakeDocument",
        reason="BRD upload removed by user.",
    )
    db.commit()

    return {"change_request_id": change_request_id, "removed": True}


@app.post("/change-requests/{change_request_id}/intake/extract-brd")
async def extract_brd_intake(
    change_request_id: int,
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = authorize_intake_write(db, change_request_id, current_user)

    if file is not None:
        file_bytes = await file.read()
        filename = file.filename or "brd-upload.pdf"
        document_text = extract_text_from_bytes(file_bytes, filename)
        save_brd_file(change_request_id, file_bytes, filename)
    else:
        folder = (
            Path(__file__).resolve().parent.parent
            / "data"
            / "uploads"
            / str(change_request_id)
        )
        if not folder.exists():
            raise HTTPException(
                status_code=400,
                detail="Upload a BRD before extraction.",
            )

        files = sorted(
            [
                path
                for path in folder.iterdir()
                if path.is_file()
            ],
            key=lambda path: path.stat().st_mtime,
        )
        if not files:
            raise HTTPException(
                status_code=400,
                detail="Upload a BRD before extraction.",
            )

        latest = files[-1]
        document_text = extract_text_from_bytes(
            latest.read_bytes(),
            latest.name,
        )
        filename = latest.name

    try:
        extracted, extraction_method = extract_intake_from_brd(
            document_text
        )
    except ValueError as error:
        raise HTTPException(status_code=502, detail=str(error))
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"BRD extraction failed: {error}",
        )

    current = load_assessment_inputs(db, change_request_id)
    merged = merge_extraction_with_inputs(current, extracted)
    missing = compute_missing_fields(merged)

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="AI Intake",
        action="BRD_EXTRACTED",
        entity_type="IntakeDocument",
        new_value=filename,
        reason=json.dumps(
            {
                "extraction_method": extraction_method,
                "missing_count": len(missing),
                "low_confidence": (
                    extracted.get("provenance_notes", {}).get(
                        "low_confidence_fields",
                        [],
                    )
                ),
            }
        ),
    )
    notify_brd_extracted(db, change_request)
    db.commit()

    return {
        "filename": filename,
        "extraction_method": extraction_method,
        "extracted": extracted,
        "merged_preview": merged,
        "missing_fields": missing,
        "completeness_percent": completeness_percent(missing),
        "diff_from_saved": compute_field_diff(current, merged),
    }


@app.post("/change-requests/{change_request_id}/assessment-inputs/sync")
def sync_assessment_inputs(
    change_request_id: int,
    body: SyncInputsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_assessment_inputs_sync(db, change_request_id, current_user)
    save_assessment_inputs(db, change_request_id, body.inputs)

    refreshed = load_assessment_inputs(db, change_request_id)
    missing = compute_missing_fields(refreshed)

    return {
        "inputs": refreshed,
        "missing_fields": missing,
        "completeness_percent": completeness_percent(missing),
        "ready_for_risk_calculation": len(missing) == 0,
    }


@app.post("/change-requests/{change_request_id}/intake/apply-extraction")
def apply_extraction(
    change_request_id: int,
    body: ApplyExtractionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    current = load_assessment_inputs(db, change_request_id)
    merged = merge_extraction_with_inputs(
        current,
        body.extracted,
    )

    try:
        save_assessment_inputs(db, change_request_id, merged)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not save all extracted fields. Some required values "
                f"are still missing (e.g. product name). Details: {error.orig}"
            ),
        )

    missing = compute_missing_fields(merged)

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="INTAKE_APPLIED",
        entity_type="ChangeRequest",
        entity_id=change_request_id,
        reason="BRD extraction applied to assessment inputs.",
    )
    db.commit()

    return {
        "inputs": merged,
        "missing_fields": missing,
        "completeness_percent": completeness_percent(missing),
        "ready_for_risk_calculation": len(missing) == 0,
    }


@app.get("/change-requests/{change_request_id}/controls")
def get_controls(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )
    assert_risk_results_visible(db, current_user, change_request)

    controls = (
        db.query(Control)
        .filter(Control.change_request_id == change_request_id)
        .order_by(Control.id.asc())
        .all()
    )

    return {
        "change_request_id": change_request_id,
        "controls": [
            {
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
            }
            for control in controls
        ],
    }


@app.get("/change-requests/{change_request_id}/risk-factors")
def get_risk_factors(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )
    assert_risk_results_visible(db, current_user, change_request)

    factors = (
        db.query(RiskFactor)
        .filter(RiskFactor.change_request_id == change_request_id)
        .all()
    )

    return {
        "change_request_id": change_request_id,
        "risk_factors": [
            {
                "id": factor.id,
                "risk_category": factor.risk_category,
                "risk_factor": factor.risk_factor,
                "factor_value": factor.factor_value,
                "factor_score": factor.factor_score,
                "factor_weight": factor.factor_weight,
                "source_reference": factor.source_reference,
            }
            for factor in factors
        ],
    }


@app.get("/change-requests/{change_request_id}/ai-assessment")
def get_ai_assessment(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )
    assert_risk_results_visible(db, current_user, change_request)

    recommendation = (
        db.query(AIRecommendation)
        .filter(
            AIRecommendation.change_request_id == change_request_id
        )
        .order_by(AIRecommendation.id.desc())
        .first()
    )

    if not recommendation:
        raise HTTPException(
            status_code=404,
            detail="AI assessment not found.",
        )

    assessment_payload = {}

    try:
        assessment_payload = json.loads(
            recommendation.risk_analysis or "{}"
        )
    except json.JSONDecodeError:
        assessment_payload = {}

    return {
        "id": recommendation.id,
        "change_request_id": recommendation.change_request_id,
        "model": recommendation.model_name,
        "model_version": recommendation.model_version,
        "status": recommendation.status,
        "recommendation": recommendation.recommendation,
        "assessment": {
            "executive_summary": recommendation.assessment_summary,
            "risk_assessment": assessment_payload,
            "regulatory_considerations": json.loads(
                recommendation.regulatory_considerations or "[]"
            ),
            "rationale": recommendation.rationale,
        },
    }


@app.get("/change-requests/{change_request_id}/export")
def export_assessment(
    change_request_id: int,
    format: str = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_request = get_change_request_or_404(
        db, change_request_id, current_user
    )
    assert_risk_results_visible(db, current_user, change_request)

    try:
        export_data = build_assessment_export(db, change_request_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))

    request_number = (
        export_data.get("change_request", {}).get(
            "request_number",
            str(change_request_id),
        )
    )

    if format.lower() == "pdf":
        pdf_bytes = export_to_pdf_bytes(export_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{request_number}-assessment.pdf"'
                )
            },
        )

    return Response(
        content=json.dumps(export_data, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{request_number}-assessment.json"'
            )
        },
    )


@app.get("/change-requests/{change_request_id}/audit-events")
def get_audit_events(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)
    assert_role(
        current_user,
        ROLE_BUSINESS_OWNER,
        ROLE_RISK_ANALYST,
        ROLE_RISK_COMMITTEE,
        ROLE_AUDITOR,
        ROLE_ADMIN,
    )

    events = (
        db.query(AuditEvent)
        .filter(
            AuditEvent.change_request_id == change_request_id
        )
        .order_by(AuditEvent.created_at.asc())
        .all()
    )

    return {
        "change_request_id": change_request_id,
        "events": [
            {
                "id": event.id,
                "change_request_id": event.change_request_id,
                "actor": event.actor,
                "action": event.action,
                "entity_type": event.entity_type,
                "entity_id": event.entity_id,
                "old_value": event.old_value,
                "new_value": event.new_value,
                "reason": event.reason,
                "evidence": event.evidence,
                "model_version": event.model_version,
                "policy_version": event.policy_version,
                "created_at": event.created_at,
            }
            for event in events
        ]
    }

def _period_growth_pct(current_count: int, previous_count: int) -> float:
    if previous_count == 0:
        return 100.0 if current_count > 0 else 0.0
    return round(
        ((current_count - previous_count) / previous_count) * 100,
        1,
    )


@app.get("/dashboard/landing-metrics")
def get_landing_metrics(db: Session = Depends(get_db)):
    from sqlalchemy import func

    now = datetime.utcnow()
    last_30_start = now - timedelta(days=30)
    prior_30_start = now - timedelta(days=60)

    def counts_in_windows(model, timestamp_column):
        total = db.query(func.count(model.id)).scalar() or 0
        last_30 = (
            db.query(func.count(model.id))
            .filter(timestamp_column >= last_30_start)
            .scalar()
            or 0
        )
        prior_30 = (
            db.query(func.count(model.id))
            .filter(
                timestamp_column >= prior_30_start,
                timestamp_column < last_30_start,
            )
            .scalar()
            or 0
        )
        return total, _period_growth_pct(last_30, prior_30)

    change_request_total, change_request_growth = counts_in_windows(
        ChangeRequest, ChangeRequest.created_at
    )
    evidence_total, evidence_growth = counts_in_windows(
        RegulatoryEvidence, RegulatoryEvidence.created_at
    )
    ai_assessment_total, ai_assessment_growth = counts_in_windows(
        AIRecommendation, AIRecommendation.generated_at
    )

    high_risk_ratings = ("CRITICAL", "HIGH")
    latest_assessment_ids = (
        db.query(func.max(RiskAssessment.id))
        .group_by(RiskAssessment.change_request_id)
        .all()
    )
    latest_ids = [row[0] for row in latest_assessment_ids]
    high_risk_total = 0
    if latest_ids:
        high_risk_total = (
            db.query(func.count(RiskAssessment.id))
            .filter(
                RiskAssessment.id.in_(latest_ids),
                func.coalesce(
                    RiskAssessment.final_rating,
                    RiskAssessment.residual_rating,
                ).in_(high_risk_ratings),
            )
            .scalar()
            or 0
        )

    high_risk_last_30 = (
        db.query(func.count(RiskAssessment.id))
        .filter(
            RiskAssessment.created_at >= last_30_start,
            func.coalesce(
                RiskAssessment.final_rating,
                RiskAssessment.residual_rating,
            ).in_(high_risk_ratings),
        )
        .scalar()
        or 0
    )
    high_risk_prior_30 = (
        db.query(func.count(RiskAssessment.id))
        .filter(
            RiskAssessment.created_at >= prior_30_start,
            RiskAssessment.created_at < last_30_start,
            func.coalesce(
                RiskAssessment.final_rating,
                RiskAssessment.residual_rating,
            ).in_(high_risk_ratings),
        )
        .scalar()
        or 0
    )
    high_risk_growth = _period_growth_pct(high_risk_last_30, high_risk_prior_30)

    def approval_rate(query):
        decisions = query.all()
        total = len(decisions)
        if total == 0:
            return None
        approved = sum(
            1
            for decision in decisions
            if decision.decision
            in ("APPROVE", "APPROVE_WITH_CONDITIONS")
        )
        return round((approved / total) * 100, 1)

    overall_approval_rate = approval_rate(db.query(CommitteeDecision))
    last_30_approval_rate = approval_rate(
        db.query(CommitteeDecision).filter(
            CommitteeDecision.created_at >= last_30_start
        )
    )
    prior_30_approval_rate = approval_rate(
        db.query(CommitteeDecision).filter(
            CommitteeDecision.created_at >= prior_30_start,
            CommitteeDecision.created_at < last_30_start,
        )
    )
    if last_30_approval_rate is None or prior_30_approval_rate is None:
        approval_rate_growth = 0.0
    else:
        approval_rate_growth = round(
            last_30_approval_rate - prior_30_approval_rate, 1
        )

    return {
        "change_requests": {
            "value": change_request_total,
            "change_pct": change_request_growth,
        },
        "approval_rate": {
            "value": overall_approval_rate,
            "change_pct": approval_rate_growth,
        },
        "evidence_items": {
            "value": evidence_total,
            "change_pct": evidence_growth,
        },
        "ai_assessments": {
            "value": ai_assessment_total,
            "change_pct": ai_assessment_growth,
        },
        "high_risk_alerts": {
            "value": high_risk_total,
            "change_pct": high_risk_growth,
        },
    }


@app.get("/dashboard/risk-summary")
def get_dashboard_risk_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    accessible_ids = {
        row.id
        for row in filter_change_requests_for_user(
            current_user,
            db.query(ChangeRequest),
        ).all()
    }

    if not accessible_ids:
        return {
            "total_assessments": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
        }

    assessments = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.change_request_id.in_(accessible_ids))
        .order_by(RiskAssessment.id.desc())
        .all()
    )

    # Keep only the latest assessment for each change request
    latest_assessments = {}

    for assessment in assessments:
        if assessment.change_request_id not in latest_assessments:
            latest_assessments[assessment.change_request_id] = assessment

    risk_counts = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }

    if current_user.role == ROLE_BUSINESS_OWNER:
        released_ids = {
            row.id
            for row in db.query(ChangeRequest)
            .filter(ChangeRequest.id.in_(list(latest_assessments)))
            .all()
            if risk_results_released(db, row)
        }
        latest_assessments = {
            key: value
            for key, value in latest_assessments.items()
            if key in released_ids
        }

    for assessment in latest_assessments.values():
        rating = assessment.final_rating or assessment.residual_rating

        if rating in risk_counts:
            risk_counts[rating] += 1

    return {
        "total_assessments": len(latest_assessments),
        "critical": risk_counts["CRITICAL"],
        "high": risk_counts["HIGH"],
        "medium": risk_counts["MEDIUM"],
        "low": risk_counts["LOW"]
    }

def _methodology_report_or_404(
    db: Session,
    change_request_id: int,
    current_user: User,
) -> dict:
    get_change_request_or_404(db, change_request_id, current_user)
    assert_role(
        current_user,
        ROLE_RISK_ANALYST,
        ROLE_RISK_COMMITTEE,
        ROLE_AUDITOR,
        ROLE_ADMIN,
    )
    try:
        return build_risk_methodology(db, change_request_id)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


@app.get("/change-requests/{change_request_id}/risk-methodology")
def get_risk_methodology(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _methodology_report_or_404(db, change_request_id, current_user)


@app.get("/change-requests/{change_request_id}/risk-methodology/pdf")
def download_risk_methodology_pdf(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _methodology_report_or_404(db, change_request_id, current_user)
    request_number = report["change_request"]["request_number"]
    return Response(
        content=methodology_to_pdf_bytes(report),
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{request_number}-risk-methodology.pdf"'
            )
        },
    )


@app.get("/assessments/overview")
def get_assessments_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    change_requests = (
        filter_change_requests_for_user(current_user, db.query(ChangeRequest))
        .order_by(ChangeRequest.id.desc())
        .all()
    )
    ids = [change_request.id for change_request in change_requests]

    def latest_by_request(model):
        if not ids:
            return {}
        latest = {}
        rows = (
            db.query(model)
            .filter(model.change_request_id.in_(ids))
            .order_by(model.id.desc())
            .all()
        )
        for row in rows:
            latest.setdefault(row.change_request_id, row)
        return latest

    assessments = latest_by_request(RiskAssessment)
    reviews = latest_by_request(AnalystOverride)
    decisions = latest_by_request(CommitteeDecision)

    items = []
    for change_request in change_requests:
        assessment = assessments.get(change_request.id)
        review = reviews.get(change_request.id)
        decision = decisions.get(change_request.id)
        released = (
            review is not None
            or (change_request.current_stage or "") in RISK_RELEASED_STAGES
        )
        show_risk = assessment is not None and (
            current_user.role != ROLE_BUSINESS_OWNER or released
        )

        items.append({
            "id": change_request.id,
            "request_number": change_request.request_number,
            "title": change_request.title,
            "business_unit": change_request.business_unit,
            "change_type": change_request.change_type,
            "priority": change_request.priority,
            "requested_by": change_request.requested_by,
            "status": change_request.status,
            "current_stage": change_request.current_stage,
            "created_at": change_request.created_at,
            "risk_released": released,
            # Hidden from Business Owners until the analyst has reviewed it.
            "risk_calculated": assessment is not None,
            "risk": (
                {
                    "inherent_score": assessment.inherent_score,
                    "inherent_rating": assessment.inherent_rating,
                    "residual_score": assessment.residual_score,
                    "residual_rating": assessment.residual_rating,
                    "residual_status": (
                        assessment.residual_status or "CALCULATED"
                    ),
                    "controls_assessed": bool(assessment.controls_assessed),
                    "final_rating": assessment.final_rating,
                    "control_adjustment": assessment.control_adjustment,
                    "category_scores": {
                        "CUSTOMER": assessment.customer_risk_score,
                        "PRODUCT": assessment.product_risk_score,
                        "GEOGRAPHY": assessment.geography_risk_score,
                        "TRANSACTION": assessment.transaction_risk_score,
                        "CHANNEL": assessment.channel_risk_score,
                        "THIRD_PARTY": assessment.third_party_risk_score,
                        "FRAUD": assessment.fraud_risk_score,
                    },
                    "calculated_at": assessment.created_at,
                }
                if show_risk
                else None
            ),
            "analyst_review": (
                {
                    "system_rating": review.system_rating,
                    "analyst_rating": review.analyst_rating,
                    "accepted": review.analyst_rating == review.system_rating,
                    "reviewed_by": review.reviewed_by,
                    "reviewed_at": review.created_at,
                    "consequences": review.consequences,
                    "override_direction": review.override_direction or "NONE",
                    "escalation_level": review.escalation_level or "NONE",
                }
                if review
                else None
            ),
            "committee_decision": (
                {
                    "decision": decision.decision,
                    "decided_by": decision.decided_by,
                    "decided_at": decision.created_at,
                    "conditions": decision.conditions,
                    "deferred_to": decision.deferred_to,
                }
                if decision
                else None
            ),
        })

    return {"items": items}
