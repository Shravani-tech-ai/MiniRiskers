# MiniRiskers — Gap Analysis & Improvement Roadmap

This document compares what MiniRiskers does today against the Genius Hacks
Q3 2026 "Risk Assessment Workbench" problem statement and judging rubric, and
lists what we should build or document next, in priority order.

Submission deadline: **9 October 2026** (extended from 30 September).

> **Status update:** these items are now implemented. §3.4 includes the
> tuning UI, versioning and what-if preview. See `ARCHITECTURE.md` §8.
> - §3.1: override consequences
> - §3.2: committee outcomes
> - §3.4: tunable, versioned scoring
> - §3.5: hash-chained audit trail and examiner export
> - §3.7: SLA tracking
> - §5: framework grounding (the categories are mapped in
>   `config/risk_framework.json`)

Items are tagged:

- **P0**: required for submission, or worth a lot of rubric points for little effort
- **P1**: strong differentiator, doable in a short sprint
- **P2**: nice to have if time allows, or mention as "future work" in the deck

---

## 1. What the problem statement asks for (summary)

| Brief requirement | Status in MiniRiskers today |
|---|---|
| One governed platform: intake → assessment → committee decision | ✅ 5-stage workflow, enforced server-side |
| Three user groups (product owner, FCRM analyst, committee) | ✅ plus Auditor and Admin |
| Intake-to-decision in ~2 days (vs 15–20) | ⚠️ Not measured anywhere |
| Every rating traceable to its inputs and reasoning | ⚠️ Partly: factors, evidence and overrides are stored, but there's no single "why this rating" lineage view or snapshot of inputs |
| Modelled, governed data layer the system can reason over | ✅ Rich SQLAlchemy schema; ⚠️ no data dictionary or versioned reference data |
| Scoring parameters and workflow rules tunable by the risk function | ❌ `RiskModelConfig`/`RiskModelWeight` exist, but there's no UI, no versioning, and floor rules are hard-coded in `risk_calculator.py` |
| Immutable audit trail that can be handed to an examiner | ⚠️ `AuditEvent` exists but is mutable (plain table, no tamper evidence) and has no examiner export |
| "System prepares, humans decide" — nothing auto-approved | ✅ AI output is kept separate from analyst and committee decisions |
| Humans can disagree, record why, **and have the consequences handled** | ⚠️ Override reason is mandatory, but nothing *happens* as a result (no escalation, no loop-back) |
| Risk decomposition grounded in published supervisory frameworks | ⚠️ RAG over 9 Indian regulations is good, but the 7 categories aren't explicitly mapped to a named framework |
| Controls mitigate, never eliminate | ✅ Residual floors and concentration floors exist |
| Synthetic data only | ✅ 17 synthetic BRDs in `brds/` |

---

## 2. Required repository deliverables (P0)

The brief asks for a specific repo layout. Most of these folders are missing
or empty today, and several rubric categories are judged mainly on their
contents.

| Required path | Current state | Action |
|---|---|---|
| `/src` | Code lives in `backend/`, `frontend/`, `rag/`, `risk_engine/` | Either move them under `src/`, or (lower risk the day before the deadline) add `src/README.md` explaining the mapping. Don't do a big move right before submission. |
| `/ai` | Prompts are embedded in `backend/assessment_prompt.py`, `intake_service.py`, etc. | Pull the prompt templates out into `ai/prompts/*.md`, add `ai/agents.md` (each AI step: inputs, outputs, model, guardrails), and commit the guidance files used for AI-assisted coding (`CLAUDE.md` etc.). |
| `/docs/requirements` | Missing | Expanded spec: the original brief → our interpretation, assumptions, Indian regulatory context, personas, user stories, acceptance criteria. See §5. |
| `/docs/architecture` | We have `Architecture/` | Rename or copy into `docs/architecture/`, and add diagrams (Mermaid is fine) plus an ADR-style decision log. |
| `/docs/governance` | Missing | Review gates with a rationale for where each one sits. See §4. |
| `/evals` | Missing | Eval definitions, datasets (the `brds/` files plus expected ratings) and results. See §6. |
| `/tests` | Folder exists but is empty | Pytest suite for the risk engine, permissions and the workflow state machine. See §7. |
| `/ops` | Missing | Deployment (Dockerfile / docker-compose), environment config, monitoring and logging approach. See §8. |
| `README.md` | It's a progress diary | Rewrite as setup → demo walkthrough → **decision log**. Move the daily progress notes to `docs/CHANGELOG.md`. |

