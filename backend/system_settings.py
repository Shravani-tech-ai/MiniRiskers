"""Admin-configurable runtime settings.

Each setting has a default, a type and bounds. Stored values override the
default; reading never fails, so a missing or corrupt row falls back to the
default.
"""

import json
from datetime import datetime

from sqlalchemy.orm import Session

from backend.models import SystemSetting

SETTING_SPECS = {
    "feedback_window_days": {
        "type": int,
        "default": 5,
        "min": 1,
        "max": 90,
        "label": "Feedback window (days)",
        "help": (
            "How long a Business Owner can rate a request after it closes "
            "(approved, conditions met or rejected)."
        ),
    },
    "training_min_cases": {
        "type": int,
        "default": 10,
        "min": 5,
        "max": 10000,
        "label": "Minimum decided cases to train",
        "help": "Training refuses to run with fewer decided cases than this.",
    },
    "training_max_cases": {
        "type": int,
        "default": 200,
        "min": 0,
        "max": 100000,
        "label": "Most recent decided cases to use (0 = all)",
        "help": "Limits training to the newest decided cases.",
    },
    "training_lookback_days": {
        "type": int,
        "default": 0,
        "min": 0,
        "max": 3650,
        "label": "Only use cases closed in the last N days (0 = no limit)",
        "help": "Keeps training focused on recent decisions.",
    },
    "ai_learning_enabled": {
        "type": bool,
        "default": True,
        "label": "Give the AI past decided cases as examples",
        "help": (
            "Adds the most similar decided cases (system rating, analyst "
            "rating, reason, committee decision) to the AI assessment prompt."
        ),
    },
    "ai_learning_examples": {
        "type": int,
        "default": 3,
        "min": 1,
        "max": 10,
        "label": "Examples given to the AI",
        "help": "How many similar decided cases go into each AI prompt.",
    },
}


class SettingError(ValueError):
    pass


def _coerce(key: str, value):
    spec = SETTING_SPECS[key]
    if spec["type"] is bool:
        if isinstance(value, bool):
            return value
        raise SettingError(f"{spec['label']} must be true or false.")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise SettingError(f"{spec['label']} must be a whole number.")
    if int(value) != value:
        raise SettingError(f"{spec['label']} must be a whole number.")
    value = int(value)
    if value < spec["min"] or value > spec["max"]:
        raise SettingError(
            f"{spec['label']} must be between {spec['min']} and {spec['max']}."
        )
    return value


def get_setting(db: Session, key: str):
    spec = SETTING_SPECS[key]
    row = db.get(SystemSetting, key)
    if row is None:
        return spec["default"]
    try:
        return _coerce(key, json.loads(row.value_json))
    except (SettingError, json.JSONDecodeError):
        return spec["default"]


def get_all_settings(db: Session) -> dict:
    return {key: get_setting(db, key) for key in SETTING_SPECS}


def describe_settings(db: Session) -> list[dict]:
    rows = {row.key: row for row in db.query(SystemSetting).all()}
    described = []
    for key, spec in SETTING_SPECS.items():
        row = rows.get(key)
        described.append({
            "key": key,
            "label": spec["label"],
            "help": spec["help"],
            "type": "boolean" if spec["type"] is bool else "integer",
            "min": spec.get("min"),
            "max": spec.get("max"),
            "default": spec["default"],
            "value": get_setting(db, key),
            "updated_by": row.updated_by if row else None,
            "updated_at": row.updated_at if row else None,
        })
    return described


def update_settings(db: Session, values: dict, actor: str) -> dict:
    unknown = sorted(set(values) - set(SETTING_SPECS))
    if unknown:
        raise SettingError(f"Unknown setting: {', '.join(unknown)}.")
    coerced = {key: _coerce(key, value) for key, value in values.items()}

    merged = {**get_all_settings(db), **coerced}
    if merged["training_max_cases"] and (
        merged["training_max_cases"] < merged["training_min_cases"]
    ):
        raise SettingError(
            "The most recent cases to use must be at least the minimum "
            "number of decided cases (or 0 for all)."
        )

    now = datetime.utcnow()
    for key, value in coerced.items():
        row = db.get(SystemSetting, key)
        if row is None:
            row = SystemSetting(key=key, value_json=json.dumps(value))
            db.add(row)
        row.value_json = json.dumps(value)
        row.updated_by = actor
        row.updated_at = now
    db.commit()
    return get_all_settings(db)
