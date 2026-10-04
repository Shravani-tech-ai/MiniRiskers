import re

SECTIONS = (
    "product",
    "customer",
    "geography",
    "transaction",
    "channel",
    "vendor",
)

# Header text (after numbering / markdown is stripped) that opens a section.
SECTION_HEADERS = {
    "product": (
        "product description",
        "product information",
        "product overview",
        "product details",
        "product",
    ),
    "customer": (
        "customer profile",
        "customer information",
        "customer details",
        "customer",
    ),
    "geography": (
        "geography",
        "geographic",
        "jurisdiction",
    ),
    "transaction": (
        "transaction profile",
        "transaction information",
        "transaction details",
        "transaction",
    ),
    "channel": (
        "channel information",
        "channel details",
        "delivery channel",
        "channel",
    ),
    "vendor": (
        "vendor / third-party information",
        "vendor information",
        "third-party information",
        "third party information",
        "vendor",
        "third-party",
        "third party",
        "outsourcing",
    ),
}

# Labels are matched per section first, so "Transaction Type" or "Country"
# land in whichever section the BRD lists them under.
SECTION_FIELDS = {
    "product": {
        "product name": "product_name",
        "name of product": "product_name",
        "product category": "product_category",
        "category": "product_category",
        "description": "product_description",
        "product description": "product_description",
        "transaction type": "transaction_type",
        "currency": "currency",
        "currencies": "currency",
        "countries supported": "countries_supported",
        "supported countries": "countries_supported",
        "per-transaction limit": "transaction_limit",
        "per transaction limit": "transaction_limit",
        "transaction limit": "transaction_limit",
        "expected monthly volume": "expected_transaction_volume",
        "expected transaction volume": "expected_transaction_volume",
        "expected transaction frequency": "expected_transaction_frequency",
        "new product flag": "new_product_flag",
        "new product": "new_product_flag",
        "digital channel": "digital_channel",
        "branch channel": "branch_channel",
        "agent channel": "agent_channel",
        "cross border": "cross_border",
        "cross-border": "cross_border",
        "cash involved": "cash_involved",
    },
    "customer": {
        "customer type": "customer_type",
        "type of customer": "customer_type",
        "customer segment": "customer_segment",
        "segment": "customer_segment",
        "onboarding method": "onboarding_method",
        "onboarding": "onboarding_method",
        "kyc method": "kyc_method",
        "kyc required": "kyc_required",
        "expected customer count": "expected_customer_count",
        "customer count": "expected_customer_count",
        "pep exposure": "pep_exposure",
        "high risk customer exposure": "high_risk_customer_exposure",
        "individual customer": "individual_customer",
        "business customer": "business_customer",
        "foreign customer": "foreign_customer",
        "beneficial owner required": "beneficial_owner_required",
        "customer geographic distribution": "customer_geographic_distribution",
    },
    "geography": {
        "primary country": "country",
        "primary country (bank operations)": "country",
        "bank country": "country",
        "country of operations": "country",
        "country": "country",
        "country code": "country_code",
        "customer country": "customer_country",
        "transaction country": "transaction_country",
        "beneficiary country": "beneficiary_country",
        "domestic or cross-border": "domestic_or_cross_border",
        "domestic or cross border": "domestic_or_cross_border",
        "cross border type": "domestic_or_cross_border",
        "high risk jurisdiction flag": "high_risk_jurisdiction_flag",
        "high risk jurisdiction": "high_risk_jurisdiction_flag",
        "sanctions exposure": "sanctions_exposure",
    },
    "transaction": {
        "transaction type": "transaction_type",
        "average transaction amount": "average_transaction_amount",
        "maximum transaction amount": "maximum_transaction_amount",
        "max transaction amount": "maximum_transaction_amount",
        "expected daily volume": "expected_daily_volume",
        "expected monthly volume (transaction)": "expected_monthly_volume",
        "expected monthly volume": "expected_monthly_volume",
        "expected frequency": "expected_frequency",
        "number of countries": "number_of_countries",
        "transaction velocity": "transaction_velocity",
        "round amount risk": "round_amount_risk",
        "rapid movement possible": "rapid_movement_possible",
        "cash involved": "cash_involved",
        "cross border": "cross_border",
        "cross-border": "cross_border",
    },
    "channel": {
        "channel type": "channel_type",
        "delivery channel": "_delivery_channel",
        "mobile banking": "mobile_banking",
        "internet banking": "internet_banking",
        "branch": "branch",
        "agent": "agent",
        "api": "api",
        "third party channel": "third_party_channel",
        "third-party channel": "third_party_channel",
        "remote onboarding": "remote_onboarding",
    },
    "vendor": {
        "vendor name": "vendor_name",
        "third party name": "vendor_name",
        "third-party name": "vendor_name",
        "vendor type": "vendor_type",
        "third party type": "vendor_type",
        "third-party type": "vendor_type",
        "vendor country": "country",
        "country": "country",
        "india based": "india_based",
        "service description": "service_description",
        "description": "service_description",
        "criticality": "criticality",
        "outsourcing type": "outsourcing_type",
        "due diligence completed": "due_diligence_completed",
        "contract completed": "contract_completed",
        "audit rights": "audit_rights",
        "business continuity plan": "business_continuity_plan",
        "cross border processing": "cross_border_processing",
        "cross-border processing": "cross_border_processing",
        "handles customer data": "handles_customer_data",
        "handles transactions": "handles_transactions",
        "handles payment data": "handles_payment_data",
    },
}

