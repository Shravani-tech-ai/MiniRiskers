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

    transaction_velocity = Column(String)

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