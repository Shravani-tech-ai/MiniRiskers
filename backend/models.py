from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text
)

from datetime import datetime

from backend.database import Base


class ChangeRequest(Base):

    __tablename__ = "change_requests"

    id = Column(Integer, primary_key=True, index=True)

    request_number = Column(
        String,
        unique=True,
        index=True
    )

    title = Column(String, nullable=False)

    description = Column(Text)

    change_type = Column(String)

    product_type = Column(String)

    business_unit = Column(String)

    customer_segment = Column(String)

    requested_by = Column(String)

    assigned_analyst = Column(String)

    status = Column(
        String,
        default="DRAFT"
    )

    current_stage = Column(
        String,
        default="REQUEST_CREATED",
        nullable=False
    )

    priority = Column(
        String,
        default="MEDIUM"
    )

    proposed_go_live_date = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
    
class Product(Base):

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    product_name = Column(
        String,
        nullable=False
    )

    product_category = Column(String)

    product_description = Column(Text)

    digital_channel = Column(Boolean, default=False)

    branch_channel = Column(Boolean, default=False)

    agent_channel = Column(Boolean, default=False)

    cross_border = Column(Boolean, default=False)

    cash_involved = Column(Boolean, default=False)

    transaction_type = Column(String)

    transaction_limit = Column(Float)

    expected_transaction_volume = Column(Float)

    expected_transaction_frequency = Column(String)

    currency = Column(String)

    countries_supported = Column(Text)

    new_product_flag = Column(Boolean, default=True)

class CustomerProfile(Base):

    __tablename__ = "customer_profiles"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    customer_type = Column(String)

    customer_segment = Column(String)

    individual_customer = Column(Boolean, default=True)

    business_customer = Column(Boolean, default=False)

    foreign_customer = Column(Boolean, default=False)

    onboarding_method = Column(String)

    kyc_required = Column(Boolean, default=True)

    kyc_method = Column(String)

    beneficial_owner_required = Column(Boolean, default=False)

    pep_exposure = Column(Boolean, default=False)

    high_risk_customer_exposure = Column(Boolean, default=False)

    expected_customer_count = Column(Integer)

    customer_geographic_distribution = Column(Text)

class Geography(Base):

    __tablename__ = "geographies"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    country = Column(String)

    country_code = Column(String)

    domestic_or_cross_border = Column(String)

    customer_country = Column(String)

    transaction_country = Column(String)

    beneficiary_country = Column(String)

    high_risk_jurisdiction_flag = Column(
        Boolean,
        default=False
    )

    sanctions_exposure = Column(
        Boolean,
        default=False
    )

class TransactionProfile(Base):

    __tablename__ = "transaction_profiles"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    transaction_type = Column(String)

    average_transaction_amount = Column(Float)

    maximum_transaction_amount = Column(Float)

    expected_daily_volume = Column(Float)

    expected_monthly_volume = Column(Float)

    expected_frequency = Column(String)

    cash_involved = Column(Boolean, default=False)

    cross_border = Column(Boolean, default=False)

    number_of_countries = Column(Integer)

    transaction_velocity = Column(Float)

    round_amount_risk = Column(Boolean, default=False)

    rapid_movement_possible = Column(
        Boolean,
        default=False
    )

class Channel(Base):

    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    channel_type = Column(String)

    mobile_banking = Column(Boolean, default=False)

    internet_banking = Column(Boolean, default=False)

    branch = Column(Boolean, default=False)

    agent = Column(Boolean, default=False)

    api = Column(Boolean, default=False)

    third_party_channel = Column(
        Boolean,
        default=False
    )

    remote_onboarding = Column(
        Boolean,
        default=False
    )

class Vendor(Base):

    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    vendor_name = Column(String)

    vendor_type = Column(String)

    country = Column(String)

    india_based = Column(Boolean, default=True)

    service_description = Column(Text)

    handles_customer_data = Column(
        Boolean,
        default=False
    )

    handles_transactions = Column(
        Boolean,
        default=False
    )

    handles_payment_data = Column(
        Boolean,
        default=False
    )

    criticality = Column(String)

    outsourcing_type = Column(String)

    due_diligence_completed = Column(
        Boolean,
        default=False
    )

    contract_completed = Column(
        Boolean,
        default=False
    )

    audit_rights = Column(
        Boolean,
        default=False
    )

    business_continuity_plan = Column(
        Boolean,
        default=False
    )

    cross_border_processing = Column(
        Boolean,
        default=False
    )

class Control(Base):

    __tablename__ = "controls"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    control_name = Column(String, nullable=False)

    control_category = Column(String)

    description = Column(Text)

    control_type = Column(String)

    control_strength = Column(String)

    implemented = Column(Boolean, default=False)

    implementation_status = Column(String)

    owner = Column(String)

    evidence_document_id = Column(Integer)

    effectiveness_score = Column(Float)

