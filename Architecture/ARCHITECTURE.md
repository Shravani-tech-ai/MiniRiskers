# MiniRiskers — Architecture Overview

MiniRiskers is a workbench that helps a bank assess the financial-crime risk
of a new product or a change to an existing one. A business user describes
the change, the system runs a risk calculation and pulls in relevant Indian
banking regulations, an AI model drafts an assessment, a human analyst
reviews it, and a committee makes the final call. Every step is logged for
audit purposes.

This document explains what exists today, how the pieces fit together, and
who is allowed to do what.

---

## 1. The big picture

```
 React frontend  ───HTTP (JWT bearer token)───▶  FastAPI backend  ───▶  SQLite database
 (Vite, React Router)                            (backend/main.py)        (miniriskers.db)
                                                        │
                                                        ├──▶ risk_engine/   (scoring logic)
                                                        └──▶ rag/           (regulatory search over ChromaDB)
                                                        └──▶ gemini_service (AI-drafted assessment)
```

- **Frontend** (`frontend/`) — a single-page React app. Handles login/signup,
  dashboards, and the multi-stage assessment screen.
- **Backend** (`backend/`) — a FastAPI app that owns all business logic:
  authentication, change requests, risk scoring, regulatory evidence, AI
  assessment, analyst review, committee decisions, exports, and audit
  logging.
- **Risk engine** (`risk_engine/`) — pure calculation code that turns
  structured product/customer/transaction data into risk factors and a
  final risk score.
- **RAG pipeline** (`rag/`) — searches a vector database of 9 Indian
  regulatory documents (RBI master directions, PMLA, FIU-IND, etc.) to find
  the specific rules that justify a risk factor.
- **Database** — SQLite (`miniriskers.db`), accessed through SQLAlchemy
  models in `backend/models.py`.

---

## 2. The assessment workflow

Every "change request" (a new product or a change to one) moves through five
stages, in order:

```
1. REQUEST_CREATED   → Business Owner fills in the details of the request
2. RISK_ASSESSMENT    → System calculates risk + pulls regulatory evidence + AI drafts an assessment
3. ANALYST_REVIEW     → A Risk Analyst reviews/overrides the AI's rating
4. COMMITTEE_REVIEW   → A Risk Committee makes the final approve/reject decision
5. COMPLETED          → Done — decision is recorded, request is closed
```

A request can only move forward, never skip a stage. The backend enforces
this (`assert_workflow_stage` in `backend/permissions.py`) — for example, a
committee decision is rejected with an error if the request hasn't reached
`COMMITTEE_REVIEW` yet.

### What happens at each stage

| Stage | What's captured |
|---|---|
| Request Created | Title, description, product type, business unit, customer segment, and structured details: product, customer profile, geography, transaction profile, channels, third-party vendors, and existing controls. |
| Risk Assessment | The risk engine scores 7 categories (customer, product, geography, transaction, channel, third-party, fraud), combines them into an **inherent risk** score, adjusts for how effective the bank's controls are to get a **residual risk** score, and looks up supporting regulatory text for each risk factor. An AI model (Gemini) then drafts a summary, its own risk analysis, and a recommendation. |
| Analyst Review | A human Risk Analyst reads the AI recommendation and either agrees or overrides the rating, with a written reason. |
| Committee Review | A human Risk Committee approves, approves-with-conditions, defers, or rejects the request, with a rationale. |
| Completed | Final state. Everything above is preserved and can be exported as a PDF/JSON report. |

**Important separation:** the system's calculated score, the AI's
recommendation, the analyst's judgment, and the committee's final decision
are all stored separately (`RiskAssessment`, `AIRecommendation`,
`AnalystOverride`, `CommitteeDecision` tables). Nothing is overwritten — you
can always see what the machine said versus what the human decided.

Every meaningful action (create, edit, calculate risk, override, decide) is
written to an **audit log** (`AuditEvent` table) with who did it, when, and
what changed.

---

## 3. Roles and access control

There are **5 roles**. A user has exactly one role, chosen at sign-up (or
assigned by an admin). Roles are enforced on the backend (so the rules hold
even if someone bypasses the UI) and mirrored in the frontend to
show/hide screens and buttons.

| Role | Who they represent | What they can do |
|---|---|---|
| **BUSINESS_OWNER** | The person proposing a new product/change | Create change requests; fill in and edit all the intake details (product, customer, geography, transactions, channels, vendors, controls); see only **their own** requests. |
| **RISK_ANALYST** | FCRM analyst who assesses the request | Run the risk calculation pipeline, generate regulatory evidence, generate the AI assessment, and submit the analyst review (accept or override the rating). Sees requests **assigned to them**, plus any unassigned ones. |
| **RISK_COMMITTEE** | Senior reviewer(s) who give final sign-off | Submit the committee decision (approve / approve with conditions / defer / reject) — only once a request has reached the Committee Review stage. Sees requests that have reached analyst review or later. |
| **AUDITOR** | Compliance/audit function | **Read-only** access to everything — every request, every stage, every audit trail — but cannot create, edit, or decide anything. |
| **ADMIN** | System administrator / power user | Can do everything every other role can do (superset access), for support and testing purposes. |

### How access is enforced (backend)

Two separate checks happen on almost every request:

1. **Can this user see this change request at all?**
   (`can_read_change_request` / `filter_change_requests_for_user` in
   `backend/permissions.py`)
   - Admin & Auditor → see everything.
   - Business Owner → only requests **they** created.
   - Risk Analyst → requests assigned to them, or unassigned ones.
   - Risk Committee → only once the request reaches Analyst Review or later.

