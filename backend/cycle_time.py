"""Intake-to-decision cycle time and SLA tracking.

Stage timings are derived from the audit trail (the single source of truth
for when things happened), so no extra bookkeeping is needed in the
workflow endpoints and history recorded before this module existed is
measured too.

The SLA clock starts when the Business Owner submits the request and stops
at the committee's final decision (APPROVE, APPROVE_WITH_CONDITIONS or
REJECT). A deferral back to the Business Owner pauses the clock until they
resubmit, when `pause_clock_when_returned` is set; a deferral back to the
analyst keeps it running because the bank still owns the work.
"""

from datetime import datetime

# Stage keys used for timing, in workflow order.
TIMED_STAGES = [
    "AWAITING_ANALYST",
    "RISK_ASSESSMENT",
    "ANALYST_REVIEW",
    "COMMITTEE_REVIEW",
]
STAGE_LABELS = {
    "AWAITING_ANALYST": "Awaiting analyst",
    "RISK_ASSESSMENT": "Risk assessment",
    "ANALYST_REVIEW": "Analyst review",
    "COMMITTEE_REVIEW": "Committee review",
    "WITH_BUSINESS_OWNER": "Returned to business owner",
}
FINAL_DECISIONS = {"APPROVE", "APPROVE_WITH_CONDITIONS", "REJECT"}

# Workflow stage values written to the audit trail -> timing stage.
_STAGE_MAP = {
    "RISK_ASSESSMENT": "RISK_ASSESSMENT",
    "REGULATORY_EVIDENCE": "RISK_ASSESSMENT",
    "AI_ASSESSMENT": "RISK_ASSESSMENT",
    "ANALYST_REVIEW": "ANALYST_REVIEW",
    "COMMITTEE_REVIEW": "COMMITTEE_REVIEW",
}


def _hours(start: datetime, end: datetime) -> float:
    return max((end - start).total_seconds() / 3600, 0.0)


