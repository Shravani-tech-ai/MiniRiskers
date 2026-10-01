import re

SECTION_HEADERS = {
    "product": (
        "product description",
        "product information",
        "product overview",
        "2. product",
    ),
    "customer": (
        "customer profile",
        "customer information",
        "3. customer",
    ),
    "geography": (
        "geography",
        "jurisdiction",
        "4. geography",
    ),
    "transaction": (
        "transaction profile",
        "transaction information",
        "5. transaction",
    ),
    "channel": (
        "channel information",
        "channel",
        "6. channel",
    ),
    "vendor": (
        "third-party",
        "third party",
        "vendor information",
        "vendor",
        "7. vendor",
    ),
}

FIELD_ALIASES = {
    "product name": ("product", "product_name"),
    "name of product": ("product", "product_name"),
    "product category": ("product", "product_category"),
    "category": ("product", "product_category"),
    "description": ("product", "product_description"),
    "product description": ("product", "product_description"),
    "transaction type": ("product", "transaction_type"),
    "currency": ("product", "currency"),
    "countries supported": ("product", "countries_supported"),
    "supported countries": ("product", "countries_supported"),
    "per-transaction limit": ("product", "transaction_limit"),
    "transaction limit": ("product", "transaction_limit"),
    "expected monthly volume": ("product", "expected_transaction_volume"),
    "customer type": ("customer", "customer_type"),
    "type of customer": ("customer", "customer_type"),
    "customer segment": ("customer", "customer_segment"),
    "segment": ("customer", "customer_segment"),
    "onboarding method": ("customer", "onboarding_method"),
    "onboarding": ("customer", "onboarding_method"),
    "kyc method": ("customer", "kyc_method"),
    "expected customer count": ("customer", "expected_customer_count"),
    "country": ("geography", "country"),
    "primary country": ("geography", "country"),
    "primary country (bank operations)": ("geography", "country"),
    "bank country": ("geography", "country"),
    "country code": ("geography", "country_code"),
    "customer country": ("geography", "customer_country"),
    "transaction country": ("geography", "transaction_country"),
    "beneficiary country": ("geography", "beneficiary_country"),
    "domestic or cross-border": ("geography", "domestic_or_cross_border"),
    "cross border type": ("geography", "domestic_or_cross_border"),
    "average transaction amount": ("transaction", "average_transaction_amount"),
    "maximum transaction amount": ("transaction", "maximum_transaction_amount"),
    "max transaction amount": ("transaction", "maximum_transaction_amount"),
    "expected daily volume": ("transaction", "expected_daily_volume"),
    "expected monthly volume (transaction)": (
        "transaction",
        "expected_monthly_volume",
    ),
    "expected frequency": ("transaction", "expected_frequency"),
    "number of countries": ("transaction", "number_of_countries"),
    "transaction velocity": ("transaction", "transaction_velocity"),
    "channel type": ("channel", "channel_type"),
    "delivery channel": ("channel", "channel_type"),
    "vendor name": ("vendor", "vendor_name"),
    "third party name": ("vendor", "vendor_name"),
    "third-party name": ("vendor", "vendor_name"),
    "vendor type": ("vendor", "vendor_type"),
    "third party type": ("vendor", "vendor_type"),
    "vendor country": ("vendor", "country"),
    "service description": ("vendor", "service_description"),
    "criticality": ("vendor", "criticality"),
    "outsourcing type": ("vendor", "outsourcing_type"),
}


def _clean_label(label: str) -> str:
    cleaned = re.sub(r"[*_`#]", "", label)
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
    cleaned = re.sub(r"\s*\([^)]*\)", "", cleaned).strip()
    return cleaned


def _parse_bool(value: str) -> bool | None:
    lower = value.strip().lower()
    if lower in {"yes", "true", "y", "enabled"}:
        return True
    if lower in {"no", "false", "n", "disabled"}:
        return False
    return None


def _parse_number(value: str):
    digits = re.sub(r"[^\d.]", "", value.replace(",", ""))
    if not digits:
        return None
    try:
        if "." in digits:
            return float(digits)
        return int(digits)
    except ValueError:
        return None


def _normalize_customer_type(value: str) -> str:
    lower = value.strip().lower()
    if "individual" in lower or "retail" in lower:
        return "INDIVIDUAL"
    if "business" in lower or "corporate" in lower:
        return "BUSINESS"
    return value.strip()


def _normalize_cross_border(value: str) -> str:
    lower = value.strip().lower()
    if "cross" in lower:
        return "CROSS_BORDER"
    if "domestic" in lower:
        return "DOMESTIC"
    return value.strip()


