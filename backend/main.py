import json
from pathlib import Path

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
from datetime import datetime
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
    assert_not_auditor_write,
    assert_role,
    assert_workflow_stage,
    filter_change_requests_for_user,
    get_change_request_or_404,
)
from backend.seed_users import seed_development_users
from risk_engine.risk_calculator import generate_risk_assessment
from risk_engine.risk_factor_generator import generate_risk_factors
from rag.evidence_service import generate_evidence_for_change_request
from backend.assessment_service import generate_ai_assessment
from backend.models import (
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
from backend.request_numbers import (
    allocate_request_number,
    peek_next_request_number,
)
from backend.intake_service import (
    completeness_percent,
    extract_intake_from_brd,
    extract_text_from_bytes,
    get_latest_brd_upload,
    run_intake_agent_turn,
    save_assessment_inputs,
    save_brd_file,
)

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
    )

    db.add(event)

    return event


class IntakeChatRequest(BaseModel):
    message: str


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
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# Create database tables
Base.metadata.create_all(bind=engine)


def apply_sqlite_schema_patches():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "audit_events" not in inspector.get_table_names():
        return

    column_names = {
        column["name"]
        for column in inspector.get_columns("audit_events")
    }
    if "user_id" not in column_names:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE audit_events "
                    "ADD COLUMN user_id INTEGER"
                )
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
    return change_request


@app.on_event("startup")
def on_startup():
    apply_sqlite_schema_patches()
    db = SessionLocal()
    try:
        seed_development_users(db)
    finally:
        db.close()


@app.get("/")
def root():

    return {
        "application": "MiniRiskers",
        "status": "running",
        "message": "Risk Assessment Workbench API"
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
        "created_at": change_request.created_at
    }

@app.get("/change-requests/{change_request_id}/risk-assessment")
def get_risk_assessment(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)

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
    product_category: str,
    product_description: str,
    digital_channel: bool,
    branch_channel: bool,
    agent_channel: bool,
    cross_border: bool,
    cash_involved: bool,
    transaction_type: str,
    transaction_limit: float,
    expected_transaction_volume: float,
    expected_transaction_frequency: str,
    currency: str,
    countries_supported: str,
    new_product_flag: bool,
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
    customer_segment: str,
    individual_customer: bool,
    business_customer: bool,
    foreign_customer: bool,
    onboarding_method: str,
    kyc_required: bool,
    kyc_method: str,
    beneficial_owner_required: bool,
    pep_exposure: bool,
    high_risk_customer_exposure: bool,
    expected_customer_count: int,
    customer_geographic_distribution: str,
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
    country_code: str,
    domestic_or_cross_border: str,
    customer_country: str,
    transaction_country: str,
    beneficiary_country: str,
    high_risk_jurisdiction_flag: bool,
    sanctions_exposure: bool,
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
    average_transaction_amount: float,
    maximum_transaction_amount: float,
    expected_daily_volume: float,
    expected_monthly_volume: float,
    expected_frequency: str,
    cash_involved: bool,
    cross_border: bool,
    number_of_countries: int,
    transaction_velocity: float,
    round_amount_risk: bool,
    rapid_movement_possible: bool,
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
    mobile_banking: bool,
    internet_banking: bool,
    branch: bool,
    agent: bool,
    api: bool,
    third_party_channel: bool,
    remote_onboarding: bool,
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
    country: str,
    india_based: bool,
    service_description: str,
    handles_customer_data: bool,
    handles_transactions: bool,
    handles_payment_data: bool,
    criticality: str,
    outsourcing_type: str,
    due_diligence_completed: bool,
    contract_completed: bool,
    audit_rights: bool,
    business_continuity_plan: bool,
    cross_border_processing: bool,
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
        change_request_id
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
        reason="Weighted risk assessment calculated.",
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

    db.commit()

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
    get_change_request_or_404(db, change_request_id, current_user)

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
    # Find the latest risk assessment
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
            detail="Risk assessment not found."
        )

    system_rating = risk_assessment.residual_rating

    # Override reason is mandatory when analyst
    # rating differs from system rating
    if analyst_rating != system_rating and not override_reason.strip():
        raise HTTPException(
            status_code=400,
            detail="Override reason is required when analyst rating differs from system rating."
        )

    analyst_override = AnalystOverride(
        change_request_id=change_request_id,
        risk_assessment_id=risk_assessment.id,
        system_rating=system_rating,
        analyst_rating=analyst_rating,
        override_reason=override_reason,
        consequences=consequences,
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
        evidence=consequences
    )

    change_request.current_stage = "COMMITTEE_REVIEW"

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

    db.commit()
    db.refresh(analyst_override)

    return {
        "message": "Analyst review submitted successfully.",
        "review": {
            "id": analyst_override.id,
            "change_request_id": change_request_id,
            "risk_assessment_id": risk_assessment.id,
            "system_rating": system_rating,
            "analyst_rating": analyst_rating,
            "override_reason": override_reason,
            "consequences": consequences,
            "reviewed_by": analyst_override.reviewed_by,
            "status": analyst_override.status,
            "created_at": analyst_override.created_at,
        }
    }

@app.get("/change-requests/{change_request_id}/analyst-review")
def get_analyst_review(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)

    review = (
        db.query(AnalystOverride)
        .filter(
            AnalystOverride.change_request_id == change_request_id
        )
        .order_by(AnalystOverride.id.desc())
        .first()
    )

    if not review:
        return {
            "reviewed": False,
            "review": None
        }

    return {
        "reviewed": True,
        "review": {
            "id": review.id,
            "change_request_id": review.change_request_id,
            "risk_assessment_id": review.risk_assessment_id,
            "system_rating": review.system_rating,
            "analyst_rating": review.analyst_rating,
            "override_reason": review.override_reason,
            "consequences": review.consequences,
            "reviewed_by": review.reviewed_by,
            "status": review.status,
            "created_at": review.created_at
        }
    }