def compute_cycle_time(events: list, config: dict, now: datetime | None = None) -> dict:
    """Timeline for one request from its audit events (oldest first).

    Each event needs `action`, `new_value` and `created_at` attributes.
    """
    now = now or datetime.utcnow()
    workflow = config["workflow"]
    target = float(workflow["sla_target_hours"])
    at_risk_pct = float(workflow["at_risk_threshold_pct"])
    stage_targets = workflow.get("stage_targets_hours") or {}
    pause_when_returned = workflow.get("pause_clock_when_returned", True)

    created_at = None
    first_submitted_at = None
    decided_at = None
    final_decision = None
    deferrals = 0

    stage_hours = {stage: 0.0 for stage in TIMED_STAGES}
    returned_hours = 0.0
    current = None          # timing stage the request is in right now
    current_since = None

    def close_current(at: datetime):
        nonlocal returned_hours
        if current is None or current_since is None:
            return
        spent = _hours(current_since, at)
        if current == "WITH_BUSINESS_OWNER":
            returned_hours += spent
        else:
            stage_hours[current] += spent

    for event in events:
        at = event.created_at
        if at is None:
            continue
        action = event.action

        if action == "CREATED_CHANGE_REQUEST":
            created_at = created_at or at
        elif action == "CHANGE_REQUEST_SUBMITTED":
            first_submitted_at = first_submitted_at or at
            close_current(at)
            current, current_since = "AWAITING_ANALYST", at
        elif action == "WORKFLOW_STAGE_CHANGED":
            value = (event.new_value or "").upper()
            if value in _STAGE_MAP and current is None and first_submitted_at is None:
                # Legacy request created before explicit submission existed:
                # treat creation as the hand-off to the analyst.
                first_submitted_at = created_at or at
                current, current_since = "AWAITING_ANALYST", first_submitted_at
            if value in _STAGE_MAP and current is not None:
                target_stage = _STAGE_MAP[value]
                if target_stage != current:
                    close_current(at)
                    current, current_since = target_stage, at
            elif value == "REQUEST_CREATED" and current is not None:
                # Deferred back to the Business Owner.
                close_current(at)
                current, current_since = "WITH_BUSINESS_OWNER", at
            elif value == "COMPLETED" and current is not None:
                close_current(at)
                current, current_since = None, None
        elif action == "COMMITTEE_DECISION":
            decision = (event.new_value or "").upper()
            if decision == "DEFER":
                deferrals += 1
            elif decision in FINAL_DECISIONS:
                decided_at = at
                final_decision = decision

    if current is not None and decided_at is None:
        close_current(now)
        in_progress_stage = current
    else:
        in_progress_stage = None

    end = decided_at or now
    elapsed_hours = _hours(first_submitted_at, end) if first_submitted_at else None
    if elapsed_hours is not None and pause_when_returned:
        sla_hours = max(elapsed_hours - returned_hours, 0.0)
    else:
        sla_hours = elapsed_hours

    if first_submitted_at is None:
        sla_status = "NOT_STARTED"
    elif sla_hours > target:
        sla_status = "BREACHED" if decided_at is None else "MISSED"
    elif decided_at is not None:
        sla_status = "MET"
    elif in_progress_stage == "WITH_BUSINESS_OWNER" and pause_when_returned:
        sla_status = "PAUSED"
    elif sla_hours >= target * at_risk_pct / 100:
        sla_status = "AT_RISK"
    else:
        sla_status = "ON_TRACK"

    stages = []
    for stage in TIMED_STAGES:
        stage_target = stage_targets.get(stage)
        hours = round(stage_hours[stage], 2)
        stages.append({
            "stage": stage,
            "label": STAGE_LABELS[stage],
            "hours": hours,
            "target_hours": stage_target,
            "over_target": bool(stage_target and hours > stage_target),
            "in_progress": in_progress_stage == stage,
        })

    return {
        "created_at": created_at.isoformat() if created_at else None,
        "submitted_at": first_submitted_at.isoformat() if first_submitted_at else None,
        "decided_at": decided_at.isoformat() if decided_at else None,
        "final_decision": final_decision,
        "elapsed_hours": round(elapsed_hours, 2) if elapsed_hours is not None else None,
        "sla_hours": round(sla_hours, 2) if sla_hours is not None else None,
        "paused_hours": round(returned_hours, 2),
        "sla_target_hours": target,
        "sla_remaining_hours": (
            round(target - sla_hours, 2)
            if sla_hours is not None and decided_at is None
            else None
        ),
        "sla_used_pct": (
            round(sla_hours / target * 100, 1) if sla_hours is not None else None
        ),
        "sla_status": sla_status,
        "deferrals": deferrals,
        "current_stage": in_progress_stage,
        "current_stage_label": STAGE_LABELS.get(in_progress_stage),
        "stages": stages,
    }


def _percentile(values: list[float], pct: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * pct / 100
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = index - lower
    return round(ordered[lower] + (ordered[upper] - ordered[lower]) * fraction, 2)


def summarize_portfolio(timelines: list[dict], config: dict) -> dict:
    """Aggregate per-request timelines into portfolio SLA metrics."""
    target = float(config["workflow"]["sla_target_hours"])
    decided = [t for t in timelines if t["decided_at"]]
    open_ = [
        t for t in timelines
        if t["submitted_at"] and not t["decided_at"]
    ]
    decided_hours = [t["sla_hours"] for t in decided if t["sla_hours"] is not None]

    stage_averages = []
    for stage in TIMED_STAGES:
        values = [
            s["hours"]
            for t in decided
            for s in t["stages"]
            if s["stage"] == stage
        ]
        stage_averages.append({
            "stage": stage,
            "label": STAGE_LABELS[stage],
            "avg_hours": round(sum(values) / len(values), 2) if values else None,
            "target_hours": (config["workflow"].get("stage_targets_hours") or {}).get(stage),
        })

    met = sum(1 for t in decided if t["sla_status"] == "MET")
    return {
        "sla_target_hours": target,
        "decided_count": len(decided),
        "open_count": len(open_),
        "median_hours": _percentile(decided_hours, 50),
        "p90_hours": _percentile(decided_hours, 90),
        "within_sla_pct": round(met / len(decided) * 100, 1) if decided else None,
        "open_by_status": {
            status: sum(1 for t in open_ if t["sla_status"] == status)
            for status in ("ON_TRACK", "AT_RISK", "BREACHED", "PAUSED")
        },
        "requests_with_deferrals": sum(1 for t in timelines if t["deferrals"]),
        "stage_averages": stage_averages,
    }
