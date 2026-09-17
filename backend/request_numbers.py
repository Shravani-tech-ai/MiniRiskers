from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.models import ChangeRequest


def peek_next_request_number(db: Session) -> str:
    year = datetime.utcnow().year
    prefix = f"CR-{year}-"

    existing = (
        db.query(ChangeRequest.request_number)
        .filter(ChangeRequest.request_number.like(f"{prefix}%"))
        .all()
    )

    max_sequence = 0

    for (request_number,) in existing:
        suffix = request_number.replace(prefix, "", 1)
        if suffix.isdigit():
            max_sequence = max(max_sequence, int(suffix))

    return f"{prefix}{max_sequence + 1:03d}"


def allocate_request_number(db: Session, max_attempts: int = 5) -> str:
    for _ in range(max_attempts):
        candidate = peek_next_request_number(db)

        exists = (
            db.query(ChangeRequest.id)
            .filter(ChangeRequest.request_number == candidate)
            .first()
        )

        if not exists:
            return candidate

    raise RuntimeError("Unable to allocate a unique request number.")
