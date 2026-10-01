from sqlalchemy.orm import Session

from backend.intake_schema import INTAKE_REQUIRED_FIELDS
from backend.models import (
    Channel,
    CustomerProfile,
    Geography,
    Product,
    TransactionProfile,
    Vendor,
)


def _product_to_dict(product: Product | None) -> dict:
    if not product:
        return {}

    return {
        "product_name": product.product_name or "",
        "product_category": product.product_category or "",
        "product_description": product.product_description or "",
        "digital_channel": bool(product.digital_channel),
        "branch_channel": bool(product.branch_channel),
        "agent_channel": bool(product.agent_channel),
        "cross_border": bool(product.cross_border),
        "cash_involved": bool(product.cash_involved),
        "transaction_type": product.transaction_type or "",
        "transaction_limit": product.transaction_limit,
        "expected_transaction_volume": product.expected_transaction_volume,
        "expected_transaction_frequency": (
            product.expected_transaction_frequency or ""
        ),
        "currency": product.currency or "INR",
        "countries_supported": product.countries_supported or "",
        "new_product_flag": bool(product.new_product_flag),
    }


def _customer_to_dict(customer: CustomerProfile | None) -> dict:
    if not customer:
        return {}

    return {
        "customer_type": customer.customer_type or "",
        "customer_segment": customer.customer_segment or "",
        "individual_customer": bool(customer.individual_customer),
        "business_customer": bool(customer.business_customer),
        "foreign_customer": bool(customer.foreign_customer),
        "onboarding_method": customer.onboarding_method or "",
        "kyc_required": bool(customer.kyc_required),
        "kyc_method": customer.kyc_method or "",
        "beneficial_owner_required": bool(
            customer.beneficial_owner_required
        ),
        "pep_exposure": bool(customer.pep_exposure),
        "high_risk_customer_exposure": bool(
            customer.high_risk_customer_exposure
        ),
        "expected_customer_count": customer.expected_customer_count,
        "customer_geographic_distribution": (
            customer.customer_geographic_distribution or ""
        ),
    }


def _geography_to_dict(geography: Geography | None) -> dict:
    if not geography:
        return {}

    return {
        "country": geography.country or "",
        "country_code": geography.country_code or "",
        "domestic_or_cross_border": (
            geography.domestic_or_cross_border or ""
        ),
        "customer_country": geography.customer_country or "",
        "transaction_country": geography.transaction_country or "",
        "beneficiary_country": geography.beneficiary_country or "",
        "high_risk_jurisdiction_flag": bool(
            geography.high_risk_jurisdiction_flag
        ),
        "sanctions_exposure": bool(geography.sanctions_exposure),
    }


def _transaction_to_dict(transaction: TransactionProfile | None) -> dict:
    if not transaction:
        return {}

    return {
        "transaction_type": transaction.transaction_type or "",
        "average_transaction_amount": (
            transaction.average_transaction_amount
        ),
        "maximum_transaction_amount": (
            transaction.maximum_transaction_amount
        ),
        "expected_daily_volume": transaction.expected_daily_volume,
        "expected_monthly_volume": transaction.expected_monthly_volume,
        "expected_frequency": transaction.expected_frequency,
        "cash_involved": bool(transaction.cash_involved),
        "cross_border": bool(transaction.cross_border),
        "number_of_countries": transaction.number_of_countries,
        "transaction_velocity": transaction.transaction_velocity,
        "round_amount_risk": bool(transaction.round_amount_risk),
        "rapid_movement_possible": bool(
            transaction.rapid_movement_possible
        ),
    }


def _channel_to_dict(channel: Channel | None) -> dict:
    if not channel:
        return {}

    return {
        "channel_type": channel.channel_type or "",
        "mobile_banking": bool(channel.mobile_banking),
        "internet_banking": bool(channel.internet_banking),
        "branch": bool(channel.branch),
        "agent": bool(channel.agent),
        "api": bool(channel.api),
        "third_party_channel": bool(channel.third_party_channel),
        "remote_onboarding": bool(channel.remote_onboarding),
    }


def _vendor_to_dict(vendor: Vendor | None) -> dict:
    if not vendor:
        return {}

    return {
        "vendor_name": vendor.vendor_name or "",
        "vendor_type": vendor.vendor_type or "",
        "country": vendor.country or "",
        "india_based": bool(vendor.india_based),
        "service_description": vendor.service_description or "",
        "handles_customer_data": bool(vendor.handles_customer_data),
        "handles_transactions": bool(vendor.handles_transactions),
        "handles_payment_data": bool(vendor.handles_payment_data),
        "criticality": vendor.criticality or "",
        "outsourcing_type": vendor.outsourcing_type or "",
        "due_diligence_completed": bool(
            vendor.due_diligence_completed
        ),
        "contract_completed": bool(vendor.contract_completed),
        "audit_rights": bool(vendor.audit_rights),
        "business_continuity_plan": bool(
            vendor.business_continuity_plan
        ),
        "cross_border_processing": bool(
            vendor.cross_border_processing
        ),
    }


def load_assessment_inputs(
    db: Session,
    change_request_id: int,
) -> dict:
    product = (
        db.query(Product)
        .filter(Product.change_request_id == change_request_id)
        .first()
    )
    customer = (
        db.query(CustomerProfile)
        .filter(
            CustomerProfile.change_request_id == change_request_id
        )
        .first()
    )
    geography = (
        db.query(Geography)
        .filter(Geography.change_request_id == change_request_id)
        .first()
    )
    transaction = (
        db.query(TransactionProfile)
        .filter(
            TransactionProfile.change_request_id == change_request_id
        )
        .first()
    )
    channel = (
        db.query(Channel)
        .filter(Channel.change_request_id == change_request_id)
        .first()
    )
    vendor = (
        db.query(Vendor)
        .filter(Vendor.change_request_id == change_request_id)
        .first()
    )

    return {
        "product": _product_to_dict(product),
        "customer": _customer_to_dict(customer),
        "geography": _geography_to_dict(geography),
        "transaction": _transaction_to_dict(transaction),
        "channel": _channel_to_dict(channel),
        "vendor": _vendor_to_dict(vendor),
    }


def _is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def compute_missing_fields(inputs: dict) -> list[dict]:
    missing = []

    for item in INTAKE_REQUIRED_FIELDS:
        section = inputs.get(item["section"], {})
        value = section.get(item["field"])

        if _is_empty(value):
            missing.append(
                {
                    "section": item["section"],
                    "field": item["field"],
                    "label": item["label"],
                    "key": f"{item['section']}.{item['field']}",
                }
            )

    return missing


def merge_extraction_with_inputs(
    current: dict,
    extracted: dict,
) -> dict:
    merged = {
        "product": {**current.get("product", {})},
        "customer": {**current.get("customer", {})},
        "geography": {**current.get("geography", {})},
        "transaction": {**current.get("transaction", {})},
        "channel": {**current.get("channel", {})},
        "vendor": {**current.get("vendor", {})},
    }

    for section in merged:
        section_data = extracted.get(section) or {}
        for key, value in section_data.items():
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            merged[section][key] = value

    return merged


def compute_field_diff(
    baseline: dict,
    current: dict,
) -> list[dict]:
    changes = []

    for section, fields in current.items():
        if not isinstance(fields, dict):
            continue

        for field, value in fields.items():
            base_value = (baseline.get(section) or {}).get(field)
            if base_value != value:
                changes.append(
                    {
                        "section": section,
                        "field": field,
                        "baseline": base_value,
                        "current": value,
                    }
                )

    return changes
