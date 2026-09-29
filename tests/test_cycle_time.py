import copy
from datetime import datetime, timedelta
from types import SimpleNamespace

from backend.cycle_time import compute_cycle_time, summarize_portfolio
from risk_engine.methodology import DEFAULT_CONFIG

T0 = datetime(2026, 10, 1, 9, 0, 0)


def ev(hours, action, new_value=None):
    return SimpleNamespace(
        created_at=T0 + timedelta(hours=hours),
        action=action,
        new_value=new_value,
    )


def cfg():
    return copy.deepcopy(DEFAULT_CONFIG)


HAPPY_PATH = [
    ev(-5, "CREATED_CHANGE_REQUEST"),
    ev(0, "CHANGE_REQUEST_SUBMITTED"),
    ev(4, "WORKFLOW_STAGE_CHANGED", "RISK_ASSESSMENT"),
    ev(6, "WORKFLOW_STAGE_CHANGED", "ANALYST_REVIEW"),
    ev(16, "WORKFLOW_STAGE_CHANGED", "COMMITTEE_REVIEW"),
    ev(30, "COMMITTEE_DECISION", "APPROVE"),
    ev(30, "WORKFLOW_STAGE_CHANGED", "COMPLETED"),
]


def test_decided_within_sla():
    result = compute_cycle_time(HAPPY_PATH, cfg())
    assert result["sla_hours"] == 30
    assert result["sla_status"] == "MET"
    hours = {s["stage"]: s["hours"] for s in result["stages"]}
    assert hours == {
        "AWAITING_ANALYST": 4,
        "RISK_ASSESSMENT": 2,
        "ANALYST_REVIEW": 10,
        "COMMITTEE_REVIEW": 14,
    }


def test_open_request_runs_the_clock():
    events = HAPPY_PATH[:4]
    result = compute_cycle_time(events, cfg(), now=T0 + timedelta(hours=40))
    assert result["decided_at"] is None
    assert result["sla_status"] == "AT_RISK"  # 40h of 48h >= 75%
    assert result["current_stage"] == "ANALYST_REVIEW"
    assert result["sla_remaining_hours"] == 8

    late = compute_cycle_time(events, cfg(), now=T0 + timedelta(hours=60))
    assert late["sla_status"] == "BREACHED"


def test_deferral_to_business_owner_pauses_the_clock():
    events = [
        ev(0, "CHANGE_REQUEST_SUBMITTED"),
        ev(2, "WORKFLOW_STAGE_CHANGED", "RISK_ASSESSMENT"),
        ev(3, "WORKFLOW_STAGE_CHANGED", "ANALYST_REVIEW"),
        ev(5, "WORKFLOW_STAGE_CHANGED", "COMMITTEE_REVIEW"),
        ev(10, "COMMITTEE_DECISION", "DEFER"),
        ev(10, "WORKFLOW_STAGE_CHANGED", "REQUEST_CREATED"),
        ev(110, "CHANGE_REQUEST_SUBMITTED"),  # 100h with the business
        ev(112, "WORKFLOW_STAGE_CHANGED", "RISK_ASSESSMENT"),
        ev(113, "WORKFLOW_STAGE_CHANGED", "ANALYST_REVIEW"),
        ev(115, "WORKFLOW_STAGE_CHANGED", "COMMITTEE_REVIEW"),
        ev(120, "COMMITTEE_DECISION", "APPROVE"),
    ]
    result = compute_cycle_time(events, cfg())
    assert result["elapsed_hours"] == 120
    assert result["paused_hours"] == 100
    assert result["sla_hours"] == 20
    assert result["deferrals"] == 1
    assert result["sla_status"] == "MET"


def test_open_request_with_business_owner_is_paused():
    events = [
        ev(0, "CHANGE_REQUEST_SUBMITTED"),
        ev(2, "WORKFLOW_STAGE_CHANGED", "RISK_ASSESSMENT"),
        ev(4, "COMMITTEE_DECISION", "DEFER"),
        ev(4, "WORKFLOW_STAGE_CHANGED", "REQUEST_CREATED"),
    ]
    result = compute_cycle_time(events, cfg(), now=T0 + timedelta(hours=200))
    assert result["sla_status"] == "PAUSED"
    assert result["sla_hours"] == 4


def test_missed_sla_when_decided_late():
    events = [
        ev(0, "CHANGE_REQUEST_SUBMITTED"),
        ev(60, "COMMITTEE_DECISION", "REJECT"),
    ]
    assert compute_cycle_time(events, cfg())["sla_status"] == "MISSED"


def test_portfolio_summary():
    met = compute_cycle_time(HAPPY_PATH, cfg())
    missed = compute_cycle_time(
        [ev(0, "CHANGE_REQUEST_SUBMITTED"), ev(60, "COMMITTEE_DECISION", "APPROVE")],
        cfg(),
    )
    summary = summarize_portfolio([met, missed], cfg())
    assert summary["decided_count"] == 2
    assert summary["within_sla_pct"] == 50.0
    assert summary["median_hours"] == 45.0
