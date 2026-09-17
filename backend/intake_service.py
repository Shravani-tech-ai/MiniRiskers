import json
from datetime import datetime
from pathlib import Path

from backend.brd_heuristic import extract_intake_heuristic
from backend.brd_text import extract_text_from_bytes

from sqlalchemy.orm import Session

from backend.assessment_inputs import (
    compute_missing_fields,
    load_assessment_inputs,
    merge_extraction_with_inputs,
)
from backend.assessment_service import parse_gemini_json
from backend.intake_schema import EXTRACTION_JSON_SCHEMA
from backend.models import (
    Channel,
    CustomerProfile,
    Geography,
    Product,
    TransactionProfile,
    Vendor,
)

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "data" / "uploads"


def save_brd_file(
    change_request_id: int,
    file_bytes: bytes,
    filename: str,
) -> Path:
    folder = UPLOAD_ROOT / str(change_request_id)
    folder.mkdir(parents=True, exist_ok=True)

    destination = folder / filename
    destination.write_bytes(file_bytes)

    return destination


def build_brd_extraction_prompt(document_text: str) -> str:
    trimmed = document_text[:120000]

    return f"""
You extract structured intake data from a real-world banking BRD
(product / change request). The document may use tables, bullets, Word
headings, or narrative text — not a fixed template.

Rules:
1. Map content to the JSON schema even when labels differ
   (e.g. "Primary country" -> geography.country,
   "Individual (retail)" -> customer.customer_type as INDIVIDUAL).
2. product.transaction_type AND transaction.transaction_type may both
   be needed; copy or adapt from product vs transaction sections.
3. Extract only what is stated or clearly implied; use null if absent.
4. Return valid JSON only (no markdown fences).

Required mappings (synonyms):
- Product name, offering name -> product.product_name
- Vendor / third party name -> vendor.vendor_name
- Onboarding, KYC approach -> customer.onboarding_method
- Countries, corridors, jurisdictions -> geography fields

Schema:
{EXTRACTION_JSON_SCHEMA}

BRD TEXT:
{trimmed}
"""


def build_intake_agent_prompt(
    inputs: dict,
    missing_fields: list[dict],
    user_message: str,
) -> str:
    missing_text = json.dumps(missing_fields, indent=2)
    inputs_text = json.dumps(inputs, indent=2)

    return f"""
You are an intake assistant for a financial crime risk assessment workbench.

Your job:
1. Ask concise questions to collect ONLY missing required fields.
2. Parse the user's answer and map values to the intake schema.
3. Never approve the assessment or assign risk ratings.

Current saved inputs:
{inputs_text}

Missing required fields:
{missing_text}

User message:
{user_message}

Respond with JSON only:
{{
  "assistant_message": string,
  "field_updates": {{
    "product": {{}},
    "customer": {{}},
    "geography": {{}},
    "transaction": {{}},
    "channel": {{}},
    "vendor": {{}}
  }}
}}

Include only fields you can confidently set from the user's message.
"""


def call_gemini_json(prompt: str) -> dict:
    from backend.gemini_service import generate_json

    response_text = generate_json(prompt)
    return parse_gemini_json(response_text)


def _heuristic_has_data(extracted: dict) -> bool:
    for section in (
        "product",
        "customer",
        "geography",
        "transaction",
        "channel",
        "vendor",
    ):
        if extracted.get(section):
            return True

    return False


def _normalize_extraction(parsed: dict) -> dict:
    return {
        "product": parsed.get("product") or {},
        "customer": parsed.get("customer") or {},
        "geography": parsed.get("geography") or {},
        "transaction": parsed.get("transaction") or {},
        "channel": parsed.get("channel") or {},
        "vendor": parsed.get("vendor") or {},
        "provenance_notes": parsed.get("provenance_notes") or {},
    }


