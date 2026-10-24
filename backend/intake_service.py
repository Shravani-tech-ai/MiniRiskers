import hashlib
import json
import mimetypes
import os
import re
import uuid
from datetime import datetime
from pathlib import Path

from backend.brd_heuristic import (
    derive_implied_fields,
    extract_intake_heuristic,
    normalize_extraction_values,
)
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
    IntakeDocument,
    Product,
    TransactionProfile,
    Vendor,
)

UPLOAD_ROOT = Path(
    os.environ.get("MINIRISKERS_BRD_UPLOAD_DIR")
    or Path(__file__).resolve().parent.parent / "data" / "uploads"
)
BRD_PROMPT_PATH = (
    Path(__file__).resolve().parent.parent / "ai" / "prompts" / "brd-extraction.md"
)

DOC_CURRENT = "CURRENT"
DOC_SUPERSEDED = "SUPERSEDED"
DOC_REMOVED = "REMOVED"


def _display_filename(filename: str | None) -> str:
    # Browsers may send a full client path ("C:\fakepath\brd.pdf").
    name = (filename or "").replace("\\", "/").split("/")[-1].strip()
    return name or "brd-upload"


def _storage_filename(filename: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9._ -]", "_", filename).strip(" .")[:120]
    return f"{uuid.uuid4().hex}_{safe or 'brd-upload'}"


def brd_document_path(document: IntakeDocument) -> Path:
    return UPLOAD_ROOT / document.stored_name


def _register_legacy_uploads(db: Session, change_request_id: int) -> None:
    """Record BRDs uploaded before documents were tracked in the database."""
    if (
        db.query(IntakeDocument.id)
        .filter(IntakeDocument.change_request_id == change_request_id)
        .first()
    ):
        return

    folder = UPLOAD_ROOT / str(change_request_id)
    if not folder.exists():
        return

    files = sorted(
        [path for path in folder.iterdir() if path.is_file()],
        key=lambda path: path.stat().st_mtime,
    )
    for index, path in enumerate(files):
        file_bytes = path.read_bytes()
        try:
            character_count = len(extract_text_from_bytes(file_bytes, path.name))
        except ValueError:
            character_count = 0
        db.add(IntakeDocument(
            change_request_id=change_request_id,
            filename=path.name,
            stored_name=f"{change_request_id}/{path.name}",
            content_type=mimetypes.guess_type(path.name)[0],
            size_bytes=len(file_bytes),
            sha256=hashlib.sha256(file_bytes).hexdigest(),
            character_count=character_count,
            uploaded_by="Unknown (uploaded before document tracking)",
            created_at=datetime.utcfromtimestamp(path.stat().st_mtime),
            status=DOC_CURRENT if index == len(files) - 1 else DOC_SUPERSEDED,
        ))
    if files:
        db.commit()


def save_brd_document(
    db: Session,
    change_request_id: int,
    file_bytes: bytes,
    filename: str | None,
    content_type: str | None,
    character_count: int,
    actor: str,
    user_id: int | None,
) -> IntakeDocument:
    """Store an uploaded BRD; the previous current one is superseded."""
    _register_legacy_uploads(db, change_request_id)

    display_name = _display_filename(filename)
    stored_name = f"{change_request_id}/{_storage_filename(display_name)}"
    destination = UPLOAD_ROOT / stored_name
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(file_bytes)

    now = datetime.utcnow()
    for previous in (
        db.query(IntakeDocument)
        .filter(
            IntakeDocument.change_request_id == change_request_id,
            IntakeDocument.status == DOC_CURRENT,
        )
        .all()
    ):
        previous.status = DOC_SUPERSEDED
        previous.status_changed_by = actor
        previous.status_changed_at = now

    document = IntakeDocument(
        change_request_id=change_request_id,
        filename=display_name,
        stored_name=stored_name,
        content_type=(
            content_type
            if content_type and content_type != "application/octet-stream"
            else mimetypes.guess_type(display_name)[0]
        ),
        size_bytes=len(file_bytes),
        sha256=hashlib.sha256(file_bytes).hexdigest(),
        character_count=character_count,
        uploaded_by=actor,
        uploaded_by_user_id=user_id,
        created_at=now,
        status=DOC_CURRENT,
    )
    db.add(document)
    db.flush()
    return document


def get_current_brd_document(
    db: Session,
    change_request_id: int,
) -> IntakeDocument | None:
    _register_legacy_uploads(db, change_request_id)
    return (
        db.query(IntakeDocument)
        .filter(
            IntakeDocument.change_request_id == change_request_id,
            IntakeDocument.status == DOC_CURRENT,
        )
        .order_by(IntakeDocument.id.desc())
        .first()
    )


def list_brd_documents(db: Session, change_request_id: int) -> list[IntakeDocument]:
    _register_legacy_uploads(db, change_request_id)
    return (
        db.query(IntakeDocument)
        .filter(IntakeDocument.change_request_id == change_request_id)
        .order_by(IntakeDocument.id.desc())
        .all()
    )


def detach_brd_document(
    db: Session,
    change_request_id: int,
    actor: str,
) -> IntakeDocument | None:
    """Detach the current BRD. The file is kept as part of the record."""
    document = get_current_brd_document(db, change_request_id)
    if document is None:
        return None
    document.status = DOC_REMOVED
    document.status_changed_by = actor
    document.status_changed_at = datetime.utcnow()
    return document


def _iso_z(value: datetime | None) -> str | None:
    return value.isoformat() + "Z" if value else None


def serialize_intake_document(document: IntakeDocument) -> dict:
    return {
        "id": document.id,
        "change_request_id": document.change_request_id,
        "filename": document.filename,
        "content_type": document.content_type,
        "size_bytes": document.size_bytes,
        "sha256": document.sha256,
        "character_count": document.character_count,
        "has_text": bool(document.character_count),
        "uploaded_by": document.uploaded_by,
        "uploaded_at": _iso_z(document.created_at),
        "status": document.status,
        "status_changed_by": document.status_changed_by,
        "status_changed_at": _iso_z(document.status_changed_at),
        "extraction_method": document.extraction_method,
        "extracted_at": _iso_z(document.extracted_at),
        "applied_by": document.applied_by,
        "applied_at": _iso_z(document.applied_at),
        "file_available": brd_document_path(document).is_file(),
    }


def build_brd_extraction_prompt(document_text: str) -> str:
    trimmed = document_text[:120000]
    template = BRD_PROMPT_PATH.read_text(encoding="utf-8")
    return (
        template.replace("{{SCHEMA}}", EXTRACTION_JSON_SCHEMA)
        .replace("{{DOCUMENT_TEXT}}", trimmed)
    )


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
        ai_extracted = normalize_extraction_values(
            _normalize_extraction(parsed)
        )
        merged = merge_extraction_layers(ai_extracted, heuristic)

        if _count_filled_required(merged) < _count_filled_required(heuristic):
            merged = merge_extraction_layers(heuristic, ai_extracted)

        derive_implied_fields(merged, document_text)

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


def read_brd_document_text(document: IntakeDocument) -> str:
    path = brd_document_path(document)
    if not path.is_file():
        raise ValueError(
            "The uploaded BRD file is no longer available on the server. "
            "Upload it again."
        )
    return extract_text_from_bytes(path.read_bytes(), document.filename)


def get_latest_brd_upload(db: Session, change_request_id: int) -> dict | None:
    document = get_current_brd_document(db, change_request_id)
    if document is None:
        return None

    try:
        text = read_brd_document_text(document)
    except ValueError:
        text = ""

    return {
        **serialize_intake_document(document),
        "has_text": bool(text.strip()),
        "preview": text[:400],
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