2. **Is this user allowed to perform this specific action?**
   (`assert_role(...)` on each endpoint, plus `assert_not_auditor_write`
   which blocks Auditors from any write action as a safety net)
   - e.g. only `BUSINESS_OWNER`/`ADMIN` can edit intake data.
   - only `RISK_ANALYST`/`ADMIN` can run risk calculations or submit an
     analyst review.
   - only `RISK_COMMITTEE`/`ADMIN` can submit a committee decision, and only
     while the request is in `COMMITTEE_REVIEW`.

If either check fails, the API returns `403 Forbidden`.

### How access is reflected (frontend)

`frontend/src/utils/rolePermissions.js` mirrors the same rules purely for
the UI: it decides the dashboard title, which buttons/forms are shown, and
whether a screen is read-only. This is a convenience layer only — the
backend is the real gatekeeper.

`ProtectedRoute` (`frontend/src/components/ProtectedRoute.jsx`) blocks
navigation to pages the current role isn't allowed to see (e.g. only
Business Owners/Admins can open "New Request").

---

## 4. Authentication

- Users sign up or log in with a username/email + password
  (`backend/auth.py`, `backend/auth_routes.py`).
- Passwords are hashed with bcrypt — never stored in plain text.
- On login, the backend issues a **JWT bearer token** (8-hour expiry by
  default) containing the user's id, username, and role.
- The frontend stores this token (`frontend/src/context/AuthContext.jsx`)
  and attaches it to every API call; the backend decodes it on each request
  to identify the user (`get_current_user`).
- **Self-registration** is open for Business Owner, Risk Analyst, Risk
  Committee, and Auditor. Admin accounts cannot be self-registered
  (`ALLOW_ADMIN_SELF_SIGNUP=false` by default) — they must be seeded/created
  directly.
- For local development, 5 sample accounts (one per role) are auto-created
  the first time the app starts, listed in the project [README](../README.md).

---

## 5. Risk scoring (how a score is calculated)

This lives in `risk_engine/` and is independent of the web layer, so it can
be tested and tuned on its own.

1. **Generate risk factors** (`risk_factor_generator.py`) — looks at the
   structured data the Business Owner entered (e.g. "cross-border",
   "cash involved", "high-risk jurisdiction") and produces a list of risk
   factors across 7 categories: Customer, Product, Geography, Transaction,
   Channel, Third-Party, Fraud.
2. **Score each category** and combine them, using configurable weights
   (`RiskModelConfig` / `RiskModelWeight` tables), into an **inherent risk**
   score and rating (LOW / MEDIUM / HIGH / CRITICAL).
3. **Adjust for controls** — the effectiveness of the bank's existing
   controls (design, operation, coverage, automation, evidence quality) is
   scored and used to reduce the inherent score into a **residual risk**
   score/rating.
4. **Risk-floor rules** — certain dangerous combinations (e.g. cross-border
   + high-risk jurisdiction + high transaction velocity, or a third party
   handling data without completed due diligence, or missing sanctions
   screening) force a minimum risk rating regardless of the calculated
   score, so a bad combination can't be "averaged away."

---

## 6. Regulatory evidence (RAG pipeline)

This lives in `rag/` and answers: *"which regulation supports this risk
factor?"*

1. Nine Indian regulatory documents (RBI KYC master direction, PMLA 2002,
   PML rules, FIU-IND material, digital payment security controls, fraud
   risk management, IT governance, IT outsourcing, UAPA Section 51A) were
   converted from PDF to text (`data/processed/`) and embedded into a
   **ChromaDB** vector store (`chroma_db/`) using a HuggingFace sentence
   embedding model.
2. Each generated risk factor is mapped to a relevant regulatory question
   (`regulatory_queries.py`).
3. The query engine (`query_engine.py`) searches the vector store for the
   most relevant passage and returns it with its source (authority,
   document name, page number).
4. Results are saved per change request as `RegulatoryEvidence` records, so
   the analyst and committee can see exactly which rule justifies which
   risk factor.

---

## 7. AI-assisted assessment

`backend/gemini_service.py` and `backend/assessment_*.py` build a prompt
from the change request's structured data, its calculated risk scores, and
the regulatory evidence gathered above, and ask an AI model (Gemini) to
produce:
- a plain-language assessment summary,
- its own risk analysis and regulatory considerations,
- questions for the human analyst to double check,
- and a recommendation.

This is stored as an `AIRecommendation`, separate from the analyst's own
judgment — the AI drafts, the human decides.

---

## 8. Key files, if you need to dig deeper

| Area | File |
|---|---|
| API routes (all endpoints) | `backend/main.py` |
| Roles & access rules | `backend/permissions.py` |
| Login/signup/JWT | `backend/auth.py`, `backend/auth_routes.py` |
| Database tables | `backend/models.py` |
| Risk scoring logic | `risk_engine/risk_calculator.py`, `risk_engine/risk_factor_generator.py` |
| Regulatory search | `rag/query_engine.py`, `rag/vector_store.py`, `rag/evidence_service.py` |
| AI assessment | `backend/gemini_service.py`, `backend/assessment_service.py` |
| PDF/JSON export | `backend/export_service.py` |
| Frontend routing | `frontend/src/App.jsx` |
| Frontend role rules | `frontend/src/utils/rolePermissions.js` |
| Frontend auth state | `frontend/src/context/AuthContext.jsx` |
| Assessment screen (all stages) | `frontend/src/pages/Assessment.jsx` + `frontend/src/components/assessment/` |

---

## 9. Not yet implemented / out of scope today

- No password reset / email verification flow.
- No per-analyst assignment UI (assignment is a raw field, not yet a
  managed workflow).
- No admin UI for managing users or risk model weights (both exist as data
  models but are configured directly, not through a screen).
- Single-tenant, single-currency-agnostic setup — no multi-bank tenancy.
