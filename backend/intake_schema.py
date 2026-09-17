"""Required assessment intake fields for completeness checks."""

INTAKE_REQUIRED_FIELDS = [
    {"section": "product", "field": "product_name", "label": "Product name"},
    {"section": "product", "field": "transaction_type", "label": "Transaction type"},
    {"section": "customer", "field": "customer_type", "label": "Customer type"},
    {"section": "customer", "field": "onboarding_method", "label": "Onboarding method"},
    {"section": "geography", "field": "country", "label": "Primary country"},
    {"section": "geography", "field": "transaction_country", "label": "Transaction country"},
    {"section": "geography", "field": "beneficiary_country", "label": "Beneficiary country"},
    {"section": "transaction", "field": "transaction_type", "label": "Transaction profile type"},
    {"section": "channel", "field": "channel_type", "label": "Channel type"},
    {"section": "vendor", "field": "vendor_name", "label": "Vendor name"},
    {"section": "vendor", "field": "vendor_type", "label": "Vendor type"},
]

EXTRACTION_JSON_SCHEMA = """
Return a single JSON object with these keys only (use null for unknown values):
{
  "product": {
    "product_name": string,
    "product_category": string,
    "product_description": string,
    "digital_channel": boolean,
    "branch_channel": boolean,
    "agent_channel": boolean,
    "cross_border": boolean,
    "cash_involved": boolean,
    "transaction_type": string,
    "transaction_limit": number or null,
    "expected_transaction_volume": number or null,
    "expected_transaction_frequency": string or number or null,
    "currency": string,
    "countries_supported": string,
    "new_product_flag": boolean
  },
  "customer": {
    "customer_type": string,
    "customer_segment": string,
    "individual_customer": boolean,
    "business_customer": boolean,
    "foreign_customer": boolean,
    "onboarding_method": string,
    "kyc_required": boolean,
    "kyc_method": string,
    "beneficial_owner_required": boolean,
    "pep_exposure": boolean,
    "high_risk_customer_exposure": boolean,
    "expected_customer_count": number or null,
    "customer_geographic_distribution": string
  },
  "geography": {
    "country": string,
    "country_code": string,
    "domestic_or_cross_border": string,
    "customer_country": string,
    "transaction_country": string,
    "beneficiary_country": string,
    "high_risk_jurisdiction_flag": boolean,
    "sanctions_exposure": boolean
  },
  "transaction": {
    "transaction_type": string,
    "average_transaction_amount": number or null,
    "maximum_transaction_amount": number or null,
    "expected_daily_volume": number or null,
    "expected_monthly_volume": number or null,
    "expected_frequency": number or null,
    "cash_involved": boolean,
    "cross_border": boolean,
    "number_of_countries": number or null,
    "transaction_velocity": number or null,
    "round_amount_risk": boolean,
    "rapid_movement_possible": boolean
  },
  "channel": {
    "channel_type": string,
    "mobile_banking": boolean,
    "internet_banking": boolean,
    "branch": boolean,
    "agent": boolean,
    "api": boolean,
    "third_party_channel": boolean,
    "remote_onboarding": boolean
  },
  "vendor": {
    "vendor_name": string,
    "vendor_type": string,
    "country": string,
    "india_based": boolean,
    "service_description": string,
    "handles_customer_data": boolean,
    "handles_transactions": boolean,
    "handles_payment_data": boolean,
    "criticality": string,
    "outsourcing_type": string,
    "due_diligence_completed": boolean,
    "contract_completed": boolean,
    "audit_rights": boolean,
    "business_continuity_plan": boolean,
    "cross_border_processing": boolean
  },
  "provenance_notes": {
    "summary": string,
    "low_confidence_fields": [string]
  }
}
"""
