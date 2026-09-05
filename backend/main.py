from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from backend.database import engine, get_db
from risk_engine.risk_calculator import generate_risk_assessment
from risk_engine.risk_factor_generator import generate_risk_factors
from rag.evidence_service import generate_evidence_for_change_request
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
    RegulatoryEvidence
)


app = FastAPI(
    title="MiniRiskers",
    description="AI-Assisted Financial Crime Risk Assessment Workbench",
    version="1.0.0"
)


# Create database tables
Base.metadata.create_all(bind=engine)


@app.get("/")
def root():

    return {
        "application": "MiniRiskers",
        "status": "running",
        "message": "Risk Assessment Workbench API"
    }

@app.get("/change-requests")
def get_change_requests(db: Session = Depends(get_db)):
    return db.query(ChangeRequest).all()

@app.post("/change-requests")
def create_change_request(
    request_number: str,
    title: str,
    description: str,
    change_type: str,
    product_type: str,
    business_unit: str,
    customer_segment: str,
    requested_by: str,
    db: Session = Depends(get_db)
):

    change_request = ChangeRequest(
        request_number=request_number,
        title=title,
        description=description,
        change_type=change_type,
        product_type=product_type,
        business_unit=business_unit,
        customer_segment=customer_segment,
        requested_by=requested_by
    )

    db.add(change_request)
    db.commit()
    db.refresh(change_request)

    return change_request

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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):
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
    db: Session = Depends(get_db)
):

    assessment = generate_risk_assessment(
        db,
        change_request_id
    )

    return assessment

@app.post("/change-requests/{change_request_id}/generate-risk-factors")
def generate_factors(
    change_request_id: int,
    db: Session = Depends(get_db)
):

    factors = generate_risk_factors(
        db,
        change_request_id
    )

    return {
        "change_request_id": change_request_id,
        "risk_factors_generated": len(factors),
        "risk_factors": factors
    }

@app.post("/change-requests/{change_request_id}/generate-regulatory-evidence")
def generate_regulatory_evidence(
    change_request_id: int,
    db: Session = Depends(get_db)
):

    evidence = generate_evidence_for_change_request(
        db,
        change_request_id,
        number_of_results=3
    )

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
    db: Session = Depends(get_db)
):

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