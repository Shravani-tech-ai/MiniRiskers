# MiniRiskers — Human-in-the-Loop Review Gates

**Principle:** *Nothing is approved or rejected automatically.*  
The system calculates, retrieves evidence, and drafts; humans decide at every material judgement point.

---

## Gate summary

| Gate | Name | Actor | Enforced in code |
|---|---|---|---|
| G1 | BRD extraction confirmation | Business Owner | `POST .../apply-extraction`; intake not auto-saved |
| G2 | Intake completeness | System | `completeness_percent()` + submit blocked if incomplete |
| G3 | Analyst review | Risk Analyst | `POST .../analyst-review`; mandatory override reason |
| G4 | Override escalation | Committee | `evaluate_override()` + committee UI acknowledgement |
| G5 | Committee decision | Risk Committee | `POST .../committee-decision`; stage gate |
| G6 | Condition closure | BO + Analyst | `ApprovalCondition` workflow + verify endpoint |
| G7 | Methodology publication | Risk function | Maker-checker on `MethodologyVersion` lifecycle |

---

## G1 — BRD extraction review

**What the AI/system does:** Gemini (or heuristic fallback) extracts structured intake fields from uploaded BRD text.

**What the human decides:** Business Owner reviews extracted JSON and explicitly applies it to the request.

**Why here:** LLM extraction can hallucinate or miss fields. Wrong intake silently corrupts every later score. This is the cheapest place to catch structured-data errors.

**Code locations:**
- `backend/intake_service.py` — `extract_intake_from_brd()`, `build_brd_extraction_prompt()`
- `backend/main.py` — `POST /change-requests/{id}/intake/extract-brd`, `POST .../apply-extraction`
- `frontend/src/components/assessment/IntakePanel.jsx` — extract preview + apply button
- `ai/prompts/brd-extraction.md` — prompt template

**Audit:** `BRD_EXTRACTED`, `BRD_EXTRACTION_APPLIED` events

---

## G2 — Intake completeness

**What the system does:** Validates mandatory fields across product, customer, geography, transaction, channel, vendor sections before submission.

**What the human decides:** Business Owner fills missing fields; cannot submit until 100% complete.

**Why here:** Garbage-in prevention. No professional judgement required — deterministic validation.

**Code locations:**
- `backend/intake_service.py` — `completeness_percent()`, `compute_missing_fields()`
- `backend/main.py` — submit endpoint checks completeness
- `frontend/src/components/assessment/IntakePanel.jsx` — progress indicator

---

## G3 — Analyst review of system + AI rating

**What the system does:** Deterministic risk engine produces inherent/residual scores; RAG retrieves regulatory evidence; Gemini drafts advisory assessment (`REQUIRES_FCRM_REVIEW`).

**What the human decides:** Risk Analyst accepts or overrides the rating with a written reason.

**Why here:** This is the professional judgement point required by RBI/FATF risk-based approach. AI is advisory only.

**Code locations:**
- `risk_engine/risk_calculator.py`, `risk_engine/risk_factor_generator.py`
- `backend/assessment_service.py`, `backend/gemini_service.py`
- `backend/main.py` — `POST .../analyst-review`
- `backend/override_policy.py` — consequence classification
- `frontend/src/components/assessment/AnalystReview.jsx`

**Storage separation:** `RiskAssessment` (system) · `AIRecommendation` (AI) · `AnalystOverride` (human)

---

## G4 — Override escalation on large downgrades

**What the system does:** Classifies override direction and band delta; flags `ACKNOWLEDGE` or `ESCALATED`; blocks unconditional approval on escalated cases.

**What the human decides:** Committee must explicitly acknowledge override with a note before deciding.

**Why here:** Under-rating risk is the most harmful error direction (regulatory and reputational). Escalation makes pressure visible.

**Code locations:**
- `backend/override_policy.py` — `evaluate_override()`
- `backend/main.py` — analyst review + committee decision validation
- `frontend/src/components/assessment/CommitteeDecision.jsx` — `OverridePanel`
- `tests/test_override_policy.py`, `tests/test_governance_workflow.py`

