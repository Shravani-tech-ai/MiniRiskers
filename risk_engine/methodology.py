"""Versioned, tunable risk methodology.

Every parameter the risk function may tune (category weights, rating bands,
residual floors, concentration rules, per-factor scores and weights,
generator thresholds, override escalation policy and workflow SLAs) lives
in a methodology config. Configs are stored as immutable versions in the
MethodologyVersion table; exactly one version is ACTIVE at a time.

The scoring functions here are pure (no database access) so that the same
code scores live assessments, re-explains stored ones and previews the
impact of a draft methodology on the existing portfolio.
"""

import copy
import json
from pathlib import Path

CATEGORIES = [
    "CUSTOMER",
    "PRODUCT",
    "GEOGRAPHY",
    "TRANSACTION",
    "CHANNEL",
    "THIRD_PARTY",
    "FRAUD",
]

RATINGS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

FRAMEWORK_PATH = (
    Path(__file__).resolve().parent.parent / "config" / "risk_framework.json"
)

# Version 1.0 reproduces the constants the engine shipped with, so
# assessments calculated before versioning existed still explain correctly.
DEFAULT_CONFIG = {
    "version": "1.0",
    "model_name": "MiniRiskers FCRM Risk Model",
    "framework_version": "2026.1",
    "category_weights": {
        "CUSTOMER": 0.20,
        "PRODUCT": 0.20,
        "GEOGRAPHY": 0.15,
        "TRANSACTION": 0.20,
        "CHANNEL": 0.10,
        "THIRD_PARTY": 0.10,
        "FRAUD": 0.05,
    },
    # A score belongs to the first band whose max it does not exceed.
    "rating_bands": [
        {"rating": "LOW", "max": 25},
        {"rating": "MEDIUM", "max": 50},
        {"rating": "HIGH", "max": 75},
        {"rating": "CRITICAL", "max": 100},
    ],
    # Residual risk never drops below the floor for the inherent score.
    "base_residual_floors": [
        {"min_inherent": 76, "floor": 51},
        {"min_inherent": 51, "floor": 26},
        {"min_inherent": 0, "floor": 5},
    ],
    "concentration_rules": [
        {
            "id": "cross-border-velocity",
            "name": "Cross-border velocity concentration",
            "factors": [
                "Cross Border Transactions",
                "High Transaction Velocity",
                "Rapid Movement",
            ],
            "floor": 60,
        },
        {
            "id": "pep-high-risk-customer",
            "name": "PEP and high-risk customer concentration",
            "factors": ["PEP Exposure", "High Risk Customer Exposure"],
            "floor": 55,
        },
        {
            "id": "third-party-cross-border",
            "name": "Third-party cross-border processing",
            "factors": [
                "Third Party Transaction Processing",
                "Cross Border Processing",
            ],
            "floor": 55,
        },
        {
            "id": "sanctions-exposure",
            "name": "Sanctions exposure",
            "factors": ["Sanctions Exposure"],
            "floor": 65,
        },
    ],
    # Score (0-100) and within-category weight of every factor the
    # generator can raise. Which factors exist is fixed in code; how much
    # each one counts is tunable here.
    "factor_catalog": {
        "PRODUCT": {
            "New Product": {"score": 70, "weight": 0.40},
            "Cross Border Product": {"score": 80, "weight": 0.30},
            "Digital Product Channel": {"score": 65, "weight": 0.30},
        },
        "CUSTOMER": {
            "PEP Exposure": {"score": 85, "weight": 0.30},
            "High Risk Customer Exposure": {"score": 90, "weight": 0.30},
            "Digital Onboarding": {"score": 70, "weight": 0.20},
            "Large Customer Population": {"score": 65, "weight": 0.20},
        },
        "GEOGRAPHY": {
            "Cross Border Geography": {"score": 75, "weight": 0.40},
            "High Risk Jurisdiction": {"score": 95, "weight": 0.35},
            "Sanctions Exposure": {"score": 100, "weight": 0.25},
        },
        "TRANSACTION": {
            "Cross Border Transactions": {"score": 80, "weight": 0.25},
            "High Transaction Velocity": {"score": 80, "weight": 0.25},
            "Round Amount Pattern": {"score": 65, "weight": 0.20},
            "Rapid Movement": {"score": 85, "weight": 0.30},
        },
        "CHANNEL": {
            "Mobile Banking": {"score": 70, "weight": 0.35},
            "Remote Onboarding": {"score": 80, "weight": 0.35},
            "Third Party Channel": {"score": 75, "weight": 0.30},
        },
        "THIRD_PARTY": {
            "Third Party Transaction Processing": {"score": 80, "weight": 0.35},
            "Customer Data Handling": {"score": 70, "weight": 0.25},
            "Payment Data Handling": {"score": 75, "weight": 0.20},
            "Cross Border Processing": {"score": 80, "weight": 0.20},
        },
        "FRAUD": {
            "High Transaction Velocity": {"score": 80, "weight": 0.40},
            "Rapid Movement Pattern": {"score": 85, "weight": 0.35},
        },
    },
    "thresholds": {
        "high_transaction_velocity": 5,
        "large_customer_population": 100000,
    },
    "override_policy": {
        # Downgrades of this many bands (or more) need the committee to
        # acknowledge the override before deciding.
        "acknowledge_downgrade_bands": 1,
        # Downgrades of this many bands (or more) are escalated.
        "escalate_downgrade_bands": 2,
        # Downgrading away from these system ratings is always escalated.
        "escalate_downgrade_from": ["CRITICAL"],
        # Rating below the band a concentration floor guarantees is escalated.
        "escalate_below_concentration_floor": True,
        "min_reason_chars_downgrade": 40,
        # Escalated downgrades cannot be approved without conditions.
        "escalated_blocks_unconditional_approval": True,
    },
    "workflow": {
        # Target from Business Owner submission to committee decision.
        "sla_target_hours": 48,
        "at_risk_threshold_pct": 75,
        "stage_targets_hours": {
            "AWAITING_ANALYST": 8,
            "RISK_ASSESSMENT": 12,
            "ANALYST_REVIEW": 12,
            "COMMITTEE_REVIEW": 16,
        },
        # Time the request spends back with the Business Owner after a
        # deferral does not count against the bank's SLA.
        "pause_clock_when_returned": True,
        "condition_default_due_days": 30,
    },
}


