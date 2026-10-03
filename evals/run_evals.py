#!/usr/bin/env python3
"""Run MiniRiskers evaluation suites and write a Markdown report.

Usage (from repo root):
    python evals/run_evals.py

No network or Gemini API required — scoring evals use the deterministic engine.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend.brd_heuristic import extract_intake_heuristic  # noqa: E402
from risk_engine.methodology import DEFAULT_CONFIG, score_factors  # noqa: E402

GOLDEN_PATH = Path(__file__).parent / "datasets" / "golden.jsonl"
RESULTS_DIR = Path(__file__).parent / "results"
CONTROL_EFFECTIVENESS = 40.0  # representative mid-strength controls


def load_golden() -> list[dict]:
    entries = []
    for line in GOLDEN_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            entries.append(json.loads(line))
    return entries


def rating_index(rating: str | None) -> int:
    order = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    if rating not in order:
        return -1
    return order.index(rating)


def within_one_band(expected: str, actual: str) -> bool:
    return abs(rating_index(expected) - rating_index(actual)) <= 1


def run_scoring_eval(entries: list[dict]) -> list[dict]:
    results = []
    for entry in entries:
        if entry.get("edge_case") or not entry.get("expected_inherent_band"):
            continue
        factors = entry.get("factor_seeds") or []
        first = score_factors(factors, CONTROL_EFFECTIVENESS, DEFAULT_CONFIG)
        second = score_factors(factors, CONTROL_EFFECTIVENESS, DEFAULT_CONFIG)
        exact_match = first["inherent_rating"] == entry["expected_inherent_band"]
        relaxed_match = within_one_band(
            entry["expected_inherent_band"],
            first["inherent_rating"],
        )
        deterministic = (
            first["inherent_score"] == second["inherent_score"]
            and first["inherent_rating"] == second["inherent_rating"]
        )
        results.append(
            {
                "id": entry["id"],
                "title": entry["title"],
                "expected": entry["expected_inherent_band"],
                "actual": first["inherent_rating"],
                "inherent_score": first["inherent_score"],
                "residual_rating": first["residual_rating"],
                "exact_match": exact_match,
                "within_one_band": relaxed_match,
                "deterministic": deterministic,
                "triggered_rules": [r["id"] for r in first["triggered_rules"]],
            }
        )
    return results


def run_edge_case_eval(entries: list[dict]) -> list[dict]:
    results = []
    for entry in entries:
        if not entry.get("edge_case"):
            continue
        brd_path = ROOT / entry["brd_file"]
        text = brd_path.read_text(encoding="utf-8") if brd_path.exists() else ""
        extracted = extract_intake_heuristic(text)
        has_data = any(extracted.get(section) for section in extracted if section != "provenance_notes")
        results.append(
            {
                "id": entry["id"],
                "edge_case": entry["edge_case"],
                "heuristic_extracted_fields": has_data,
                "expected_behavior": entry["notes"],
            }
        )
    return results


def run_determinism_stress() -> dict:
    factors = [
        {"category": "GEOGRAPHY", "name": "Sanctions Exposure"},
        {"category": "TRANSACTION", "name": "Cross Border Transactions"},
    ]
    runs = [
        score_factors(factors, CONTROL_EFFECTIVENESS, DEFAULT_CONFIG)["inherent_score"]
        for _ in range(5)
    ]
    return {
        "runs": runs,
        "all_identical": len(set(runs)) == 1,
    }


def write_report(
    scoring: list[dict],
    edge_cases: list[dict],
    determinism: dict,
) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = RESULTS_DIR / f"{date.today().isoformat()}.md"

    exact_pass = sum(1 for row in scoring if row["exact_match"])
    relaxed_pass = sum(1 for row in scoring if row["within_one_band"])
    det_pass = sum(1 for row in scoring if row["deterministic"])

    lines = [
        f"# MiniRiskers Eval Results — {date.today().isoformat()}",
        "",
        "## Summary",
        "",
        f"| Suite | Pass | Total |",
        f"|---|---|---|",
        f"| Scoring accuracy (exact band) | {exact_pass} | {len(scoring)} |",
        f"| Scoring accuracy (±1 band) | {relaxed_pass} | {len(scoring)} |",
        f"| Per-case determinism | {det_pass} | {len(scoring)} |",
        f"| Determinism stress (5 runs) | {'PASS' if determinism['all_identical'] else 'FAIL'} | 1 |",
        "",
        "## Scoring accuracy",
        "",
        "Representative factor seeds per BRD (SME-labelled in `evals/datasets/golden.jsonl`),",
        "scored under methodology v1.0 with 40% control effectiveness.",
        "",
        "| ID | Title | Expected | Actual | Score | Exact | ±1 band | Rules triggered |",
        "|---|---|---|---|---|---|---|---|",
    ]

    for row in scoring:
        lines.append(
            f"| {row['id']} | {row['title']} | {row['expected']} | {row['actual']} | "
            f"{row['inherent_score']} | {'✅' if row['exact_match'] else '❌'} | "
            f"{'✅' if row['within_one_band'] else '❌'} | "
            f"{', '.join(row['triggered_rules']) or '—'} |"
        )

    lines.extend(
        [
            "",
            "## Edge cases",
            "",
            "| ID | Case | Heuristic extracted data? | Expected behavior |",
            "|---|---|---|---|",
        ]
    )
    for row in edge_cases:
        lines.append(
            f"| {row['id']} | {row['edge_case']} | "
            f"{'yes' if row['heuristic_extracted_fields'] else 'no'} | "
            f"{row['expected_behavior']} |"
        )

    failures = [row for row in scoring if not row["exact_match"]]
    if failures:
        lines.extend(
            [
                "",
                "## Failures → actions",
                "",
            ]
        )
        for row in failures:
            lines.append(
                f"- **{row['id']}**: expected {row['expected']}, got {row['actual']} "
                f"(score {row['inherent_score']}). "
                f"Review factor seeds or methodology weights in `/methodology`."
            )
    else:
        lines.extend(["", "## Failures → actions", "", "No exact-match failures in this run."])

    lines.extend(
        [
            "",
            "## Determinism stress",
            "",
            f"Five consecutive runs on the same factor set: `{determinism['runs']}`",
            "",
            "---",
            "",
            "Generated by `evals/run_evals.py`. Re-run after any methodology change.",
        ]
    )

    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


def main() -> int:
    entries = load_golden()
    scoring = run_scoring_eval(entries)
    edge_cases = run_edge_case_eval(entries)
    determinism = run_determinism_stress()
    report_path = write_report(scoring, edge_cases, determinism)

    exact_pass = sum(1 for row in scoring if row["exact_match"])
    print(f"Scoring exact match: {exact_pass}/{len(scoring)}")
    print(f"Determinism stress: {'PASS' if determinism['all_identical'] else 'FAIL'}")
    print(f"Report written to {report_path}")
    return 0 if exact_pass == len(scoring) and determinism["all_identical"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
