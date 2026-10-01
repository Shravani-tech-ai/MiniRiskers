"""User preference defaults and notification category helpers."""

import json
from copy import deepcopy

from backend.models import User

DEFAULT_PREFERENCES = {
    "notifications": {
        "workflow": True,
        "committee": True,
        "conditions": True,
        "sla": True,
        "methodology": True,
    },
}

NOTIFICATION_CATEGORIES = {
    "workflow": "Workflow updates",
    "committee": "Committee decisions",
    "conditions": "Approval conditions",
    "sla": "SLA reminders",
    "methodology": "Methodology changes",
}


def parse_user_preferences(preferences_json: str | None) -> dict:
    if not preferences_json:
        return deepcopy(DEFAULT_PREFERENCES)

    try:
        parsed = json.loads(preferences_json)
    except json.JSONDecodeError:
        return deepcopy(DEFAULT_PREFERENCES)

    if not isinstance(parsed, dict):
        return deepcopy(DEFAULT_PREFERENCES)

    merged = deepcopy(DEFAULT_PREFERENCES)
    incoming = parsed.get("notifications")
    if isinstance(incoming, dict):
        for key in DEFAULT_PREFERENCES["notifications"]:
            if key in incoming and isinstance(incoming[key], bool):
                merged["notifications"][key] = incoming[key]
    return merged


def serialize_user_preferences(preferences: dict) -> str:
    return json.dumps(preferences)


def merge_notification_preferences(
    current: dict,
    updates: dict[str, bool],
) -> dict:
    merged = deepcopy(current)
    for key, value in updates.items():
        if key in DEFAULT_PREFERENCES["notifications"] and isinstance(value, bool):
            merged["notifications"][key] = value
    return merged


def notification_category(notification_type: str) -> str:
    normalized = (notification_type or "").strip().upper()
    if normalized.startswith("COMMITTEE_"):
        return "committee"
    if normalized.startswith("CONDITION_"):
        return "conditions"
    if normalized.startswith("SLA_"):
        return "sla"
    if normalized.startswith("METHODOLOGY_"):
        return "methodology"
    return "workflow"


def user_wants_notification(user: User, notification_type: str) -> bool:
    preferences = parse_user_preferences(user.preferences_json)
    category = notification_category(notification_type)
    return preferences["notifications"].get(category, True)
