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


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String, unique=True, index=True, nullable=False)

    email = Column(String, unique=True, index=True, nullable=False)

    password_hash = Column(String, nullable=False)

    full_name = Column(String, nullable=False)

    role = Column(String, nullable=False, index=True)

    is_active = Column(Boolean, default=True, nullable=False)

    preferences_json = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )


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

    # Incremented each time the committee defers the request back for
    # rework; reviews and decisions are recorded against a revision.
    revision = Column(Integer, default=1, nullable=False)

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

    methodology_version_id = Column(Integer, nullable=True, index=True)

    revision = Column(Integer, default=1)

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

    controls_assessed = Column(
        Boolean,
        default=False,
    )

    residual_status = Column(
        String,
        default="PENDING_CONTROLS",
    )

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

    revision = Column(Integer, default=1)

    # NONE (accepted), UPGRADE or DOWNGRADE, and by how many bands.
    override_direction = Column(String, default="NONE")

    band_delta = Column(Integer, default=0)

    # NONE, ACKNOWLEDGE (committee must acknowledge) or ESCALATED.
    escalation_level = Column(String, default="NONE")

    escalation_reasons = Column(Text)

    acknowledged_by = Column(String)

    acknowledged_at = Column(DateTime)

    acknowledgement_note = Column(Text)

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

    revision = Column(Integer, default=1)

    # For DEFER: BUSINESS_OWNER or RISK_ANALYST.
    deferred_to = Column(String)

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

    user_id = Column(
        Integer,
        nullable=True,
        index=True,
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

    # Tamper evidence: each event hashes its own content together with the
    # previous event's hash for the same change request.
    prev_hash = Column(String, nullable=True)

    event_hash = Column(String, nullable=True, index=True)

class MethodologyVersion(Base):
    """An immutable version of the tunable risk methodology.

    Lifecycle: DRAFT -> PENDING_APPROVAL -> ACTIVE -> RETIRED
    (or PENDING_APPROVAL -> REJECTED / DRAFT). The approver must be a
    different person from the proposer (maker-checker).
    """

    __tablename__ = "methodology_versions"

    id = Column(Integer, primary_key=True, index=True)

    version = Column(String, nullable=False, unique=True, index=True)

    status = Column(String, nullable=False, default="DRAFT", index=True)

    config_json = Column(Text, nullable=False)

    change_summary = Column(Text)

    based_on_version = Column(String)

    created_by = Column(String)

    created_by_user_id = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)

    submitted_at = Column(DateTime)

    approved_by = Column(String)

    approved_by_user_id = Column(Integer)

    approved_at = Column(DateTime)

    review_note = Column(Text)

    effective_from = Column(DateTime)

    effective_to = Column(DateTime)


class MethodologyEvent(Base):
    """Append-only history of methodology lifecycle actions."""

    __tablename__ = "methodology_events"

    id = Column(Integer, primary_key=True, index=True)

    methodology_version_id = Column(Integer, nullable=False, index=True)

    version = Column(String)

    action = Column(String, nullable=False)

    actor = Column(String)

    user_id = Column(Integer)

    note = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


class ApprovalCondition(Base):
    """A condition attached to an APPROVE_WITH_CONDITIONS decision.

    Lifecycle: OPEN -> EVIDENCE_SUBMITTED (Business Owner) -> VERIFIED
    (Risk Analyst), or back to OPEN when the evidence is not accepted.
    """

    __tablename__ = "approval_conditions"

    id = Column(Integer, primary_key=True, index=True)

    change_request_id = Column(Integer, nullable=False, index=True)

    committee_decision_id = Column(Integer, nullable=False, index=True)

    description = Column(Text, nullable=False)

    due_date = Column(DateTime)

    status = Column(String, nullable=False, default="OPEN")

    evidence_note = Column(Text)

    evidence_submitted_by = Column(String)

    evidence_submitted_at = Column(DateTime)

    verified_by = Column(String)

    verified_at = Column(DateTime)

    verification_note = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    """In-app notification delivered to a single user."""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False, index=True)

    change_request_id = Column(Integer, nullable=True, index=True)

    notification_type = Column(String, nullable=False, index=True)

    title = Column(String, nullable=False)

    body = Column(Text)

    link_path = Column(String)

    read_at = Column(DateTime, nullable=True)

    metadata_json = Column(Text)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        index=True,
    )