class ControlEffectiveness(Base):

    __tablename__ = "control_effectiveness"

    id = Column(Integer, primary_key=True, index=True)

    control_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    design_effectiveness = Column(Float)

    operating_effectiveness = Column(Float)

    coverage = Column(Float)

    automation_level = Column(Float)

    evidence_quality = Column(Float)

    effectiveness_score = Column(Float)

class RiskFactor(Base):

    __tablename__ = "risk_factors"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    risk_category = Column(String, nullable=False)

    risk_factor = Column(String, nullable=False)

    factor_value = Column(String)

    factor_score = Column(Float)

    factor_weight = Column(Float)

    inherent_risk_contribution = Column(Float)

    source_type = Column(String)

    source_reference = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

class RiskAssessment(Base):

    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    risk_model_version = Column(String)

    customer_risk_score = Column(Float)
    product_risk_score = Column(Float)
    geography_risk_score = Column(Float)
    transaction_risk_score = Column(Float)
    channel_risk_score = Column(Float)
    third_party_risk_score = Column(Float)
    fraud_risk_score = Column(Float)

    inherent_score = Column(Float)

    inherent_rating = Column(String)

    control_adjustment = Column(Float)

    residual_score = Column(Float)

    residual_rating = Column(String)

    ai_recommendation = Column(String)

    analyst_rating = Column(String)

    final_rating = Column(String)

    assessment_status = Column(
        String,
        default="DRAFT"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow
    )

class RiskModelConfig(Base):

    __tablename__ = "risk_model_config"

    id = Column(Integer, primary_key=True, index=True)

    model_name = Column(String, nullable=False)

    version = Column(String, nullable=False)

    effective_from = Column(DateTime)

    effective_to = Column(DateTime)

    created_by = Column(String)

    approved_by = Column(String)

    active = Column(Boolean, default=False)

class RiskModelWeight(Base):

    __tablename__ = "risk_model_weights"

    id = Column(Integer, primary_key=True, index=True)

    risk_model_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    risk_category = Column(
        String,
        nullable=False
    )

    weight = Column(Float)

    minimum_score = Column(Float)

    maximum_score = Column(Float)

class RegulatorySource(Base):
    __tablename__ = "regulatory_sources"

    id = Column(Integer, primary_key=True, index=True)
    authority = Column(String, nullable=False)
    document_name = Column(String, nullable=False)
    document_type = Column(String)
    status = Column(String)
    jurisdiction = Column(String, default="INDIA")
    source_file = Column(String)
    effective_from = Column(DateTime)
    effective_to = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class RegulatoryEvidence(Base):
    __tablename__ = "regulatory_evidence"

    id = Column(Integer, primary_key=True, index=True)
    change_request_id = Column(Integer, nullable=False, index=True)
    risk_factor_id = Column(Integer, nullable=True, index=True)
    regulatory_source_id = Column(Integer, nullable=True, index=True)

    query = Column(Text)
    evidence_text = Column(Text)

    authority = Column(String)
    document_name = Column(String)
    page_number = Column(Integer)

    source_reference = Column(String)
    relevance_score = Column(Float)

    created_at = Column(DateTime, default=datetime.utcnow)

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    risk_assessment_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    model_name = Column(String)

    model_version = Column(String)

    assessment_summary = Column(Text)

    risk_analysis = Column(Text)

    regulatory_considerations = Column(Text)

    analyst_review_questions = Column(Text)

    rationale = Column(Text)

    recommendation = Column(String)

    evidence_references = Column(Text)

    status = Column(
        String,
        default="DRAFT"
    )

    generated_at = Column(
        DateTime,
        default=datetime.utcnow
    )

class AnalystOverride(Base):
    __tablename__ = "analyst_overrides"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    risk_assessment_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    system_rating = Column(String)

    analyst_rating = Column(String)

    override_reason = Column(Text)

    consequences = Column(Text)

    reviewed_by = Column(
        String,
        default="FCRM Analyst"
    )

    status = Column(
        String,
        default="SUBMITTED"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

class CommitteeDecision(Base):
    __tablename__ = "committee_decisions"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    risk_assessment_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    analyst_override_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    decision = Column(String, nullable=False)

    rationale = Column(Text)

    conditions = Column(Text)

    decided_by = Column(
        String,
        default="Risk Committee"
    )

    status = Column(
        String,
        default="FINAL"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(
        Integer,
        nullable=False,
        index=True
    )

    actor = Column(
        String,
        nullable=False
    )

    action = Column(
        String,
        nullable=False
    )

    entity_type = Column(
        String
    )

    entity_id = Column(
        Integer,
        nullable=True
    )

    old_value = Column(
        Text,
        nullable=True
    )

    new_value = Column(
        Text,
        nullable=True
    )

    reason = Column(
        Text,
        nullable=True
    )

    evidence = Column(
        Text,
        nullable=True
    )

    model_version = Column(
        String,
        nullable=True
    )

    policy_version = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )