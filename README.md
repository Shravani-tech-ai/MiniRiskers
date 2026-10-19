# MiniRiskers

**An AI-assisted workbench that helps a bank check new products and changes for financial crime risk (money laundering, terrorist financing, fraud, sanctions) before they go live.**

Built for a large national bank in India (single bank, one deployment). All data in this project is synthetic — no real customer information.

---

## What does it do? (in one minute)

When a business team at the bank wants to launch something new — for example a cross-border remittance product or a UPI feature — the bank must first assess its financial crime risk. Today that is slow, manual and inconsistent.

MiniRiskers turns it into a clear, step-by-step process:

1. **A Business Owner describes the change.** They fill in a form or upload a business requirements document (BRD), and AI helps pre-fill the form.
2. **The system calculates a risk score.** A fixed, rule-based engine scores the request. The same inputs always give the same score.
3. **The system finds the relevant regulations.** It searches Indian regulatory documents (RBI, PMLA, FIU-IND and others) and shows which rules apply.
4. **AI writes a draft assessment.** The draft is advice only and always needs human review.
5. **A Risk Analyst reviews it.** They accept the system's rating or change it, giving a reason.
6. **The Risk Committee decides.** They approve, approve with conditions, defer or reject.
7. **Everything is recorded.** Every action goes into an audit trail that cannot be edited without detection.

> **Key principle:** AI helps, humans decide. The system score, the AI draft, the analyst's rating and the committee's decision are always stored and shown separately.

---

## Roles

There are **four roles**. Each user has one role, and the app only shows the pages and buttons that role is allowed to use.

| Role | Who they are | What they can do |
|---|---|---|
| **Business Owner** | The person or team proposing the new product or change | Create requests, upload a BRD, fill in intake details, submit for review, see only **their own** requests, upload evidence that approval conditions are met, and rate the process after it closes |
| **Risk Analyst** | Financial crime risk specialist | See submitted requests, run the risk pipeline (score, regulatory evidence, AI draft), compare with similar past cases, add controls, accept or override the rating, and verify condition evidence |
| **Risk Committee** | The decision-making body | See requests waiting for a decision, acknowledge analyst overrides, make the final decision, **propose** changes to the risk methodology, and upload new regulatory documents (an Admin approves these) |
| **Admin** | System owner and overseer | Everything above, plus user management, system settings, **approving** methodology changes, the audit trail and examiner exports, model "training", the control library and the regulatory library |

**Who sees what:**

- A Business Owner never sees the analyst's internal review notes or the committee's discussion workspace. They see the status and the final outcome.
- Once a Business Owner submits a request, its inputs are **locked**. They become editable again only if the committee sends it back.
- The Methodology and Regulations pages are hidden from Business Owners.

> The old **Auditor** role has been retired. Its read-only audit work now belongs to the Admin. Accounts that still hold the Auditor role cannot sign in until an Admin gives them a current role.

---

## The workflow, step by step

```text
 Request  ──►  Risk  ──►  Analyst  ──►  Committee  ──►  Done
 (Business     (Risk      (Risk         (Risk
  Owner)        Analyst)   Analyst)      Committee)
```

### 1. Request (Business Owner)

- Create a new request. A request number such as `CR-2026-001` is generated.
- Fill in the intake sections: **Product, Customer profile, Geography, Transaction profile, Channel, Vendor/third party**.
- Or **upload a BRD** (text or PDF) and click **Extract**. AI reads it and suggests values. You review them and click **Apply**. Nothing is filled in silently: a human must approve the AI's suggestions.
- A completeness check shows what is still missing.
- Click **Submit** to send the request to the Risk Analyst.

### 2. Risk assessment (Risk Analyst)

Click **Run risk pipeline**. It runs four steps:

| Step | What happens |
|---|---|
| **Risk factors** | The system turns the intake answers into risk factors, such as "Cross Border Transactions" or "PEP Exposure" |
| **Risk score** | A rule-based engine calculates an **inherent** score (risk before controls) and a **residual** score (risk after controls), each from 0 to 100, and a rating: **LOW / MEDIUM / HIGH / CRITICAL** |
| **Regulatory evidence** | The system searches the regulatory documents and lists the clauses that apply, with citations |
| **AI draft** | AI (Google Gemini) writes a narrative assessment. It is always marked as needing FCRM review |

The analyst also sees:

- **Similar past cases**: earlier requests that look like this one and how they were rated and decided, which helps keep decisions consistent.
- **Controls**: the analyst picks controls from the bank's standard control library and records how well each is designed and working. Better controls lower the residual score.
- **Risk methodology view**: a full explanation of how the score was calculated, which can be downloaded as a PDF.

### 3. Analyst review (Risk Analyst)

The analyst accepts the system rating or chooses a different one.

- **Raising the rating** (more cautious) goes straight through.
- **Lowering the rating** (a downgrade) is treated more strictly, because underrating risk is the most dangerous mistake:
  - A reason of at least 40 characters is required.
  - A downgrade of 1 band means the committee must **acknowledge** the override before deciding.
  - A downgrade of 2 or more bands, any downgrade from CRITICAL, or a rating below a risk "floor" is **escalated**. The committee must acknowledge it and **cannot give an unconditional approval**.
- Before saving, the analyst sees a preview of what their override will trigger.

### 4. Committee decision (Risk Committee)

The committee chooses one of four decisions:

| Decision | What it means |
|---|---|
| **Approve** | Go ahead |
| **Approve with conditions** | Go ahead, but specific conditions must be met. The Business Owner uploads evidence for each condition and the Risk Analyst verifies it. When all conditions are verified, the status becomes "Conditions met" |
| **Defer** | Not yet. The request goes back either to the **Business Owner** (to fix inputs; the SLA clock pauses) or to the **Risk Analyst** (to reassess) |
| **Reject** | Do not proceed |

### 5. Done

The final decision is recorded and everyone involved is notified. The Business Owner can then leave feedback (1–5 stars, tags and a comment) within a set number of days.

---

## Features at a glance

### Pages in the app

| Page | What it is for | Who sees it |
|---|---|---|
| **Requests** (Dashboard) | Your list of requests. The title changes per role, e.g. "My Change Requests" or "Pending Committee Decisions" | Everyone |
| **New Request** | Start a new request and upload a BRD | Business Owner, Admin |
| **Assessment** | The main workspace for one request, with a stepper across the five stages | Everyone (content varies by role) |
| **Assessments** | Overview of all assessments with filters | Everyone |
| **Track your Progress** | Where each request is, and how long each stage has taken | Everyone |
| **Analytics** | SLA performance, cycle times and override patterns | Everyone |
| **Methodology** | View, propose and approve versions of the risk scoring rules | Not Business Owner |
| **Regulations** | Browse the regulatory library and upload new documents | Not Business Owner |
| **Admin console** | Users, settings, audit, training, feedback and the control library | Admin only |
| **Settings** | Your profile, password, theme (light/dark) and notification preferences | Everyone |

### Risk scoring (deterministic)

- **Seven risk categories:** Customer, Product, Geography, Transaction, Channel, Third Party and Fraud. Each has a weight (for example Customer 20%, Fraud 5%).
- **Rating bands:** LOW (0–25), MEDIUM (26–50), HIGH (51–75), CRITICAL (76–100).
- **Residual floors:** residual risk can never drop below a minimum, however good the controls. For example, inherent risk of 76 or more always leaves residual risk of at least 51.
- **Concentration rules:** some dangerous combinations push the score up automatically, e.g. cross-border plus high-velocity transactions, PEP exposure, or sanctions exposure.
- **Explainable:** every category, factor and rule is mapped to its source in RBI, PMLA, FATF or Wolfsberg guidance (see [config/risk_framework.json](config/risk_framework.json)).

### Methodology versioning (maker-checker)

The scoring rules (weights, bands, floors, override policy, SLA targets) are stored as **versions**. Only one version is active at a time.

1. The **Risk Committee** drafts a change and submits it.
2. Anyone with access can run an **impact preview**: "if we adopt this, how would existing ratings change?"
3. An **Admin** approves or rejects it. Approval makes it the active version and retires the old one.

Because one person cannot both make and approve a change, nobody can quietly alter how the whole portfolio is scored.

### Regulatory library and evidence search (RAG)

- Nine Indian regulatory documents are included in [Documents/](Documents/): the RBI KYC Master Direction, PMLA 2002, PML Rules 2005, FIU-IND reporting, Digital Payment Security, Fraud Risk Management, IT Governance, IT Outsourcing, and UAPA Section 51A.
- The documents are split into chunks and stored in a vector database (ChromaDB) so the system can find the right clauses for each request.
- New documents can be uploaded. Admin uploads are approved straight away; Risk Committee uploads wait for an Admin. Documents can be **withdrawn** or **superseded**. Withdrawn and superseded documents are never cited again but stay available for audit.

### Audit trail

- Every action (create, edit, submit, score, override, decide…) is saved as an audit event.
- Each event is **hash-chained** to the one before it, like a blockchain. If anyone edits, deletes or reorders an event, verification fails.
- On SQLite, the database itself also blocks edits and deletes of audit rows.
- **Examiner pack:** a one-click export (PDF, JSON or CSV) with everything a regulator needs to follow a decision from inputs to outcome, including the hash-chain check.

### SLA and cycle time

- The target is **48 hours** from Business Owner submission to committee decision.
- Each stage has its own target: awaiting analyst 8h, risk assessment 12h, analyst review 12h, committee review 16h.
- Requests are flagged **at risk** at 75% of the target.
- The clock **pauses** while a request is back with the Business Owner.

### Learning from decisions (governed, never automatic)

- **Similar cases:** past decided requests are matched to the current one so analysts can stay consistent.
- **Override insights:** analytics show where analysts often disagree with the system, and suggest possible weight changes.
- **Model training (Admin):** the system studies past decisions and suggests new category weights, with before/after accuracy. It **never changes scoring by itself**. The Admin shares the result with the Committee, who can turn it into a methodology draft, which then goes through maker-checker approval.
- **Better AI drafts:** similar past decisions are added to the AI prompt so its narrative reflects how the bank has actually judged comparable cases.

### Notifications

In-app notifications (bell icon and pop-up toasts) cover workflow updates, committee decisions, approval conditions, SLA reminders and methodology changes. Each user can switch categories on or off in Settings.

### Feedback

- Business Owners rate the process after their request closes.
- Analysts and the Committee mark AI drafts as helpful or not helpful.
- The Admin sees both in aggregate.

### Admin console

| Tab | What it does |
|---|---|
| **Users** | Change user roles and activate or deactivate accounts |
| **Settings** | Feedback window, training limits and similar settings |
| **Audit** | Verify hash chains and export audit data |
| **Training** | Run model calibration and share or adopt the results |
| **Feedback** | View Business Owner ratings and AI-helpfulness scores |
| **Control library** | Maintain the bank's standard list of controls (type, frequency, key control, mapped risks and regulations) |

---

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Gemini API key (`GEMINI_API_KEY`). It is optional for scoring and regulatory search, but needed for AI BRD extraction and the AI assessment draft.

### 1. Backend

```bash
pip install -r requirements.txt
cp .env.example .env      # then set JWT_SECRET and GEMINI_API_KEY
uvicorn backend.main:app --reload
```

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/

### 3. Log in

These development accounts are created automatically the first time the backend starts, when the database is empty:

| Username | Role | Password (dev only) |
|---|---|---|
| `business_owner` | Business Owner | `dev-business-owner` |
| `risk_analyst` | Risk Analyst | `dev-risk-analyst` |
| `risk_committee` | Risk Committee | `dev-risk-committee` |
| `admin` | Admin | `dev-admin` |

You can also create an account from the **Sign up** page and pick a role. Admin self-signup is controlled by `ALLOW_ADMIN_SELF_SIGNUP` in `.env`, so turn it off outside development.

---

## Demo walkthrough (~10 minutes)

Use `brds/brd-03-high-cross-border-remittance.txt` or any file in [brds/](brds/).

| Step | Log in as | Do this |
|---|---|---|
| 1 | Business Owner | **New Request** → upload BRD → **Extract** → review → **Apply** → complete intake → **Submit** |
| 2 | Risk Analyst | Open the request → **Run risk pipeline** → look at **Similar past cases** and the regulatory evidence |
| 3 | Risk Analyst | **Continue to analyst review** → accept the rating, or override it (a downgrade needs a reason) |
| 4 | Risk Committee | Acknowledge any override → **Approve / Approve with conditions / Defer / Reject** |
| 5 | Admin | Export the **examiner pack** → verify the audit hash chain |
| 6 | Admin / Committee | **Analytics** → override insights → try a methodology change on **Methodology** (Committee proposes, Admin approves) |

**Worth showing:** the 48-hour SLA dashboard, the same score for the same input every time, and the separate system / AI / analyst / committee ratings.

---

## Project structure

```text
backend/        FastAPI app: workflow, login, permissions, governance, admin APIs
frontend/       React (Vite) web app with role-based screens
risk_engine/    Deterministic risk scoring and versioned methodology
rag/            Regulatory document processing, vector store and evidence search
config/         Supervisory framework mapping (risk_framework.json)
ai/             AI prompt templates and AI pipeline documentation
Documents/      The 9 Indian regulatory PDFs used for evidence search
brds/           17 synthetic BRDs for demos and evaluations
evals/          Golden dataset and scoring evaluation runner
tests/          Pytest test suite
scripts/        Helper scripts (sample BRD PDF, scenario document)
Architecture/   Detailed architecture and roadmap
docs/           Requirements, governance gates, changelog
```

Full system design: [Architecture/ARCHITECTURE.md](Architecture/ARCHITECTURE.md)

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | SQLite for the demo; can move to Postgres through SQLAlchemy |
| AI | Google Gemini (BRD extraction and assessment draft) |
| Search | ChromaDB with `all-MiniLM-L6-v2` embeddings |
| Auth | JWT tokens and hashed passwords |

---

## Why we built it this way (decision log)

| Decision | What we chose | Why |
|---|---|---|
| **Who it is for** | One bank (single-tenant) | Matches how a supervised bank works; keeps the scope focused |
| **Regulations** | Indian rules first (RBI, PMLA, FIU-IND) | The client is supervised by RBI |
| **Risk scoring** | Rule-based weighted model | Reproducible, explainable, and can be examined by a regulator |
| **AI's role** | Advisory only (BRD extraction and draft) | Humans make every decision |
| **BRD extraction** | AI suggests, a human must click Apply | Stops AI mistakes from silently entering the record |
| **Methodology changes** | Versioned, with maker-checker | Weight changes affect every request, so they need two-person control |
| **Audit trail** | Hash-chained, append-only | Tampering can be detected; ready to hand to examiners |
| **Learning** | Suggestions only, never automatic | Data informs tuning, but people approve every change |
| **Data** | Synthetic BRDs only | No real customer data in the project |

More detail:
[Expanded requirements](docs/requirements/expanded-spec.md) ·
[Review gates (G1–G7)](docs/governance/review-gates.md) ·
[AI pipeline](ai/agents.md)

---

## Testing and evaluation

```bash
pytest tests/                 # unit and workflow tests
python evals/run_evals.py     # check scoring against the golden BRD labels
```

- Golden labels: `evals/datasets/golden.jsonl`
- Latest results: `evals/results/`

---

## Changelog

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for the development history.