@app.post("/change-requests/{change_request_id}/committee-decision")
def submit_committee_decision(
    change_request_id: int,
    decision: str,
    rationale: str,
    conditions: str = "",
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

    allowed_decisions = {
        "APPROVE",
        "APPROVE_WITH_CONDITIONS",
        "DEFER",
        "REJECT"
    }

    if decision not in allowed_decisions:
        raise HTTPException(
            status_code=400,
            detail="Invalid committee decision."
        )

    if not rationale.strip():
        raise HTTPException(
            status_code=400,
            detail="Committee rationale is required."
        )

    if (
        decision == "APPROVE_WITH_CONDITIONS"
        and not conditions.strip()
    ):
        raise HTTPException(
            status_code=400,
            detail="Conditions are required for APPROVE_WITH_CONDITIONS."
        )

    # Get latest risk assessment
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
            detail="Risk assessment not found."
        )

    # Get latest analyst review
    analyst_review = (
        db.query(AnalystOverride)
        .filter(
            AnalystOverride.change_request_id == change_request_id
        )
        .order_by(AnalystOverride.id.desc())
        .first()
    )

    committee_decision = CommitteeDecision(
        change_request_id=change_request_id,
        risk_assessment_id=risk_assessment.id,
        analyst_override_id=(
            analyst_review.id
            if analyst_review
            else None
        ),
        decision=decision,
        rationale=rationale,
        conditions=conditions,
        decided_by=audit_actor_name(current_user),
        status="FINAL"
    )

    db.add(committee_decision)

    # Store final decision on the risk assessment
    risk_assessment.final_rating = (
        analyst_review.analyst_rating
        if analyst_review
        else risk_assessment.residual_rating
    )

    risk_assessment.assessment_status = "DECIDED"
    risk_assessment.updated_at = datetime.utcnow()

    change_request.status = decision
    change_request.current_stage = "COMPLETED"

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="System",
        action="WORKFLOW_STAGE_CHANGED",
        entity_type="ChangeRequest",
        entity_id=change_request.id,
        new_value="COMPLETED",
        reason="Committee decision submitted and workflow completed."
    )

    db.flush()

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="COMMITTEE_DECISION",
        entity_type="CommitteeDecision",
        entity_id=committee_decision.id,
        new_value=committee_decision.decision,
        reason=committee_decision.rationale,
        evidence=committee_decision.conditions
    )

    db.commit()
    db.refresh(committee_decision)

    return {
        "message": "Committee decision submitted successfully.",
        "decision": {
            "id": committee_decision.id,
            "change_request_id": change_request_id,
            "risk_assessment_id": committee_decision.risk_assessment_id,
            "analyst_override_id": committee_decision.analyst_override_id,
            "decision": committee_decision.decision,
            "rationale": committee_decision.rationale,
            "conditions": committee_decision.conditions,
            "decided_by": committee_decision.decided_by,
            "status": committee_decision.status,
            "created_at": committee_decision.created_at,
        }
    }

@app.get("/change-requests/{change_request_id}/committee-decision")
def get_committee_decision(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)

    decision = (
        db.query(CommitteeDecision)
        .filter(
            CommitteeDecision.change_request_id == change_request_id
        )
        .order_by(CommitteeDecision.id.desc())
        .first()
    )

    if not decision:
        return {
            "decided": False,
            "decision": None
        }

    return {
        "decided": True,
        "decision": {
            "id": decision.id,
            "change_request_id": decision.change_request_id,
            "risk_assessment_id": decision.risk_assessment_id,
            "analyst_override_id": decision.analyst_override_id,
            "decision": decision.decision,
            "rationale": decision.rationale,
            "conditions": decision.conditions,
            "decided_by": decision.decided_by,
            "status": decision.status,
            "created_at": decision.created_at,
        }
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


@app.post("/change-requests/{change_request_id}/intake/extract-brd")
async def extract_brd_intake(
    change_request_id: int,
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

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
    authorize_intake_write(db, change_request_id, current_user)
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


@app.post("/change-requests/{change_request_id}/intake/chat")
def intake_chat(
    change_request_id: int,
    body: IntakeChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_intake_write(db, change_request_id, current_user)

    if not body.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message is required.",
        )

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor=audit_actor_name(current_user),
        user_id=current_user.id,
        action="INTAKE_AGENT_USER",
        entity_type="IntakeChat",
        new_value=body.message.strip(),
        reason="User message to intake assistant.",
    )
    db.flush()

    try:
        result = run_intake_agent_turn(
            db,
            change_request_id,
            body.message.strip(),
        )
    except ValueError as error:
        raise HTTPException(status_code=502, detail=str(error))
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Intake assistant failed: {error}",
        )

    create_audit_event(
        db=db,
        change_request_id=change_request_id,
        actor="AI Intake Agent",
        action="INTAKE_AGENT_ASSISTANT",
        entity_type="IntakeChat",
        new_value=result["assistant_message"],
        reason=json.dumps(result.get("field_updates") or {}),
    )
    db.commit()

    return result


@app.get("/change-requests/{change_request_id}/controls")
def get_controls(
    change_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_change_request_or_404(db, change_request_id, current_user)

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
    get_change_request_or_404(db, change_request_id, current_user)

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
    get_change_request_or_404(db, change_request_id, current_user)

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
    get_change_request_or_404(db, change_request_id, current_user)

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