# Fallback for labels outside any recognised section: the first section that
# defines a label owns it, except where overridden below.
GLOBAL_FIELDS: dict[str, tuple[str, str]] = {}
for _section in SECTIONS:
    for _label, _field in SECTION_FIELDS[_section].items():
        GLOBAL_FIELDS.setdefault(_label, (_section, _field))
GLOBAL_FIELDS["expected monthly volume (transaction)"] = (
    "transaction",
    "expected_monthly_volume",
)
GLOBAL_FIELDS["expected frequency"] = ("transaction", "expected_frequency")
GLOBAL_FIELDS["vendor country"] = ("vendor", "country")

BOOL_FIELDS = {
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

NUMERIC_FIELDS = {
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

BLANK_VALUES = {"", "[blank]", "blank", "-", "--", "tbd", "null"}
NOT_APPLICABLE = {"n/a", "na", "not applicable", "not available", "unknown"}


def _clean_label(label: str) -> str:
    cleaned = re.sub(r"[*_`#]", "", label)
    cleaned = re.sub(r"^[\-•]\s*", "", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip().lower()


def _is_blank(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        lower = value.strip().lower()
        return lower in BLANK_VALUES or lower.startswith("[blank")
    return False


def _is_not_applicable(value: str) -> bool:
    lower = value.strip().lower()
    return lower in NOT_APPLICABLE or lower.startswith("not applicable")


def _parse_bool(value) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None

    match = re.match(r"\s*([a-z]+)", str(value).lower())
    if not match:
        return None

    word = match.group(1)
    if word in {"yes", "true", "y", "enabled", "required", "applicable"}:
        return True
    if word in {"no", "false", "n", "disabled", "none"}:
        return False
    return None


def _parse_number(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    if value is None:
        return None

    text = str(value).lower()
    match = re.search(r"\d[\d,]*(?:\.\d+)?", text)
    if not match:
        return None

    raw = match.group(0).replace(",", "")
    number = float(raw) if "." in raw else int(raw)

    tail = text[match.end():match.end() + 8]
    if re.match(r"\s*(lakh|lac)", tail):
        number *= 100_000
    elif re.match(r"\s*crore", tail):
        number *= 10_000_000
    elif re.match(r"\s*(million|mn)\b", tail):
        number *= 1_000_000

    if isinstance(number, float) and number.is_integer():
        number = int(number)
    return number


def _first_keyword(value: str, keywords: dict[str, str]) -> str | None:
    """Return the mapped value of the keyword that appears earliest."""
    lower = value.lower()
    best = None
    best_pos = len(lower) + 1

    for keyword, mapped in keywords.items():
        match = re.search(rf"\b{re.escape(keyword)}", lower)
        if match and match.start() < best_pos:
            best_pos = match.start()
            best = mapped

    return best


def normalize_customer_type(value) -> str | None:
    if _is_blank(value):
        return None
    return _first_keyword(
        str(value),
        {
            "individual": "INDIVIDUAL",
            "retail": "INDIVIDUAL",
            "personal": "INDIVIDUAL",
            "consumer": "INDIVIDUAL",
            "nri": "INDIVIDUAL",
            "business": "BUSINESS",
            "corporate": "BUSINESS",
            "sme": "BUSINESS",
            "msme": "BUSINESS",
            "entity": "BUSINESS",
            "ngo": "BUSINESS",
            "trust": "BUSINESS",
            "institution": "BUSINESS",
            "merchant": "BUSINESS",
            "bank": "BUSINESS",
        },
    )


def normalize_cross_border(value) -> str | None:
    if _is_blank(value):
        return None
    return _first_keyword(
        str(value),
        {
            "cross": "CROSS_BORDER",
            "international": "CROSS_BORDER",
            "domestic": "DOMESTIC",
        },
    )


def normalize_channel_type(value) -> str | None:
    if _is_blank(value):
        return None
    return _first_keyword(
        str(value),
        {
            "digital": "DIGITAL",
            "mobile": "DIGITAL",
            "internet": "DIGITAL",
            "online": "DIGITAL",
            "app": "DIGITAL",
            "upi": "DIGITAL",
            "branch": "BRANCH",
            "agent": "AGENT",
            "api": "API",
            "swift": "API",
            "third party": "THIRD_PARTY",
            "third-party": "THIRD_PARTY",
            "partner": "THIRD_PARTY",
        },
    )


def normalize_criticality(value) -> str | None:
    if _is_blank(value):
        return None
    return _first_keyword(
        str(value),
        {
            "critical": "CRITICAL",
            "high": "HIGH",
            "medium": "MEDIUM",
            "moderate": "MEDIUM",
            "low": "LOW",
        },
    )


ENUM_NORMALIZERS = {
    ("customer", "customer_type"): normalize_customer_type,
    ("geography", "domestic_or_cross_border"): normalize_cross_border,
    ("channel", "channel_type"): normalize_channel_type,
    ("vendor", "criticality"): normalize_criticality,
}


def _coerce_value(section: str, field: str, value):
    """Convert a raw extracted value to the type the intake forms expect."""
    if _is_blank(value):
        return None

    normalizer = ENUM_NORMALIZERS.get((section, field))
    if normalizer:
        return normalizer(value)

    if field in BOOL_FIELDS:
        return _parse_bool(value)

    if field in NUMERIC_FIELDS:
        return _parse_number(value)

    if isinstance(value, str):
        cleaned = re.sub(r"\s+", " ", value).strip().strip("|").strip()
        return cleaned or None

    return value


def normalize_extraction_values(extracted: dict) -> dict:
    """Coerce every section value (from rules or AI) into form-ready types."""
    for section in SECTIONS:
        data = extracted.get(section)
        if not isinstance(data, dict):
            extracted[section] = {}
            continue

        for field in list(data):
            coerced = _coerce_value(section, field, data[field])
            if coerced is None:
                data.pop(field)
            else:
                data[field] = coerced

    return extracted


def _detect_section(line: str) -> str | None:
    """Return a section for header lines, "other" for unrelated headers."""
    stripped = line.strip()
    if not stripped:
        return None

    numbered = re.match(r"^(#+\s*|\d+(\.\d+)*[.)]\s+)", stripped)
    text = _clean_label(re.sub(r"^(#+\s*|\d+(\.\d+)*[.)]\s+)", "", stripped))
    text = text.rstrip(":").strip()

    # Key/value lines are fields, not headers.
    if ":" in text or "|" in text:
        return None

    for section, hints in SECTION_HEADERS.items():
        for hint in hints:
            if text == hint:
                return section
            # Numbered / markdown headings may add words ("2. Product Description").
            if (
                numbered
                and text.startswith(hint)
                and len(text) <= len(hint) + 25
                and not re.search(r"[,.;]", text)
            ):
                return section

    return "other" if numbered and len(text) < 60 else None


def _resolve_label(label: str, active_section: str | None) -> tuple[str, str] | None:
    normalized = _clean_label(label)
    candidates = [normalized]
    without_parens = re.sub(r"\s*\([^)]*\)", "", normalized).strip()
    if without_parens != normalized:
        candidates.append(without_parens)

    for candidate in candidates:
        if active_section in SECTION_FIELDS:
            field = SECTION_FIELDS[active_section].get(candidate)
            if field:
                return active_section, field

        if candidate in GLOBAL_FIELDS:
            return GLOBAL_FIELDS[candidate]

    return None


def _parse_key_value_line(line: str) -> tuple[str, str] | None:
    stripped = line.strip()

    if not stripped or stripped.startswith("#"):
        return None

    patterns = [
        r"^\*\*(.+?)\*\*\s*[:\|]?\s*(.*)$",
        r"^[\-\*•]?\s*([^:|]+?)\s*[:\|]\s*(.*)$",
        r"^(.+?)\s+[–—]\s+(.+)$",
    ]

    for pattern in patterns:
        match = re.match(pattern, stripped)

        if match:
            label = match.group(1).strip()
            value = match.group(2).strip()

            if label and len(label) < 80:
                return label, value

    return None


def _collect_fields(document_text: str) -> list[list]:
    """Return [section, field, value] entries, joining wrapped lines."""
    entries: list[list] = []
    active_section: str | None = None
    current: list | None = None

    for line in document_text.splitlines():
        stripped = line.strip()

        if not stripped:
            current = None
            continue

        section_hint = _detect_section(stripped)
        if section_hint:
            active_section = None if section_hint == "other" else section_hint
            current = None
            continue

        if "|" in stripped:
            cells = [
                cell.strip()
                for cell in stripped.split("|")
                if cell.strip() and not set(cell.strip()) <= {"-", ":"}
            ]
            if len(cells) >= 2:
                mapping = _resolve_label(cells[0], active_section)
                if mapping:
                    current = [mapping[0], mapping[1], cells[1]]
                    entries.append(current)
                    continue

        key_value = _parse_key_value_line(stripped)
        if key_value:
            mapping = _resolve_label(key_value[0], active_section)
            if mapping:
                current = [mapping[0], mapping[1], key_value[1]]
                entries.append(current)
                continue

        # Anything else continues the previous field's wrapped value.
        if current is not None:
            joiner = "" if current[2].endswith("-") else " "
            current[2] = f"{current[2]}{joiner}{stripped}".strip()

    return entries


def _set_if_missing(result: dict, section: str, field: str, value) -> None:
    if value is None:
        return
    if result[section].get(field) is None:
        result[section][field] = value


def _mentions_cash(*values) -> bool:
    text = " ".join(str(value) for value in values if value).lower()
    return bool(re.search(r"\bcash\b(?![- ]flow)", text))


def derive_implied_fields(result: dict, document_text: str = "") -> dict:
    """Fill fields the BRD implies but does not state, never overriding."""
    product = result["product"]
    customer = result["customer"]
    geography = result["geography"]
    transaction = result["transaction"]
    channel = result["channel"]
    vendor = result["vendor"]
    lower_text = document_text.lower()

    delivery = channel.pop("_delivery_channel", None)

    # Channel
    if delivery:
        if channel.get("channel_type") is None:
            channel_type = normalize_channel_type(delivery)
            if channel_type:
                channel["channel_type"] = channel_type
        delivery_lower = delivery.lower()
        for keyword, field in (
            ("mobile", "mobile_banking"),
            ("internet banking", "internet_banking"),
            ("branch", "branch"),
            ("agent", "agent"),
        ):
            if keyword in delivery_lower:
                _set_if_missing(result, "channel", field, True)

    if channel.get("channel_type") is None:
        if channel.get("mobile_banking") or channel.get("internet_banking"):
            channel["channel_type"] = "DIGITAL"
        elif channel.get("branch"):
            channel["channel_type"] = "BRANCH"
        elif channel.get("agent"):
            channel["channel_type"] = "AGENT"
        elif channel.get("api"):
            channel["channel_type"] = "API"
        elif "mobile banking" in lower_text or "internet banking" in lower_text:
            channel["channel_type"] = "DIGITAL"

    if channel.get("mobile_banking") is None and "mobile banking" in lower_text:
        channel["mobile_banking"] = True
    if channel.get("internet_banking") is None and "internet banking" in lower_text:
        channel["internet_banking"] = True

    if channel:
        digital = bool(
            channel.get("mobile_banking")
            or channel.get("internet_banking")
            or channel.get("api")
            or channel.get("channel_type") == "DIGITAL"
        )
        _set_if_missing(result, "product", "digital_channel", digital)
        if channel.get("branch") is not None:
            _set_if_missing(result, "product", "branch_channel", channel["branch"])
        if channel.get("agent") is not None:
            _set_if_missing(result, "product", "agent_channel", channel["agent"])
        if channel.get("remote_onboarding") is None and str(
            customer.get("onboarding_method", "")
        ).lower().startswith(("digital", "mobile", "online", "remote", "video")):
            channel["remote_onboarding"] = True

    # Geography / cross-border
    if geography.get("domestic_or_cross_border") is None:
        if re.search(r"(?<!no )cross[- ]border", lower_text):
            geography["domestic_or_cross_border"] = "CROSS_BORDER"
        elif geography.get("country"):
            geography["domestic_or_cross_border"] = "DOMESTIC"

    exposure = geography.get("domestic_or_cross_border")
    if exposure:
        is_cross_border = exposure == "CROSS_BORDER"
        _set_if_missing(result, "product", "cross_border", is_cross_border)
        _set_if_missing(result, "transaction", "cross_border", is_cross_border)

    if not geography.get("country") and "india" in lower_text:
        geography["country"] = "India"
    if geography.get("country"):
        _set_if_missing(result, "geography", "customer_country", geography["country"])

    # Transaction type is required in both product and transaction sections.
    if not product.get("transaction_type"):
        if transaction.get("transaction_type"):
            product["transaction_type"] = transaction["transaction_type"]
        elif "remittance" in lower_text:
            product["transaction_type"] = "Cross-border remittance"
    if not transaction.get("transaction_type") and product.get("transaction_type"):
        transaction["transaction_type"] = product["transaction_type"]

    if product.get("transaction_limit") is None:
        _set_if_missing(
            result,
            "product",
            "transaction_limit",
            transaction.get("maximum_transaction_amount"),
        )
    if transaction.get("maximum_transaction_amount") is None:
        _set_if_missing(
            result,
            "transaction",
            "maximum_transaction_amount",
            product.get("transaction_limit"),
        )
    _set_if_missing(
        result,
        "transaction",
        "expected_monthly_volume",
        product.get("expected_transaction_volume"),
    )
    _set_if_missing(
        result,
        "product",
        "expected_transaction_volume",
        transaction.get("expected_monthly_volume"),
    )

    # Cash
    has_cash = _mentions_cash(
        product.get("transaction_type"),
        product.get("product_description"),
        transaction.get("transaction_type"),
        delivery,
    )
    _set_if_missing(result, "product", "cash_involved", has_cash)
    _set_if_missing(
        result,
        "transaction",
        "cash_involved",
        product.get("cash_involved"),
    )

    if product.get("new_product_flag") is None and "new product" in lower_text:
        product["new_product_flag"] = True

    # Customer
    customer_type = customer.get("customer_type")
    if customer_type:
        _set_if_missing(
            result, "customer", "individual_customer", customer_type == "INDIVIDUAL"
        )
        _set_if_missing(
            result, "customer", "business_customer", customer_type == "BUSINESS"
        )
        _set_if_missing(
            result,
            "customer",
            "beneficial_owner_required",
            customer_type == "BUSINESS",
        )

    kyc_method = customer.get("kyc_method")
    if kyc_method:
        _set_if_missing(
            result,
            "customer",
            "kyc_required",
            not _is_not_applicable(str(kyc_method)),
        )

    customer_country = str(geography.get("customer_country") or "")
    segment_text = f"{customer.get('customer_segment', '')} {customer_country}".lower()
    if customer_country or customer.get("customer_segment"):
        foreign = bool(
            re.search(r"\b(nri|non-resident|foreign|overseas)\b", segment_text)
            or (customer_country and "india" not in customer_country.lower())
        )
        _set_if_missing(result, "customer", "foreign_customer", foreign)

    if customer.get("customer_geographic_distribution") is None:
        distribution = customer_country or product.get("countries_supported")
        if distribution:
            customer["customer_geographic_distribution"] = distribution

    # Vendor
    vendor_country = vendor.get("country")
    if (
        vendor.get("india_based") is None
        and vendor_country
        and not _is_not_applicable(str(vendor_country))
    ):
        vendor["india_based"] = "india" in str(vendor_country).lower()

    return result


def extract_intake_heuristic(document_text: str) -> dict:
    result = {section: {} for section in SECTIONS}

    for section, field, value in _collect_fields(document_text):
        if field == "_delivery_channel":
            if value.strip():
                result[section][field] = value.strip()
            continue

        coerced = _coerce_value(section, field, value)
        if coerced is not None:
            result[section][field] = coerced

    derive_implied_fields(result, document_text)

    result["provenance_notes"] = {
        "summary": "Heuristic extraction from BRD structure and labels.",
        "low_confidence_fields": [],
    }

    return result


# ---------------------------------------------------------------------------
# Change-request header (the "New change request" form) from a BRD.
# ---------------------------------------------------------------------------

HEADER_LABELS = {
    "title": "title",
    "request title": "title",
    "change title": "title",
    "change type": "change_type",
    "type of change": "change_type",
    "business unit": "business_unit",
    "summary": "description",
    "change summary": "description",
    "executive summary": "description",
    "product category": "product_type",
    "customer segment": "customer_segment",
}

# Ordered: the first matching keyword wins.
CHANGE_TYPE_KEYWORDS = (
    ("customer segment", "CUSTOMER_SEGMENT_CHANGE"),
    ("vendor", "VENDOR_CHANGE"),
    ("third party", "VENDOR_CHANGE"),
    ("third-party", "VENDOR_CHANGE"),
    ("outsourc", "VENDOR_CHANGE"),
    ("geograph", "GEOGRAPHY_CHANGE"),
    ("jurisdiction", "GEOGRAPHY_CHANGE"),
    ("corridor", "GEOGRAPHY_CHANGE"),
    ("process", "PROCESS_CHANGE"),
    ("new product", "NEW_PRODUCT"),
    ("existing product", "PRODUCT_CHANGE"),
    ("product change", "PRODUCT_CHANGE"),
    ("enhancement", "PRODUCT_CHANGE"),
    ("product", "PRODUCT_CHANGE"),
)

BUSINESS_UNIT_KEYWORDS = (
    ("wealth", "Wealth Management"),
    ("private bank", "Wealth Management"),
    ("payment", "Payments"),
    ("remittance", "Payments"),
    ("cbdc", "Payments"),
    ("commercial", "Commercial Banking"),
    ("wholesale", "Commercial Banking"),
    ("corporate", "Commercial Banking"),
    ("trade", "Commercial Banking"),
    ("msme", "Commercial Banking"),
    ("sme", "Commercial Banking"),
    ("correspondent", "Commercial Banking"),
    ("institutional", "Commercial Banking"),
    ("merchant", "Commercial Banking"),
    ("retail", "Retail Banking"),
    ("lending", "Retail Banking"),
    ("deposit", "Retail Banking"),
    ("nri", "Retail Banking"),
)

BUSINESS_SEGMENT_WORDS = (
    "business", "msme", "sme", "enterprise", "corporate", "company",
    "companies", "merchant", "ngo", "bank", "jeweller", "dealer",
    "institution", "trust",
)
RETAIL_SEGMENT_WORDS = (
    "retail", "individual", "salaried", "self-employed", "resident",
    "nri", "parent", "student", "consumer", "personal",
)
HNW_SEGMENT_WORDS = ("high net worth", "hni", "hnw", "affluent", "wealth")


def _header_placeholder(value: str) -> bool:
    text = value.strip().lower()
    return not text or text.startswith("[blank") or _is_not_applicable(text)


def _map_keywords(value: str, keywords) -> str | None:
    text = value.lower()
    for keyword, mapped in keywords:
        if keyword in text:
            return mapped
    return None


def _map_customer_segment(value: str) -> str | None:
    text = value.lower()
    if any(word in text for word in HNW_SEGMENT_WORDS):
        return "High Net Worth Customers"
    business = any(word in text for word in BUSINESS_SEGMENT_WORDS)
    retail = any(word in text for word in RETAIL_SEGMENT_WORDS)
    if business and retail:
        return "Retail and Business Customers"
    if business:
        return "Business Customers"
    if retail:
        return "Retail Customers"
    return None


def _to_product_type(value: str) -> str:
    primary = re.split(r"[/(]", value)[0]
    return re.sub(r"[^A-Z0-9]+", "_", primary.upper()).strip("_")


def extract_request_header(document_text: str) -> dict:
    """Pre-fill values for the New change request form.

    Returns {"fields": {...}, "source_values": {...}}: `fields` holds values
    already mapped to the form's options; `source_values` keeps the BRD's own
    wording so the UI can show it when a value could not be mapped.
    """
    raw: dict[str, str] = {}
    current: str | None = None

    for line in document_text.splitlines():
        stripped = line.strip()
        # Numbered section heading ("2. Product Description"); a wrapped line
        # that merely starts with a year ("2024. The pilot ...") is longer.
        is_heading = bool(re.match(r"^\d+\.\s+\S", stripped)) and (
            len(stripped.split()) <= 6
        )
        if not stripped or is_heading:
            current = None
            continue

        # Inside a wrapped value, prose such as "...two new corridors: Iran"
        # or "Currency (CBDC) — the Digital Rupee" must not start a new field;
        # only a short "Label: value" line does.
        looks_like_label = current is None or re.match(
            r"^[\-\*•]?\s*\**[A-Z][A-Za-z0-9 /()&\-]{0,40}\**\s*:\s", stripped
        )
        key_value = _parse_key_value_line(stripped) if looks_like_label else None
        if key_value:
            field = HEADER_LABELS.get(_clean_label(key_value[0]))
            current = None
            if field and field not in raw:
                raw[field] = key_value[1].strip()
                current = field
            continue

        # Wrapped continuation of a multi-line value (e.g. Summary).
        if current is not None:
            joiner = "" if raw[current].endswith("-") else " "
            raw[current] = f"{raw[current]}{joiner}{stripped}".strip()

    source_values = {
        field: value for field, value in raw.items()
        if not _header_placeholder(value)
    }

    fields: dict[str, str] = {}
    if "title" in source_values:
        fields["title"] = source_values["title"][:200]
    if "description" in source_values:
        fields["description"] = source_values["description"]
    if "change_type" in source_values:
        mapped = _map_keywords(source_values["change_type"], CHANGE_TYPE_KEYWORDS)
        if mapped:
            fields["change_type"] = mapped
    if "business_unit" in source_values:
        mapped = _map_keywords(source_values["business_unit"], BUSINESS_UNIT_KEYWORDS)
        if mapped:
            fields["business_unit"] = mapped
    if "customer_segment" in source_values:
        mapped = _map_customer_segment(source_values["customer_segment"])
        if mapped:
            fields["customer_segment"] = mapped
    if "product_type" in source_values:
        product_type = _to_product_type(source_values["product_type"])
        if product_type:
            fields["product_type"] = product_type

    return {"fields": fields, "source_values": source_values}