**Thresholds:** Tunable in methodology `override_policy` (default: ≥2 band downgrade or any CRITICAL downgrade → escalated)

---

## G5 — Committee decision

**What the system does:** Presents system rating, AI draft, analyst override, regulatory evidence, similar cases, and escalation flags.

**What the human decides:** Approve · Approve with conditions · Defer · Reject — with rationale.

**Why here:** Accountability for accepting residual risk sits with senior management (RBI governance expectations).

**Code locations:**
- `backend/main.py` — `POST .../committee-decision`
- `backend/permissions.py` — `assert_workflow_stage(..., COMMITTEE_REVIEW)`
- `frontend/src/components/assessment/CommitteeDecision.jsx`

**Outcomes:** `APPROVE` · `APPROVE_WITH_CONDITIONS` · `DEFER` (reopens intake or analyst) · `REJECT` (terminal)

---

## G6 — Condition closure

**What the system does:** Creates trackable `ApprovalCondition` records with due dates when committee approves with conditions.

**What the human decides:** Business Owner submits evidence; Risk Analyst verifies (not the same person who submitted).

**Why here:** Conditional approvals are only safe if conditions are actually met before the change goes live.

**Code locations:**
- `backend/governance_routes.py` — condition submit/verify endpoints
- `backend/models.py` — `ApprovalCondition`
- `frontend/src/components/assessment/ConditionsTracker.jsx`

---

## G7 — Methodology change publication

**What the system does:** Validates draft config (weights sum to 1, bands ordered); runs what-if impact on portfolio.

**What the human decides:** Risk Analyst proposes; Risk Committee approves. Proposer cannot approve own draft (maker-checker).

**Why here:** A weight change affects the entire portfolio — equivalent to a model change requiring governance.

**Code locations:**
- `backend/methodology_store.py`, `backend/governance_routes.py`
- `risk_engine/methodology.py` — `validate_config()`, `score_factors()`
- `frontend/src/pages/Methodology.jsx`

**Lifecycle:** DRAFT → PENDING_APPROVAL → ACTIVE → RETIRED

---

## RACI matrix

| Stage | Business Owner | Risk Analyst | Risk Committee | Auditor | System/AI |
|---|---|---|---|---|---|
| Create request | **R/A** | I | I | I | — |
| BRD extract apply (G1) | **A** | I | I | I | **R** (extract) |
| Submit intake (G2) | **R/A** | I | I | I | **R** (validate) |
| Run risk pipeline | I | **R/A** | I | I | **R** (score, RAG) |
| AI assessment draft | I | I | I | I | **R** (Gemini) |
| Analyst review (G3) | I | **R/A** | I | I | C (scores) |
| Override escalation (G4) | I | R | **A** | I | **R** (classify) |
| Committee decision (G5) | I | C | **R/A** | I | — |
| Condition evidence (G6) | **R** | **A** (verify) | I | I | — |
| Methodology change (G7) | I | **R** | **A** | I | **R** (validate) |
| Examiner export | I | I | I | **R/A** | **R** (pack) |

*R = Responsible, A = Accountable, C = Consulted, I = Informed*

---

## Enforcement: nothing auto-approved

| Check | Mechanism |
|---|---|
| AI cannot approve | Prompt fixes `recommendation: REQUIRES_FCRM_REVIEW`; no approve endpoint for AI |
| Analyst cannot skip to committee without review | `assert_workflow_stage` |
| Committee cannot decide before analyst stage | Stage gate on committee endpoint |
| Auditor cannot write | `assert_not_auditor_write()` on all mutations |
| Methodology proposer ≠ approver | Checked in `governance_routes.py` submit/approve handlers |

**Code:** `backend/permissions.py` — central gatekeeper; frontend mirrors for UX only.

---

## Related documents

- `docs/requirements/expanded-spec.md` — personas and acceptance criteria
- `Architecture/ARCHITECTURE.md` §8 — governance features
- `ai/agents.md` — AI vs human division