def merge_extraction_layers(primary: dict, secondary: dict) -> dict:
    sections = (
        "product",
        "customer",
        "geography",
        "transaction",
        "channel",
        "vendor",
    )
    merged = _normalize_extraction({})

    for section in sections:
        primary_section = primary.get(section) or {}
        secondary_section = secondary.get(section) or {}
        keys = set(primary_section) | set(secondary_section)

        for key in keys:
            primary_value = primary_section.get(key)
            secondary_value = secondary_section.get(key)

            if _is_meaningful_value(primary_value):
                merged[section][key] = primary_value
            elif _is_meaningful_value(secondary_value):
                merged[section][key] = secondary_value

    merged["provenance_notes"] = (
        primary.get("provenance_notes")
        or secondary.get("provenance_notes")
        or {}
    )

    return merged


def _count_filled_required(merged: dict) -> int:
    from backend.intake_schema import INTAKE_REQUIRED_FIELDS

    filled = 0

    for item in INTAKE_REQUIRED_FIELDS:
        section = merged.get(item["section"], {})
        value = section.get(item["field"])

        if _is_meaningful_value(value):
            filled += 1

    return filled


def extract_intake_from_brd(document_text: str) -> tuple[dict, str]:
    if not document_text or not document_text.strip():
        raise ValueError(
            "No text found in the BRD file. Use PDF with selectable text, DOCX, or TXT/MD."
        )

    heuristic = _normalize_extraction(
        extract_intake_heuristic(document_text)
    )

    prompt = build_brd_extraction_prompt(document_text)
    ai_error = None

    try:
        parsed = call_gemini_json(prompt)
        ai_extracted = _normalize_extraction(parsed)
        merged = merge_extraction_layers(ai_extracted, heuristic)

        if _count_filled_required(merged) < _count_filled_required(heuristic):
            merged = merge_extraction_layers(heuristic, ai_extracted)

        method = "ai+rules"

        if not _heuristic_has_data(ai_extracted):
            method = "rules"

        return merged, method
    except Exception as error:
        ai_error = str(error)

        if _heuristic_has_data(heuristic):
            notes = heuristic.get("provenance_notes") or {}
            notes["ai_error"] = ai_error
            heuristic["provenance_notes"] = notes
            return heuristic, "rules"

        raise ValueError(
            f"AI extraction failed ({ai_error}). "
            "Rule-based parsing also found no structured fields."
        )


def get_latest_brd_upload(change_request_id: int) -> dict | None:
    folder = UPLOAD_ROOT / str(change_request_id)

    if not folder.exists():
        return None

    files = sorted(
        [path for path in folder.iterdir() if path.is_file()],
        key=lambda path: path.stat().st_mtime,
    )

    if not files:
        return None

    latest = files[-1]
    text = extract_text_from_bytes(
        latest.read_bytes(),
        latest.name,
    )

    return {
        "filename": latest.name,
        "size_bytes": latest.stat().st_size,
        "character_count": len(text),
        "has_text": bool(text.strip()),
        "uploaded_at": datetime.utcfromtimestamp(
            latest.stat().st_mtime
        ).isoformat()
        + "Z",
        "preview": text[:400],
    }


def run_intake_agent_turn(
    db: Session,
    change_request_id: int,
    user_message: str,
) -> dict:
    inputs = load_assessment_inputs(db, change_request_id)
    missing = compute_missing_fields(inputs)

    prompt = build_intake_agent_prompt(
        inputs,
        missing,
        user_message,
    )

    parsed = call_gemini_json(prompt)
    updates = parsed.get("field_updates") or {}
    merged = merge_extraction_with_inputs(inputs, updates)

    save_assessment_inputs(db, change_request_id, merged)

    refreshed = load_assessment_inputs(db, change_request_id)
    still_missing = compute_missing_fields(refreshed)

    return {
        "assistant_message": parsed.get(
            "assistant_message",
            "Thank you. Please provide any remaining details."
        ),
        "field_updates": updates,
        "inputs": refreshed,
        "missing_fields": still_missing,
        "completeness_percent": completeness_percent(still_missing),
    }