---

## 3. Product and functional gaps

### 3.1 Make human disagreement have consequences (P0, governance)
Today `analyst-review` sets `final_rating = analyst_rating` and moves the
request straight to `COMMITTEE_REVIEW`, whatever the size of the override.

- **Downgrade guardrail:** if the analyst lowers the rating by 2+ bands, or
  lowers anything the system rated CRITICAL, flag the case as
  `OVERRIDE_ESCALATED`. The committee sees this prominently and must
  acknowledge it explicitly before it can decide.
- **Upgrades** (analyst rates it higher) go through with no extra gate. Being
  conservative is cheap.
- Store the override "delta" so that analytics can show override rates per
  analyst and per category. This is a feedback loop for tuning the model.

### 3.2 Real outcomes for DEFER / REJECT / conditions (P0)
Today every committee decision moves the request to `COMPLETED`.

- `DEFER` → send it back to `REQUEST_CREATED` (or `ANALYST_REVIEW`) with the
  committee's questions attached. Keep a `revision` counter on the request.
- `REJECT` → terminal `REJECTED` state, distinct from approved completion.
- `APPROVE_WITH_CONDITIONS` → each condition becomes a trackable item
  (owner, due date, status) that the Business Owner must mark as met, with
  evidence attached. The request stays `APPROVED_CONDITIONAL` until every
  condition is closed.

### 3.3 Four-eyes and separation of duties (P1)
- The analyst who assessed a request cannot also sit on its committee
  decision, even as ADMIN. Enforce this in `permissions.py`.
- Optional quorum: CRITICAL requests need 2 committee approvals.

### 3.4 Tunable scoring from the UI, with versioning (P0: explicitly in the brief)
- Admin/Risk-function screen to edit category weights, rating band
  thresholds and floor rules. Move the floor rules out of
  `risk_calculator.py` and into the database or a YAML file in `config/`
  (the folder is empty today).
- Every change creates a new **methodology version** (never edit a version in
  place). Each `RiskAssessment` records the version it was scored under;
  `AuditEvent.policy_version` already exists, so populate it.
- **"What-if" re-score:** preview how existing assessments would change
  under a draft methodology before publishing it. This shows the risk
  function the impact of the change, and judges tend to like it.

### 3.5 Tamper-evident, examiner-ready audit trail (P0: explicitly in the brief)
- Hash-chain `AuditEvent`: every row stores `prev_hash` and
  `hash = sha256(prev_hash + canonical_json(row))`. Add a
  `/audit/verify` endpoint that re-walks the chain and reports any break.
- No UPDATE or DELETE on audit rows: block it at the ORM level, plus a
  SQLite trigger that raises on UPDATE/DELETE.
- **Snapshot inputs:** when risk is calculated, store a frozen JSON snapshot
  of every input (intake data, weights version, retrieved evidence IDs,
  prompt version, model name). The rating can then be reproduced later even
  if the intake is edited afterwards.
- **Examiner pack export:** one PDF/ZIP per request containing the timeline,
  every rating (system, AI, analyst, committee), overrides with reasons,
  evidence citations, methodology version and the hash-chain verification
  result.

### 3.6 Traceability view: "Why is this HIGH?" (P1)
A single panel that walks from **rating → category scores → contributing
factors → the intake field that triggered each factor → the regulatory
passage that supports it → control effectiveness → floors applied**. Most
of this data already exists; it needs to be linked together and shown in
one place.

### 3.7 Cycle-time and SLA tracking (P0: this is the headline metric)
- Record stage entry and exit timestamps (already derivable from
  `AuditEvent`; a dedicated `stage_transitions` table is cleaner).