def default_config() -> dict:
    return copy.deepcopy(DEFAULT_CONFIG)


# ---------------------------------------------------------------------------
# Framework reference data
# ---------------------------------------------------------------------------

_framework_cache = None


def load_framework() -> dict:
    global _framework_cache
    if _framework_cache is None:
        with open(FRAMEWORK_PATH, encoding="utf-8") as handle:
            _framework_cache = json.load(handle)
    return _framework_cache


def _resolve_refs(refs: list[dict]) -> list[dict]:
    sources = load_framework()["sources"]
    resolved = []
    for ref in refs or []:
        source = sources.get(ref["source"], {})
        resolved.append({
            **ref,
            "source_title": source.get("title", ref["source"]),
            "issuer": source.get("issuer"),
            "in_corpus": source.get("in_corpus", False),
        })
    return resolved


def framework_refs_for_category(category: str) -> list[dict]:
    entry = load_framework()["categories"].get(category) or {}
    return _resolve_refs(entry.get("references"))


def framework_refs_for_factor(category: str, factor: str) -> list[dict]:
    refs = load_framework()["factors"].get(f"{category}:{factor}")
    return _resolve_refs(refs)


def framework_refs_for_rule(rule_id: str) -> list[dict]:
    refs = load_framework()["concentration_rules"].get(rule_id)
    return _resolve_refs(refs)


def framework_coverage_gaps(config: dict) -> list[str]:
    """Catalog factors, categories or rules with no framework mapping."""
    framework = load_framework()
    gaps = []
    for category in CATEGORIES:
        if not framework["categories"].get(category, {}).get("references"):
            gaps.append(f"category {category}")
    for category, factors in config["factor_catalog"].items():
        for name in factors:
            if not framework["factors"].get(f"{category}:{name}"):
                gaps.append(f"factor {category}:{name}")
    for rule in config["concentration_rules"]:
        if not framework["concentration_rules"].get(rule.get("id")):
            gaps.append(f"concentration rule {rule.get('id')}")
    return gaps


# ---------------------------------------------------------------------------
# Pure scoring
# ---------------------------------------------------------------------------