def completeness_percent(missing_fields: list[dict]) -> float:
    from backend.intake_schema import INTAKE_REQUIRED_FIELDS

    total = len(INTAKE_REQUIRED_FIELDS)
    if total == 0:
        return 100.0

    complete = total - len(missing_fields)
    return round((complete / total) * 100, 1)


def _is_meaningful_value(value) -> bool:
    if value is None:
        return False

    if isinstance(value, str):
        return bool(value.strip())

    return True


def _apply_meaningful_fields(record, data: dict) -> None:
    for key, value in data.items():
        if hasattr(record, key) and _is_meaningful_value(value):
            setattr(record, key, value)


def save_assessment_inputs(
    db: Session,
    change_request_id: int,
    inputs: dict,
) -> None:
    product_data = inputs.get("product") or {}
    if product_data:
        _upsert_product(db, change_request_id, product_data)

    customer_data = inputs.get("customer") or {}
    if customer_data:
        _upsert_customer(db, change_request_id, customer_data)

    geography_data = inputs.get("geography") or {}
    if geography_data:
        _upsert_geography(db, change_request_id, geography_data)

    transaction_data = inputs.get("transaction") or {}
    if transaction_data:
        _upsert_transaction(db, change_request_id, transaction_data)

    channel_data = inputs.get("channel") or {}
    if channel_data:
        _upsert_channel(db, change_request_id, channel_data)

    vendor_data = inputs.get("vendor") or {}
    if vendor_data:
        _upsert_vendor(db, change_request_id, vendor_data)

    db.commit()


def _upsert_product(
    db: Session,
    change_request_id: int,
    data: dict,
) -> None:
    meaningful = {
        key: value
        for key, value in data.items()
        if _is_meaningful_value(value)
    }

    if not meaningful:
        return

    record = (
        db.query(Product)
        .filter(Product.change_request_id == change_request_id)
        .first()
    )

    if not record:
        product_name = meaningful.get("product_name")

        if not _is_meaningful_value(product_name):
            return

        record = Product(
            change_request_id=change_request_id,
            product_name=str(product_name).strip(),
        )
        db.add(record)
        meaningful.pop("product_name", None)

    _apply_meaningful_fields(record, meaningful)


def _upsert_customer(
    db: Session,
    change_request_id: int,
    data: dict,
) -> None:
    record = (
        db.query(CustomerProfile)
        .filter(
            CustomerProfile.change_request_id == change_request_id
        )
        .first()
    )

    if not record:
        record = CustomerProfile(change_request_id=change_request_id)
        db.add(record)

    _apply_meaningful_fields(record, data)


def _upsert_geography(
    db: Session,
    change_request_id: int,
    data: dict,
) -> None:
    record = (
        db.query(Geography)
        .filter(Geography.change_request_id == change_request_id)
        .first()
    )

    if not record:
        record = Geography(change_request_id=change_request_id)
        db.add(record)

    _apply_meaningful_fields(record, data)


def _upsert_transaction(
    db: Session,
    change_request_id: int,
    data: dict,
) -> None:
    record = (
        db.query(TransactionProfile)
        .filter(
            TransactionProfile.change_request_id == change_request_id
        )
        .first()
    )

    if not record:
        record = TransactionProfile(
            change_request_id=change_request_id
        )
        db.add(record)

    _apply_meaningful_fields(record, data)


def _upsert_channel(
    db: Session,
    change_request_id: int,
    data: dict,
) -> None:
    record = (
        db.query(Channel)
        .filter(Channel.change_request_id == change_request_id)
        .first()
    )

    if not record:
        record = Channel(change_request_id=change_request_id)
        db.add(record)

    _apply_meaningful_fields(record, data)


def _upsert_vendor(
    db: Session,
    change_request_id: int,
    data: dict,
) -> None:
    record = (
        db.query(Vendor)
        .filter(Vendor.change_request_id == change_request_id)
        .first()
    )

    if not record:
        record = Vendor(change_request_id=change_request_id)
        db.add(record)

    _apply_meaningful_fields(record, data)
