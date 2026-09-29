import copy

from backend.override_policy import evaluate_override
from risk_engine.methodology import DEFAULT_CONFIG


def cfg():
    return copy.deepcopy(DEFAULT_CONFIG)


def test_accepting_the_system_rating_has_no_consequence():
    result = evaluate_override("HIGH", "HIGH", cfg())
    assert result["direction"] == "NONE"
    assert result["escalation_level"] == "NONE"
    assert result["requires_acknowledgement"] is False


def test_upgrade_goes_straight_through():
    result = evaluate_override("MEDIUM", "CRITICAL", cfg())
    assert result["direction"] == "UPGRADE"
    assert result["band_delta"] == 2
    assert result["escalation_level"] == "NONE"
    assert result["min_reason_chars"] == 0


def test_one_band_downgrade_needs_acknowledgement():
    result = evaluate_override("HIGH", "MEDIUM", cfg())
    assert result["direction"] == "DOWNGRADE"
    assert result["escalation_level"] == "ACKNOWLEDGE"
    assert result["blocks_unconditional_approval"] is False
    assert result["min_reason_chars"] == 40


def test_two_band_downgrade_is_escalated_and_blocks_approval():
    result = evaluate_override("HIGH", "LOW", cfg())
    assert result["escalation_level"] == "ESCALATED"
    assert result["blocks_unconditional_approval"] is True


def test_downgrading_critical_is_always_escalated():
    result = evaluate_override("CRITICAL", "HIGH", cfg())
    assert result["escalation_level"] == "ESCALATED"


def test_going_below_a_concentration_floor_is_escalated():
    # Floor 65 means the rules guarantee at least HIGH.
    result = evaluate_override("HIGH", "MEDIUM", cfg(), concentration_floor=65)
    assert result["escalation_level"] == "ESCALATED"
    assert any("concentration" in reason for reason in result["reasons"])


def test_policy_is_tunable():
    config = cfg()
    config["override_policy"]["escalated_blocks_unconditional_approval"] = False
    config["override_policy"]["escalate_downgrade_bands"] = 3
    result = evaluate_override("HIGH", "LOW", config)
    assert result["escalation_level"] == "ACKNOWLEDGE"
    assert result["blocks_unconditional_approval"] is False