def get_rating(score: float, config: dict) -> str:
    bands = sorted(config["rating_bands"], key=lambda band: band["max"])
    for band in bands:
        if score <= band["max"]:
            return band["rating"]
    return bands[-1]["rating"]


def rating_band_ranges(config: dict) -> list[dict]:
    bands = sorted(config["rating_bands"], key=lambda band: band["max"])
    ranges = []
    lower = 0
    for band in bands:
        ranges.append({
            "rating": band["rating"],
            "min": lower,
            "max": band["max"],
        })
        lower = band["max"] + 1 if float(band["max"]).is_integer() else band["max"]
    return ranges


def rating_floor_score(rating: str, config: dict) -> float:
    """Lowest score that still falls in the given rating band."""
    for band in rating_band_ranges(config):
        if band["rating"] == rating:
            return band["min"]
    return 0


def get_base_residual_floor(inherent_score: float, config: dict) -> float:
    floors = sorted(
        config["base_residual_floors"],
        key=lambda item: item["min_inherent"],
        reverse=True,
    )
    for item in floors:
        if inherent_score >= item["min_inherent"]:
            return item["floor"]
    return 0


def get_triggered_concentration_rules(
    factor_names: set[str],
    config: dict,
) -> list[dict]:
    return [
        rule
        for rule in config["concentration_rules"]
        if all(factor in factor_names for factor in rule["factors"])
    ]


def catalog_entry(config: dict, category: str, factor: str) -> dict | None:
    return (config.get("factor_catalog") or {}).get(category, {}).get(factor)