def _set_field(result: dict, section: str, field: str, value):
    if value is None or value == "":
        return

    if section not in result:
        result[section] = {}

    if field == "customer_type" and isinstance(value, str):
        value = _normalize_customer_type(value)

    if field == "domestic_or_cross_border" and isinstance(value, str):
        value = _normalize_cross_border(value)

    bool_fields = {
        "digital_channel",
        "branch_channel",
        "agent_channel",
        "cross_border",
        "cash_involved",
        "new_product_flag",
        "individual_customer",
        "business_customer",
        "foreign_customer",
        "kyc_required",
        "beneficial_owner_required",
        "pep_exposure",
        "high_risk_customer_exposure",
        "high_risk_jurisdiction_flag",
        "sanctions_exposure",
        "round_amount_risk",
        "rapid_movement_possible",
        "mobile_banking",
        "internet_banking",
        "branch",
        "agent",
        "api",
        "third_party_channel",
        "remote_onboarding",
        "india_based",
        "handles_customer_data",
        "handles_transactions",
        "handles_payment_data",
        "due_diligence_completed",
        "contract_completed",
        "audit_rights",
        "business_continuity_plan",
        "cross_border_processing",
    }

    if field in bool_fields:
        parsed_bool = _parse_bool(str(value))
        if parsed_bool is not None:
            result[section][field] = parsed_bool
        return

    numeric_fields = {
        "transaction_limit",
        "expected_transaction_volume",
        "expected_customer_count",
        "average_transaction_amount",
        "maximum_transaction_amount",
        "expected_daily_volume",
        "expected_monthly_volume",
        "expected_frequency",
        "number_of_countries",
        "transaction_velocity",
    }

    if field in numeric_fields:
        parsed_number = _parse_number(str(value))
        if parsed_number is not None:
            result[section][field] = parsed_number
        return

    cleaned = str(value).strip().strip("|").strip()
    result[section][field] = cleaned


def _detect_section(line: str) -> str | None:
    lower = _clean_label(line)

    for section, hints in SECTION_HEADERS.items():
        for hint in hints:
            if hint in lower and len(lower) < 80:
                return section

    return None


def _resolve_label(label: str, active_section: str | None) -> tuple[str, str] | None:
    normalized = _clean_label(label)

    if not normalized or normalized in {"attribute", "detail", "field", "value"}:
        return None

    if normalized in FIELD_ALIASES:
        return FIELD_ALIASES[normalized]

    if active_section == "transaction" and "transaction type" in normalized:
        return ("transaction", "transaction_type")

    if active_section == "product" and "transaction type" in normalized:
        return ("product", "transaction_type")

    best_match = None
    best_length = 0

    for alias, mapping in FIELD_ALIASES.items():
        if normalized == alias or alias in normalized or normalized in alias:
            if len(alias) > best_length:
                best_length = len(alias)
                best_match = mapping

    if best_match:
        return best_match

    if "product name" in normalized or normalized.endswith(" product"):
        return ("product", "product_name")

    if "vendor name" in normalized:
        return ("vendor", "vendor_name")

    if "primary country" in normalized or normalized == "country of operations":
        return ("geography", "country")

    return None


def _parse_key_value_line(line: str) -> tuple[str, str] | None:
    patterns = [
        r"^[\-\*•]\s*(.+?)\s*[:\|]\s*(.+)$",
        r"^(.+?)\s*[:\|]\s*(.+)$",
        r"^(.+?)\s+[-–—]\s+(.+)$",
        r"^\*\*(.+?)\*\*\s*[:\|]?\s*(.+)$",
    ]

    stripped = line.strip()

    if not stripped or stripped.startswith("#"):
        return None

    for pattern in patterns:
        match = re.match(pattern, stripped, re.IGNORECASE)

        if match:
            label = match.group(1).strip()
            value = match.group(2).strip()

            if label and value and len(label) < 120:
                return label, value

    return None


def extract_intake_heuristic(document_text: str) -> dict:
    result = {
        "product": {},
        "customer": {},
        "geography": {},
        "transaction": {},
        "channel": {},
        "vendor": {},
        "provenance_notes": {
            "summary": "Heuristic extraction from BRD structure and labels.",
            "low_confidence_fields": [],
        },
    }

    active_section: str | None = None

    for line in document_text.splitlines():
        section_hint = _detect_section(line)

        if section_hint:
            active_section = section_hint

        if "|" in line:
            cells = [
                cell.strip()
                for cell in line.split("|")
                if cell.strip() and not set(cell.strip()) <= {"-"}
            ]

            if len(cells) >= 2:
                label = cells[0].strip("|").strip()
                value = cells[1].strip("|").strip()
                mapping = _resolve_label(label, active_section)

                if mapping:
                    section, field = mapping
                    _set_field(result, section, field, value)

        key_value = _parse_key_value_line(line)

        if key_value:
            label, value = key_value
            mapping = _resolve_label(label, active_section)

            if mapping:
                section, field = mapping
                _set_field(result, section, field, value)

    lower_text = document_text.lower()

    if "cross-border" in lower_text or "cross border" in lower_text:
        _set_field(result, "product", "cross_border", "yes")
        _set_field(result, "transaction", "cross_border", "yes")
        _set_field(
            result,
            "geography",
            "domestic_or_cross_border",
            "CROSS_BORDER",
        )

    if "mobile banking" in lower_text:
        _set_field(result, "channel", "mobile_banking", "yes")
        _set_field(result, "product", "digital_channel", "yes")

    if "internet banking" in lower_text:
        _set_field(result, "channel", "internet_banking", "yes")

    if "new product" in lower_text:
        _set_field(result, "product", "new_product_flag", "yes")

    if not result["product"].get("transaction_type") and "remittance" in lower_text:
        _set_field(
            result,
            "product",
            "transaction_type",
            "Cross-border remittance",
        )

    if not result["transaction"].get("transaction_type"):
        if result["product"].get("transaction_type"):
            _set_field(
                result,
                "transaction",
                "transaction_type",
                result["product"]["transaction_type"],
            )
        elif "remittance" in lower_text:
            _set_field(
                result,
                "transaction",
                "transaction_type",
                "Outbound cross-border remittance",
            )

    if not result["channel"].get("channel_type"):
        _set_field(result, "channel", "channel_type", "DIGITAL")

    if not result["geography"].get("country") and "india" in lower_text:
        _set_field(result, "geography", "country", "India")
        _set_field(result, "geography", "customer_country", "India")

    return result