- Analytics tiles: median intake-to-decision time, time per stage, and the
  number of requests breaching a 2-day SLA.
- Seed synthetic historical data so the dashboard can show "2.1 days vs 15–20
  baseline".

### 3.8 Consistency: the core pain point in the brief (P0)
The brief says *identical changes get different ratings from different
analysts*. We should prove we solve this:

- The deterministic engine gives the same score for the same inputs. Add a
  test and an eval that show this (§6).
- **Similar-case lookup:** when a new request comes in, embed its description
  and show the 3 most similar past assessments with their ratings. This
  helps analysts stay consistent and highlights outliers.
- Show the analyst **override-rate analytics** (per analyst, per category) to
  the risk function.

### 3.9 Change types beyond "new product" (P1)
The brief covers new products, **feature changes, process changes, vendor
onboarding, geographic expansion and new customer segments**. Add a
`change_type` field and adapt intake:

- For a change to an existing product, link it to the parent product and
  show a **delta** assessment (what changed in risk compared with the last
  approved assessment).
- For vendor onboarding, lead with the vendor and outsourcing questions (RBI IT
  Outsourcing MD 2023).

### 3.10 Periodic re-assessment and triggers (P2)
Approved products get a review date based on their rating (CRITICAL
every 6 months, HIGH every 12, and so on). Re-assessment is also triggered
when the methodology or a referenced regulation changes.

### 3.11 Smaller functional items
- Assignment workflow for analysts: an assign/claim queue and workload view
  (listed as a known gap in `ARCHITECTURE.md`). P1.
- Notifications for stage changes (in-app is enough). P2.
- Admin user-management screen. P2.

---

## 4. Human-in-the-loop and governance documentation (15% of the score)

Write `docs/governance/review-gates.md`. For **each** gate, state what the AI
or system does, what the human decides, and **why the gate sits exactly
there** (the risk it controls). Suggested gates:

| # | Gate | Who | Why here |
|---|---|---|---|
| G1 | BRD extraction review: BO confirms AI-extracted fields before they're applied | Business Owner | LLM extraction can hallucinate or miss fields; wrong inputs silently corrupt every later score |
| G2 | Intake completeness: can't submit until mandatory fields are filled | System (deterministic) | Garbage-in prevention; cheap to enforce, and no judgement is needed |
| G3 | Analyst review of system + AI rating, with mandatory reason on divergence | Risk Analyst | This is the professional judgement point; the AI is advisory only |
| G4 | Override escalation on large downgrades | Committee | Guards against pressure to under-rate risk, the most harmful error direction |
| G5 | Committee decision | Risk Committee | Accountability for accepting residual risk sits with senior management (RBI governance expectations) |
| G6 | Condition closure: BO provides evidence, analyst verifies | BO + Analyst | Conditional approvals are only safe if the conditions are actually met |
| G7 | Methodology change publication | Risk function (+ second approver) | A weight change re-rates the whole portfolio, so it needs maker-checker |

Also document the **RACI** per stage and the principle *"nothing is approved or
rejected automatically"*, with the code locations that enforce it.

---

## 5. Context engineering and requirement expansion (10%)

Create `docs/requirements/expanded-spec.md`:

- **Original brief → expanded requirements** table (what was stated, what we
  inferred, and why).
- **Research method:** how we chose the 9 Indian regulatory documents, and how
  the brief's US/global framing was adapted to the Indian context (RBI, PMLA,
  FIU-IND, UAPA 51A).
- **Framework grounding:** explicitly map our 7 risk categories to published
  frameworks, e.g. FATF Risk-Based Approach guidance for the banking sector,
  the Wolfsberg FAQs on risk assessments, and the RBI KYC MD risk
  categorisation (Low/Medium/High customer categorisation). Add a table:
  *category → framework clause → our factors*. This directly answers "grounded
  in published supervisory frameworks, not invented".
- **Open questions and assumptions log**: what the brief left ambiguous and
  what we decided.
- Personas and user stories with acceptance criteria.
- Describe **context management for the LLM**: what goes into the assessment
  prompt (structured intake + scores + top-k evidence), what is excluded, how
  much of the context window it uses, and why.