def score_factors(
    factors: list[dict],
    control_effectiveness: float,
    config: dict,
) -> dict:
    """Score a set of triggered factors under a methodology config.

    `factors` items need `category` and `name`; `score` and `weight` are
    used only when the config's catalog has no entry for the factor.
    """
    resolved = []
    for factor in factors:
        entry = catalog_entry(config, factor["category"], factor["name"])
        score = entry["score"] if entry else float(factor.get("score") or 0)
        weight = entry["weight"] if entry else float(factor.get("weight") or 0)
        resolved.append({**factor, "score": score, "weight": weight})

    category_scores = {}
    for category in CATEGORIES:
        items = [f for f in resolved if f["category"] == category]
        total_weight = sum(f["weight"] for f in items)
        if not items or total_weight == 0:
            category_scores[category] = 0.0
            continue
        category_scores[category] = (
            sum(f["score"] * f["weight"] for f in items) / total_weight
        )

    weights = config["category_weights"]
    inherent = round(
        sum(category_scores[c] * weights.get(c, 0) for c in CATEGORIES),
        2,
    )

    control_effectiveness = float(control_effectiveness or 0)
    raw_residual = inherent * (1 - control_effectiveness / 100)
    base_floor = get_base_residual_floor(inherent, config)
    triggered = get_triggered_concentration_rules(
        {f["name"] for f in resolved},
        config,
    )
    concentration_floor = max([5] + [rule["floor"] for rule in triggered])
    applied_floor = max(base_floor, concentration_floor)
    residual = round(max(raw_residual, applied_floor), 2)

    return {
        "factors": resolved,
        "category_scores": category_scores,
        "inherent_score": inherent,
        "inherent_rating": get_rating(inherent, config),
        "control_effectiveness": round(control_effectiveness, 2),
        "raw_residual": round(raw_residual, 2),
        "base_floor": base_floor,
        "concentration_floor": concentration_floor,
        "applied_floor": applied_floor,
        "floor_applied": applied_floor > raw_residual,
        "triggered_rules": triggered,
        "residual_score": residual,
        "residual_rating": get_rating(residual, config),
    }


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_config(config: dict, reference: dict | None = None) -> list[str]:
    """Return a list of human-readable problems (empty when valid).

    `reference` (normally the active config) fixes the set of factors: a
    draft may retune factors but cannot add or remove them, because which
    factors exist is decided by the generator code.
    """
    errors = []
    reference = reference or DEFAULT_CONFIG

    weights = config.get("category_weights") or {}
    if set(weights) != set(CATEGORIES):
        errors.append("Category weights must cover exactly the 7 risk categories.")
    else:
        for category, weight in weights.items():
            if not isinstance(weight, (int, float)) or not 0 <= weight <= 1:
                errors.append(f"Weight for {category} must be between 0 and 1.")
        if abs(sum(weights.values()) - 1) > 0.001:
            errors.append(
                f"Category weights must sum to 1.00 (currently "
                f"{sum(weights.values()):.3f})."
            )

    bands = config.get("rating_bands") or []
    if [band.get("rating") for band in bands] != RATINGS:
        errors.append("Rating bands must be LOW, MEDIUM, HIGH, CRITICAL in order.")
    else:
        maxima = [band.get("max") for band in bands]
        if any(not isinstance(m, (int, float)) for m in maxima):
            errors.append("Every rating band needs a numeric upper bound.")
        elif maxima != sorted(maxima) or len(set(maxima)) != len(maxima):
            errors.append("Rating band upper bounds must strictly increase.")
        elif maxima[-1] != 100:
            errors.append("The CRITICAL band must end at 100.")
        elif maxima[0] <= 0:
            errors.append("The LOW band upper bound must be above 0.")

    floors = config.get("base_residual_floors") or []
    if not floors or not any(item.get("min_inherent") == 0 for item in floors):
        errors.append("Base residual floors must include an entry for inherent score 0.")
    for item in floors:
        if not 0 <= float(item.get("floor", -1)) <= 100:
            errors.append("Residual floors must be between 0 and 100.")
            break

    catalog = config.get("factor_catalog") or {}
    reference_catalog = reference.get("factor_catalog") or {}
    known_factors = set()
    for category, factors in reference_catalog.items():
        for name in factors:
            known_factors.add((category, name))
    draft_factors = {
        (category, name)
        for category, factors in catalog.items()
        for name in factors
    }
    if draft_factors != known_factors:
        missing = sorted(f"{c}:{n}" for c, n in known_factors - draft_factors)
        extra = sorted(f"{c}:{n}" for c, n in draft_factors - known_factors)
        if missing:
            errors.append(f"Factor catalog is missing: {', '.join(missing)}.")
        if extra:
            errors.append(
                f"Unknown factors (the generator cannot raise them): {', '.join(extra)}."
            )
    for category, factors in catalog.items():
        for name, entry in factors.items():
            if not 0 <= float(entry.get("score", -1)) <= 100:
                errors.append(f"Score for {category}:{name} must be 0-100.")
            if float(entry.get("weight", -1)) < 0:
                errors.append(f"Weight for {category}:{name} cannot be negative.")

    all_factor_names = {name for _, name in known_factors}
    rule_ids = set()
    for rule in config.get("concentration_rules") or []:
        rule_id = rule.get("id")
        if not rule_id or rule_id in rule_ids:
            errors.append("Every concentration rule needs a unique id.")
        rule_ids.add(rule_id)
        if not rule.get("factors"):
            errors.append(f"Concentration rule {rule_id} needs at least one factor.")
        unknown = [f for f in rule.get("factors") or [] if f not in all_factor_names]
        if unknown:
            errors.append(
                f"Concentration rule {rule_id} references unknown factors: "
                f"{', '.join(unknown)}."
            )
        if not 0 <= float(rule.get("floor", -1)) <= 100:
            errors.append(f"Floor for concentration rule {rule_id} must be 0-100.")

    thresholds = config.get("thresholds") or {}
    for key in ("high_transaction_velocity", "large_customer_population"):
        if float(thresholds.get(key, -1)) <= 0:
            errors.append(f"Threshold {key} must be positive.")

    policy = config.get("override_policy") or {}
    ack = policy.get("acknowledge_downgrade_bands", 0)
    esc = policy.get("escalate_downgrade_bands", 0)
    if not (isinstance(ack, int) and isinstance(esc, int) and 1 <= ack <= esc <= 3):
        errors.append(
            "Override policy: acknowledge bands must be between 1 and the "
            "escalate bands, and escalate bands at most 3."
        )
    if any(r not in RATINGS for r in policy.get("escalate_downgrade_from") or []):
        errors.append("Override policy lists an unknown rating.")

    workflow = config.get("workflow") or {}
    if float(workflow.get("sla_target_hours", 0)) <= 0:
        errors.append("SLA target hours must be positive.")
    if not 1 <= float(workflow.get("at_risk_threshold_pct", 0)) <= 100:
        errors.append("At-risk threshold must be between 1 and 100 percent.")

    return errors
