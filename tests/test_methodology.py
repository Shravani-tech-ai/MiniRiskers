import copy

from risk_engine.methodology import (
    DEFAULT_CONFIG,
    framework_coverage_gaps,
    get_base_residual_floor,
    get_rating,
    rating_band_ranges,
    score_factors,
    validate_config,
)


def cfg():
    return copy.deepcopy(DEFAULT_CONFIG)


def test_default_config_is_valid():
    assert validate_config(cfg()) == []


def test_rating_bands_match_original_engine():
    config = cfg()
    assert get_rating(0, config) == "LOW"
    assert get_rating(25, config) == "LOW"
    assert get_rating(25.01, config) == "MEDIUM"
    assert get_rating(50, config) == "MEDIUM"
    assert get_rating(75, config) == "HIGH"
    assert get_rating(76, config) == "CRITICAL"
    assert [b["min"] for b in rating_band_ranges(config)] == [0, 26, 51, 76]


def test_base_floors():
    config = cfg()
    assert get_base_residual_floor(80, config) == 51
    assert get_base_residual_floor(60, config) == 26
    assert get_base_residual_floor(10, config) == 5


def test_scoring_is_deterministic_and_uses_catalog():
    factors = [
        {"category": "GEOGRAPHY", "name": "High Risk Jurisdiction", "score": 1, "weight": 1},
        {"category": "CUSTOMER", "name": "PEP Exposure"},
    ]
    first = score_factors(factors, 40, cfg())
    second = score_factors(factors, 40, cfg())
    assert first == second
    # Catalog values win over whatever the stored row says.
    assert first["category_scores"]["GEOGRAPHY"] == 95
    assert first["category_scores"]["CUSTOMER"] == 85


def test_controls_never_eliminate_risk():
    factors = [{"category": "GEOGRAPHY", "name": "Sanctions Exposure"}]
    result = score_factors(factors, 100, cfg())
    assert result["raw_residual"] == 0
    # The sanctions concentration rule holds residual at 65 (HIGH).
    assert result["residual_score"] == 65
    assert result["residual_rating"] == "HIGH"
    assert result["floor_applied"] is True


def test_tuned_weights_change_the_score():
    factors = [{"category": "FRAUD", "name": "Rapid Movement Pattern"}]
    base = score_factors(factors, 0, cfg())["inherent_score"]
    tuned = cfg()
    tuned["category_weights"]["FRAUD"] = 0.15
    tuned["category_weights"]["CUSTOMER"] = 0.10
    assert validate_config(tuned) == []
    assert score_factors(factors, 0, tuned)["inherent_score"] > base


def test_validation_rejects_bad_drafts():
    bad = cfg()
    bad["category_weights"]["FRAUD"] = 0.5
    assert any("sum to 1" in e for e in validate_config(bad))

    bad = cfg()
    bad["rating_bands"][1]["max"] = 10
    assert any("strictly increase" in e for e in validate_config(bad))

    bad = cfg()
    del bad["factor_catalog"]["FRAUD"]["Rapid Movement Pattern"]
    assert any("missing" in e for e in validate_config(bad))

    bad = cfg()
    bad["factor_catalog"]["FRAUD"]["Invented Factor"] = {"score": 50, "weight": 1}
    assert any("Unknown factors" in e for e in validate_config(bad))

    bad = cfg()
    bad["concentration_rules"][0]["factors"] = ["Nope"]
    assert any("unknown factors" in e for e in validate_config(bad))


def test_every_category_factor_and_rule_has_a_framework_basis():
    assert framework_coverage_gaps(cfg()) == []