---

## 6. Evaluation framework (10%)

Create `/evals` with:

1. **Golden dataset:** the 17 BRDs in `brds/`, each with an *expected* rating
   band, expected key factors and expected regulations, written by us acting
   as SMEs. Save as `evals/datasets/golden.jsonl`.
2. **Eval suites** (Python scripts that output a JSON/Markdown report):
   - *Scoring accuracy:* engine rating vs expected band (exact match, and
     within ±1 band).
   - *Determinism/consistency:* same input run N times gives an identical
     score; paraphrased BRDs give the same band.
   - *BRD extraction quality:* field-level precision/recall of
     `extract-brd` against hand-labelled fields.
   - *RAG retrieval quality:* hit@k and MRR for expected regulation and page
     per factor.
   - *AI assessment faithfulness:* every regulation the AI cites must exist
     in the retrieved evidence (no invented citations); the AI's rating
     should agree with the engine's, or say why it doesn't.
   - *Edge cases:* `brd-15-minimal-sparse`, `brd-16-contradictory-data` and
     `brd-17-extreme-boundary-values` should produce explicit "insufficient /
     contradictory data" flags rather than confident ratings.
3. **Results** committed in `evals/results/<date>.md`, with a short
   **"failures → fixes"** log (what failed, what we changed, the re-run
   score). The deck needs this "failure handling and iteration" story.
4. Optionally run evals in CI (GitHub Action) on each PR.

---

## 7. Automated tests (part of SDLC and production readiness)

`tests/` is empty. Minimum useful set:

- `test_risk_calculator.py`: band thresholds, weighting, residual floors,
  concentration floors ("controls never eliminate risk").
- `test_permissions.py`: every role × every write endpoint returns
  allowed or 403; Auditor can never write.
- `test_workflow.py`: can't skip stages; committee decision rejected outside
  `COMMITTEE_REVIEW`; override without reason is rejected.
- `test_audit_chain.py`: tampering with a row breaks verification (after
  §3.5).
- Mock Gemini in tests so they run offline and cost nothing.
- Frontend: a handful of Vitest/RTL tests for `rolePermissions.js`.

---

## 8. Production readiness and ops (5%)

Create `/ops`:

- `Dockerfile`(s) and `docker-compose.yml` (backend, frontend, persistent
  volume for Chroma).
- Postgres path documented (SQLAlchemy already abstracts it); explain why
  SQLite is fine for the demo only.
- Structured JSON logging with a request ID; `/health` and `/ready`
  endpoints.
- Security: JWT secret from env (already), CORS locked down, rate-limit the
  auth and LLM endpoints, upload size/type limits on BRD upload, a PII note
  (synthetic data only).
- LLM resilience: timeout, retry and model fallback (already partly there in
  `gemini_service.py`), plus a **graceful-degradation mode** where the
  deterministic score and evidence still work if the LLM is down. The "AI
  where it earns its place" principle then holds even during an outage.
- Monitoring plan: latency, error rate, LLM tokens/cost per request, eval
  score drift.

---

## 9. Token efficiency (5%)

Nothing is measured today. Add:

- An `llm_calls` table (or extra columns on `AuditEvent`): feature
  (extraction / chat / assessment), model, prompt tokens, output tokens,
  latency, cost estimate. Gemini's `usage_metadata` provides the counts.
- An analytics tile: **tokens per assessment** and **which feature consumes the
  most** ("consumption concentration" is a rubric term).
- Optimisations to implement and document:
  - Send structured JSON, not raw BRD text, into the assessment prompt.
  - Cap RAG evidence at top-k per factor and deduplicate passages.
  - Cache the AI assessment by a hash of the inputs, so it isn't regenerated
    unless the inputs change.
  - Route by task: a small/flash model for extraction and chat, a larger
    model only for the final narrative (if needed). Document the choice.
  - Use deterministic code (not the LLM) for scoring, which already costs
    zero tokens. Say so explicitly.

---

