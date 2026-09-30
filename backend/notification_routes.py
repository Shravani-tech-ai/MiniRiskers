"""REST endpoints for in-app notifications."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import Notification, User
from backend.notifications import check_sla_notifications, serialize_notification

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_sla_notifications(db, current_user)

    query = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
    )
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))

    capped = min(max(limit, 1), 100)
    items = query.limit(capped).all()
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
        .count()
    )
    db.commit()

    return {
        "notifications": [serialize_notification(item) for item in items],
        "unread_count": unread_count,
    }


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_sla_notifications(db, current_user)
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
        .count()
    )
    db.commit()
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")

    if notification.read_at is None:
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)

    return serialize_notification(notification)


class ReadAllPayload(BaseModel):
    notification_ids: list[int] | None = None


@router.post("/read-all")
def mark_all_read(
    payload: ReadAllPayload | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read_at.is_(None),
    )
    if payload and payload.notification_ids:
        query = query.filter(Notification.id.in_(payload.notification_ids))

    now = datetime.utcnow()
    updated = 0
    for notification in query.all():
        notification.read_at = now
        updated += 1

    db.commit()
    return {"marked_read": updated}
