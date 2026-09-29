"""Consequences of an analyst disagreeing with the system rating.

The analyst may always set a different rating, but a downgrade (rating the
request as less risky than the deterministic engine did) is the error with
the worst consequences, so the methodology's override policy decides what
it triggers:

- UPGRADE (more conservative) goes straight through.
- A downgrade of `acknowledge_downgrade_bands` needs the committee to
  explicitly acknowledge the override before it can decide.
- A downgrade of `escalate_downgrade_bands` or more, a downgrade away from
  a rating listed in `escalate_downgrade_from`, or a rating below the band
  a triggered concentration floor guarantees is ESCALATED: the committee
  must acknowledge it and (by default) cannot approve without conditions.
"""

from risk_engine.methodology import RATINGS, get_rating

LEVEL_NONE = "NONE"
LEVEL_ACKNOWLEDGE = "ACKNOWLEDGE"
LEVEL_ESCALATED = "ESCALATED"


def _rank(rating: str) -> int:
    return RATINGS.index(rating) if rating in RATINGS else -1


def evaluate_override(
    system_rating: str,
    analyst_rating: str,
    config: dict,
    concentration_floor: float | None = None,
) -> dict:
    policy = config["override_policy"]
    delta = _rank(analyst_rating) - _rank(system_rating)

    if delta == 0:
        direction = "NONE"
    elif delta > 0:
        direction = "UPGRADE"
    else:
        direction = "DOWNGRADE"

    level = LEVEL_NONE
    reasons = []

    if direction == "DOWNGRADE":
        bands = abs(delta)
        if bands >= policy["acknowledge_downgrade_bands"]:
            level = LEVEL_ACKNOWLEDGE
            reasons.append(
                f"Rating lowered by {bands} band{'s' if bands > 1 else ''} "
                f"({system_rating} → {analyst_rating})."
            )
        if bands >= policy["escalate_downgrade_bands"]:
            level = LEVEL_ESCALATED
            reasons.append(
                f"Downgrade of {bands} bands meets the escalation threshold "
                f"of {policy['escalate_downgrade_bands']}."
            )
        if system_rating in (policy.get("escalate_downgrade_from") or []):
            level = LEVEL_ESCALATED
            reasons.append(
                f"The system rated this request {system_rating}; lowering a "
                f"{system_rating} rating is always escalated."
            )
        if (
            policy.get("escalate_below_concentration_floor")
            and concentration_floor
            and concentration_floor > 5
        ):
            floor_rating = get_rating(concentration_floor, config)
            if _rank(analyst_rating) < _rank(floor_rating):
                level = LEVEL_ESCALATED
                reasons.append(
                    f"A risk concentration rule holds residual risk at "
                    f"{concentration_floor} or above ({floor_rating}); the "
                    f"analyst rating goes below that floor."
                )

    min_reason = (
        policy.get("min_reason_chars_downgrade", 0)
        if direction == "DOWNGRADE"
        else 0
    )
    blocks_approval = bool(
        level == LEVEL_ESCALATED
        and policy.get("escalated_blocks_unconditional_approval")
    )

    consequences = []
    if direction == "UPGRADE":
        consequences.append(
            "Conservative override: the higher rating becomes the final "
            "rating and is shown to the committee."
        )
    if level == LEVEL_ACKNOWLEDGE:
        consequences.append(
            "The committee must explicitly acknowledge this override, with "
            "a note, before it can record a decision."
        )
    if level == LEVEL_ESCALATED:
        consequences.append(
            "Escalated to the committee: it must acknowledge the override "
            "with a note before deciding."
        )
        if blocks_approval:
            consequences.append(
                "The committee cannot give an unconditional approval; it "
                "must approve with conditions, defer or reject."
            )
    if min_reason:
        consequences.append(
            f"The override reason must be at least {min_reason} characters."
        )

    return {
        "system_rating": system_rating,
        "analyst_rating": analyst_rating,
        "direction": direction,
        "band_delta": delta,
        "escalation_level": level,
        "reasons": reasons,
        "consequences": consequences,
        "requires_acknowledgement": level != LEVEL_NONE,
        "blocks_unconditional_approval": blocks_approval,
        "min_reason_chars": min_reason,
    }