## 10. Engineering judgement: deterministic vs probabilistic (5%)

Write `docs/architecture/deterministic-vs-ai.md` with a table:

| Task | Approach | Why |
|---|---|---|
| Risk scoring, floors, bands | Deterministic code | Must be reproducible, explainable and examinable; this is the brief's core consistency problem |
| Workflow and permissions | Deterministic | Governance controls can't be probabilistic |
| Regulatory retrieval | Embeddings (probabilistic), but with citations | Semantic matching over long regulatory text; outputs are verifiable against source pages |
| BRD field extraction | LLM + human confirmation (G1) | Unstructured input; errors are caught at a gate |
| Assessment narrative and analyst questions | LLM | Summarisation is where AI "earns its place"; advisory only |
| Final decision | Human | Required by the brief and by regulation |

---

## 11. AI harness and orchestration (30%, the biggest category)

We have AI features, but the "harness" isn't described as a system yet.

- Document the **pipeline as explicit steps** (a simple orchestrator is
  enough; no framework needed): `extract → validate → score → retrieve →
  draft → self-check → human`. Each step has typed inputs and outputs, a
  retry policy and an audit entry.
- Add a **self-check / critic step**: a second cheap LLM call, or better
  deterministic checks, that verifies the draft's citations exist in the
  retrieved evidence and that its rating doesn't contradict the engine's
  without a stated reason. If a check fails, regenerate once, then flag it for
  the analyst.
- **Prompt versioning:** every prompt in `/ai/prompts` has a version, and
  `AIRecommendation` stores the prompt version and model used.
- **Structured outputs:** enforce JSON schema responses from Gemini
  (response schema) and validate them with Pydantic.
- Document the **human-AI division of work** in a diagram (who does what at
  each stage).
- Put our AI-assisted-coding guidance files (`CLAUDE.md`, any agent or skill
  configs) under `/ai` too. That covers the "instruction design" line of the
  rubric.

---

## 12. SDLC automation story (20%)

The rubric looks for AI use across **requirements, design, development,
testing, deployment and operations**, forming a coherent flow. We should
document (in `docs/sdlc.md` and a deck slide) how AI was used at each stage,
with artefacts as proof:

| Stage | Evidence we have / can create |
|---|---|
| Requirements | AI-assisted expansion of the brief (§5); AI-generated synthetic BRDs (`brds/`, commit `69a7617`) |
| Design | Architecture docs and ADRs drafted with AI and reviewed by us |
| Development | Claude Code / Copilot use; guidance files in `/ai` |
| Testing | AI-generated test cases plus the eval suite (§6, §7) |
| Deployment | AI-authored Dockerfile/CI workflow (§8) |
| Operations | Token/cost monitoring and eval drift dashboard (§9) |

Note: prompt-to-app generators (Lovable, Bolt, v0, Replit Agent) are
prohibited, so say explicitly that we didn't use them.

---

## 13. Suggested order of work (deadline-aware)

1. **Docs and folder skeleton** (fast, high rubric value): `/docs/requirements`,
   `/docs/governance`, `/docs/architecture` (move this file too), `/ai`,
   `/ops`, README decision log.
2. **Tests** for the risk engine, permissions and workflow.
3. **Evals** on the 17 BRDs, with a committed results report.
4. **Audit hash chain + input snapshot + examiner export.**
5. **Token usage logging + analytics tile.**
6. **Override escalation + DEFER/REJECT/conditions loop-back.**
7. **Methodology versioning + tuning UI** (or YAML config plus a versioned
   record if time is short).
8. **Cycle-time dashboard** with seeded historical data.
9. P1/P2 items (similar-case lookup, four-eyes, change types, periodic
   review) as time allows; list the rest as future work in the deck.

---

## 14. Presentation deck checklist

- Brief vs expanded specification
- Harness architecture and orchestration diagram
- AI vs human decision points and review gates (from §4)
- Eval approach and results (from §6)
- Live demo: BRD upload → extraction → score → evidence → AI draft → analyst
  override → committee → examiner export
- Failure handling and what we improved after evals
- Token consumption analysis (from §9)
