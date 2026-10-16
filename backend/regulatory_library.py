"""Regulatory library: upload, approve, index and supersede the regulatory
documents the RAG pipeline cites.

Admin uploads are approved on upload. Risk Committee uploads wait for an
Admin. Approved documents are chunked and embedded into the same Chroma
collection the evidence search uses; each chunk carries a `status` so that
superseded, withdrawn and not-yet-effective documents are never cited while
staying available for audit.
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.audit import create_audit_event
from backend.auth import audit_actor_name, get_current_user
from backend.database import SessionLocal, get_db
from backend.models import ChangeRequest, RegulatoryEvidence, RegulatorySource, User
from backend.notifications import (
    active_users_with_roles,
    notify_users,
    users_for_analysts,
)
from backend.permissions import (
    ROLE_ADMIN,
    ROLE_RISK_ANALYST,
    ROLE_RISK_COMMITTEE,
    assert_role,
)

router = APIRouter(tags=["Regulatory library"])

PROJECT_ROOT = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(
    os.environ.get("MINIRISKERS_REGULATION_UPLOAD_DIR")
    or PROJECT_ROOT / "data" / "regulations"
)
INITIAL_CORPUS_DIR = PROJECT_ROOT / "data" / "processed"
INITIAL_PDF_DIR = PROJECT_ROOT / "Documents"

STATUS_PENDING = "PENDING_APPROVAL"
STATUS_ACTIVE = "ACTIVE"
STATUS_SUPERSEDED = "SUPERSEDED"
STATUS_WITHDRAWN = "WITHDRAWN"
STATUS_REJECTED = "REJECTED"

# Chunk statuses in the vector store (see rag.query_engine).
CHUNK_CURRENT = "current"
CHUNK_SCHEDULED = "scheduled"
CHUNK_SUPERSEDED = "superseded"
CHUNK_WITHDRAWN = "withdrawn"

UPLOADERS = (ROLE_RISK_COMMITTEE, ROLE_ADMIN)
READERS = (ROLE_RISK_ANALYST, ROLE_RISK_COMMITTEE, ROLE_ADMIN)
ALLOWED_EXTENSIONS = {".pdf", ".txt"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
OPEN_STAGES_EXCLUDED = {"COMPLETED"}


def embeddings_disabled() -> bool:
    return os.environ.get("MINIRISKERS_DISABLE_EMBEDDINGS") == "1"


# ---------------------------------------------------------------------------
# Vector store helpers
# ---------------------------------------------------------------------------

def _collection():
    from rag.query_engine import load_vector_store

    return load_vector_store()._collection


def set_chunk_status(document_name: str, status: str) -> int:
    """Re-label every chunk of a document; returns the number updated."""
    if embeddings_disabled():
        return 0
    collection = _collection()
    found = collection.get(where={"document": document_name}, include=["metadatas"])
    ids = found.get("ids") or []
    if not ids:
        return 0
    metadatas = [{**(meta or {}), "status": status} for meta in found["metadatas"]]
    collection.update(ids=ids, metadatas=metadatas)
    return len(ids)


def _extract_pages(path: Path) -> list[tuple[int, str]]:
    if path.suffix.lower() == ".pdf":
        import fitz

        pages = []
        with fitz.open(path) as document:
            for number, page in enumerate(document, start=1):
                text = page.get_text("text").strip()
                if text:
                    pages.append((number, text))
        return pages

    text = path.read_text(encoding="utf-8", errors="ignore")
    marked = re.split(r"--- PAGE (\d+) ---", text)
    if len(marked) > 1:
        return [
            (int(marked[i]), marked[i + 1].strip())
            for i in range(1, len(marked), 2)
            if marked[i + 1].strip()
        ]
    return [(1, text.strip())] if text.strip() else []


def _chunk_status_for(source: RegulatorySource) -> str:
    if source.effective_from and source.effective_from > datetime.utcnow():
        return CHUNK_SCHEDULED
    return CHUNK_CURRENT


def _index_document(source: RegulatorySource) -> tuple[int, int]:
    """Chunk and embed a document. Returns (pages, chunks)."""
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from rag.query_engine import load_vector_store

    path = Path(source.source_file)
    pages = _extract_pages(path)
    if not pages:
        raise ValueError("No extractable text found in the document.")

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    texts, metadatas, ids = [], [], []
    status = _chunk_status_for(source)
    for page_number, page_text in pages:
        for index, chunk in enumerate(splitter.split_text(page_text)):
            texts.append(chunk)
            metadatas.append({
                "authority": source.authority,
                "jurisdiction": source.jurisdiction or "India",
                "status": status,
                "document_type": source.document_type or "Regulatory Document",
                "document": source.document_name,
                "page": page_number,
                "source_file": path.name,
                "source_id": source.id,
            })
            ids.append(f"regsrc-{source.id}-p{page_number}-c{index}")

    if embeddings_disabled():
        return len(pages), len(texts)

    vector_store = load_vector_store()
    # Re-indexing replaces any earlier chunks of the same source.
    vector_store._collection.delete(where={"source_id": source.id})
    vector_store.add_texts(texts=texts, metadatas=metadatas, ids=ids)
    return len(pages), len(texts)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

def impacted_open_requests(db: Session, source: RegulatorySource) -> list[ChangeRequest]:
    """Open requests whose current evidence cites this document."""
    request_ids = {
        row.change_request_id
        for row in db.query(RegulatoryEvidence.change_request_id)
        .filter(
            RegulatoryEvidence.is_current.is_(True),
            (RegulatoryEvidence.regulatory_source_id == source.id)
            | (RegulatoryEvidence.document_name == source.document_name),
        )
        .distinct()
    }
    if not request_ids:
        return []
    return (
        db.query(ChangeRequest)
        .filter(
            ChangeRequest.id.in_(request_ids),
            ChangeRequest.current_stage.notin_(list(OPEN_STAGES_EXCLUDED)),
        )
        .order_by(ChangeRequest.id.asc())
        .all()
    )


def _flag_impacted_requests(
    db: Session,
    old: RegulatorySource,
    replacement: RegulatorySource | None,
    actor: str,
) -> int:
    requests = impacted_open_requests(db, old)
    what = (
        f"superseded by {replacement.title or replacement.document_name}"
        if replacement
        else "withdrawn"
    )
    for change_request in requests:
        create_audit_event(
            db=db,
            change_request_id=change_request.id,
            actor=actor,
            action="REGULATORY_SOURCE_CHANGED",
            entity_type="RegulatorySource",
            entity_id=old.id,
            old_value=old.document_name,
            new_value=replacement.document_name if replacement else None,
            reason=(
                f"Cited regulation {old.document_name} was {what}. "
                "Regenerate regulatory evidence before the review continues."
            ),
        )
        label = change_request.request_number or f"CR-{change_request.id}"
        notify_users(
            db,
            users_for_analysts(db, change_request),
            notification_type=f"REGULATION_CHANGED_{old.id}",
            title=f"Re-check evidence for {label}",
            body=(
                f"{old.document_name} was {what}. Regenerate the regulatory "
                "evidence for this request."
            ),
            change_request_id=change_request.id,
            link_path=f"/assessment/{change_request.id}",
        )
    return len(requests)


def activate_source(db: Session, source: RegulatorySource, actor: str) -> None:
    """Index an approved source and retire the one it supersedes."""
    source.status = STATUS_ACTIVE
    source.index_status = "INDEXING"
    db.commit()
    try:
        pages, chunks = _index_document(source)
        source.page_count = pages
        source.chunk_count = chunks
        if embeddings_disabled():
            source.index_status = "SKIPPED"
        elif _chunk_status_for(source) == CHUNK_SCHEDULED:
            # Indexed but not citable until its effective date.
            source.index_status = "SCHEDULED"
        else:
            source.index_status = "INDEXED"
        source.index_error = None
    except Exception as error:  # noqa: BLE001 - surfaced to the Admin
        source.index_status = "FAILED"
        source.index_error = str(error)[:2000]
        db.commit()
        return

    if source.supersedes_id:
        old = db.get(RegulatorySource, source.supersedes_id)
        if old is not None and old.status == STATUS_ACTIVE:
            old.status = STATUS_SUPERSEDED
            old.superseded_by_id = source.id
            old.effective_to = source.effective_from or datetime.utcnow()
            set_chunk_status(old.document_name, CHUNK_SUPERSEDED)
            _flag_impacted_requests(db, old, source, actor)
    db.commit()


def _activate_in_background(source_id: int, actor: str) -> None:
    db = SessionLocal()
    try:
        source = db.get(RegulatorySource, source_id)
        if source is not None:
            activate_source(db, source, actor)
    finally:
        db.close()


def activate_due_sources(db: Session) -> int:
    """Make scheduled documents citable once their effective date arrives."""
    now = datetime.utcnow()
    due = (
        db.query(RegulatorySource)
        .filter(
            RegulatorySource.status == STATUS_ACTIVE,
            RegulatorySource.index_status == "SCHEDULED",
            RegulatorySource.effective_from <= now,
        )
        .all()
    )
    for source in due:
        set_chunk_status(source.document_name, CHUNK_CURRENT)
        source.index_status = "INDEXED"
    if due:
        db.commit()
    return len(due)


def ensure_regulatory_library_seeded(db: Session) -> None:
    """Register the documents indexed before the library existed."""
    if db.query(RegulatorySource.id).first():
        return
    from rag.vector_store import get_document_metadata

    for text_file in sorted(INITIAL_CORPUS_DIR.glob("*.txt")):
        metadata = get_document_metadata(text_file.name)
        pdf = INITIAL_PDF_DIR / f"{text_file.stem}.pdf"
        withdrawn = metadata.get("status") == "withdrawn"
        db.add(RegulatorySource(
            title=re.sub(r"^\d+-", "", text_file.stem),
            document_name=text_file.stem,
            authority=metadata.get("authority") or "Unknown",
            document_type=metadata.get("document_type"),
            jurisdiction=metadata.get("jurisdiction") or "India",
            status=STATUS_WITHDRAWN if withdrawn else STATUS_ACTIVE,
            source_file=str(pdf if pdf.exists() else text_file),
            uploaded_by="System (initial corpus)",
            approved_by="System (initial corpus)",
            approved_at=datetime.utcnow(),
            index_status="INDEXED",
        ))
    db.commit()


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------

def serialize_source(row: RegulatorySource) -> dict:
    return {
        "id": row.id,
        "title": row.title or row.document_name,
        "document_name": row.document_name,
        "authority": row.authority,
        "document_type": row.document_type,
        "reference_number": row.reference_number,
        "jurisdiction": row.jurisdiction,
        "description": row.description,
        "status": row.status,
        "effective_from": row.effective_from,
        "effective_to": row.effective_to,
        "supersedes_id": row.supersedes_id,
        "superseded_by_id": row.superseded_by_id,
        "uploaded_by": row.uploaded_by,
        "uploaded_by_user_id": row.uploaded_by_user_id,
        "approved_by": row.approved_by,
        "approved_at": row.approved_at,
        "review_note": row.review_note,
        "index_status": row.index_status,
        "index_error": row.index_error,
        "page_count": row.page_count,
        "chunk_count": row.chunk_count,
        "has_file": bool(row.source_file and Path(row.source_file).exists()),
        "created_at": row.created_at,
    }


def _get_source_or_404(db: Session, source_id: int) -> RegulatorySource:
    row = db.get(RegulatorySource, source_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Regulatory document not found.")
    return row


def _unique_document_name(db: Session, title: str) -> str:
    base = re.sub(r"[^\w\s,.()&-]", "", title).strip()[:150] or "Regulation"
    name, counter = base, 2
    while db.query(RegulatorySource.id).filter(
        RegulatorySource.document_name == name
    ).first():
        name = f"{base} ({counter})"
        counter += 1
    return name


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError as error:
        raise HTTPException(
            status_code=400, detail="Effective date must be YYYY-MM-DD."
        ) from error


@router.get("/regulatory-sources")
def list_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *READERS)
    rows = db.query(RegulatorySource).order_by(RegulatorySource.id.desc()).all()
    return {"sources": [serialize_source(row) for row in rows]}


@router.get("/regulatory-sources/{source_id}")
def get_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *READERS)
    row = _get_source_or_404(db, source_id)
    data = serialize_source(row)
    data["impacted_requests"] = [
        {
            "id": cr.id,
            "request_number": cr.request_number,
            "title": cr.title,
            "current_stage": cr.current_stage,
        }
        for cr in impacted_open_requests(db, row)
    ]
    return data


@router.get("/regulatory-sources/{source_id}/file")
def download_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *READERS)
    row = _get_source_or_404(db, source_id)
    path = Path(row.source_file or "")
    if not path.exists():
        raise HTTPException(status_code=404, detail="The original file is not available.")
    return FileResponse(path, filename=path.name)


@router.post("/regulatory-sources", status_code=201)
async def upload_source(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    authority: str = Form(...),
    document_type: str = Form(""),
    reference_number: str = Form(""),
    description: str = Form(""),
    effective_from: str = Form(""),
    supersedes_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, *UPLOADERS)
    if not title.strip() or not authority.strip():
        raise HTTPException(status_code=400, detail="Title and issuing authority are required.")
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Upload a PDF or plain-text file.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Files must be 25 MB or smaller.")

    if supersedes_id:
        old = _get_source_or_404(db, supersedes_id)
        if old.status != STATUS_ACTIVE:
            raise HTTPException(
                status_code=400,
                detail="Only an active document can be superseded.",
            )

    actor = audit_actor_name(current_user)
    is_admin = current_user.role == ROLE_ADMIN
    row = RegulatorySource(
        title=title.strip(),
        document_name=_unique_document_name(db, title.strip()),
        authority=authority.strip(),
        document_type=document_type.strip() or None,
        reference_number=reference_number.strip() or None,
        description=description.strip() or None,
        effective_from=_parse_date(effective_from),
        supersedes_id=supersedes_id or None,
        jurisdiction="India",
        status=STATUS_ACTIVE if is_admin else STATUS_PENDING,
        uploaded_by=actor,
        uploaded_by_user_id=current_user.id,
        index_status="NOT_INDEXED",
    )
    if is_admin:
        row.approved_by = f"{actor} (auto-approved: Admin upload)"
        row.approved_by_user_id = current_user.id
        row.approved_at = datetime.utcnow()
    db.add(row)
    db.flush()

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^\w.-]", "_", file.filename or f"document{extension}")
    path = UPLOAD_DIR / f"{row.id}_{safe_name}"
    path.write_bytes(content)
    row.source_file = str(path)
    db.commit()

    if is_admin:
        background_tasks.add_task(_activate_in_background, row.id, actor)
    else:
        notify_users(
            db,
            active_users_with_roles(db, ROLE_ADMIN),
            notification_type=f"REGULATION_PENDING_{row.id}",
            title=f"Regulation awaiting approval: {row.title}",
            body=f"{actor} uploaded {row.title}. Approve it before it is used as evidence.",
            link_path="/regulations",
        )
        db.commit()
    return serialize_source(row)


class ReviewNotePayload(BaseModel):
    note: str = ""


@router.post("/regulatory-sources/{source_id}/approve")
def approve_source(
    source_id: int,
    background_tasks: BackgroundTasks,
    payload: ReviewNotePayload | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    row = _get_source_or_404(db, source_id)
    if row.status != STATUS_PENDING:
        raise HTTPException(status_code=400, detail="Only pending documents can be approved.")
    if row.uploaded_by_user_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Maker-checker: you cannot approve a document you uploaded.",
        )
    actor = audit_actor_name(current_user)
    row.approved_by = actor
    row.approved_by_user_id = current_user.id
    row.approved_at = datetime.utcnow()
    row.review_note = (payload.note.strip() if payload else "") or None
    row.status = STATUS_ACTIVE
    db.commit()
    background_tasks.add_task(_activate_in_background, row.id, actor)
    _notify_uploader(db, row, f"Approved: {row.title}", "Your regulatory document is approved and being indexed.")
    return serialize_source(row)


@router.post("/regulatory-sources/{source_id}/reject")
def reject_source(
    source_id: int,
    payload: ReviewNotePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    row = _get_source_or_404(db, source_id)
    if row.status != STATUS_PENDING:
        raise HTTPException(status_code=400, detail="Only pending documents can be rejected.")
    note = payload.note.strip()
    if not note:
        raise HTTPException(status_code=400, detail="Explain why the document is rejected.")
    row.status = STATUS_REJECTED
    row.review_note = note
    db.commit()
    _notify_uploader(db, row, f"Rejected: {row.title}", note)
    return serialize_source(row)


@router.post("/regulatory-sources/{source_id}/withdraw")
def withdraw_source(
    source_id: int,
    payload: ReviewNotePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    row = _get_source_or_404(db, source_id)
    if row.status != STATUS_ACTIVE:
        raise HTTPException(status_code=400, detail="Only active documents can be withdrawn.")
    note = payload.note.strip()
    if not note:
        raise HTTPException(status_code=400, detail="Explain why the document is withdrawn.")
    row.status = STATUS_WITHDRAWN
    row.review_note = note
    row.effective_to = datetime.utcnow()
    set_chunk_status(row.document_name, CHUNK_WITHDRAWN)
    impacted = _flag_impacted_requests(db, row, None, audit_actor_name(current_user))
    db.commit()
    return {**serialize_source(row), "impacted_requests_flagged": impacted}


@router.post("/regulatory-sources/{source_id}/reindex")
def reindex_source(
    source_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_role(current_user, ROLE_ADMIN)
    row = _get_source_or_404(db, source_id)
    if row.status != STATUS_ACTIVE or row.index_status not in {"FAILED", "NOT_INDEXED"}:
        raise HTTPException(
            status_code=400,
            detail="Only active documents whose indexing failed can be re-indexed.",
        )
    background_tasks.add_task(_activate_in_background, row.id, audit_actor_name(current_user))
    return serialize_source(row)


def _notify_uploader(db: Session, row: RegulatorySource, title: str, body: str) -> None:
    if not row.uploaded_by_user_id:
        return
    uploader = db.get(User, row.uploaded_by_user_id)
    if uploader is None:
        return
    notify_users(
        db,
        [uploader],
        notification_type=f"REGULATION_REVIEWED_{row.id}",
        title=title,
        body=body,
        link_path="/regulations",
    )
    db.commit()
