# MiniRiskers

**AI-assisted financial crime risk assessment workbench** for a large national bank operating in the Indian regulatory context.

MiniRiskers helps FCRM teams assess new products and changes through a governed workflow: structured intake → deterministic scoring → regulatory evidence → AI-drafted assessment → human analyst review → committee decision — with a tamper-evident audit trail throughout.

**Client:** Single-tenant deployment for one national bank (~USD 500B assets). Synthetic data only.

---

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 18+
- `GEMINI_API_KEY` in `.env` (optional for scoring/RAG; required for AI extraction and assessment draft)

### Backend

```bash
pip install -r requirements.txt
cp .env.example .env   # set JWT_SECRET and GEMINI_API_KEY
uvicorn backend.main:app --reload
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/`

### Development accounts (seeded on first startup)

| Username | Role | Password (dev only) |
|---|---|---|
| `business_owner` | BUSINESS_OWNER | `dev-business-owner` |
| `risk_analyst` | RISK_ANALYST | `dev-risk-analyst` |
| `risk_committee` | RISK_COMMITTEE | `dev-risk-committee` |
| `auditor` | AUDITOR | `dev-auditor` |
| `admin` | ADMIN | `dev-admin` |

---

## Demo walkthrough (~10 minutes)

Use `brds/brd-03-high-cross-border-remittance.txt` or any file in `brds/`.

| Step | Role | Action |
|---|---|---|
| 1 | Business Owner | New Request → upload BRD → **Extract** → review → **Apply** → complete intake → **Submit** |
| 2 | Risk Analyst | Open request → **Run risk pipeline** (factors → score → evidence → AI draft) → note **Similar past cases** |
| 3 | Risk Analyst | **Continue to analyst review** → accept or override rating (reason required on downgrade) |
| 4 | Risk Committee | Approve / approve with conditions / defer / reject; acknowledge escalated overrides |
| 5 | Auditor | Export **examiner pack** → verify audit hash chain |
| 6 | Risk Analyst | **Analytics** → Override learning loop → consider methodology suggestion on `/methodology` |

**Headline metrics to show judges:** 48-hour SLA dashboard, deterministic same-input-same-score, separated system/AI/human ratings.

---

## Architecture

```text
frontend/          React (Vite) — role-based UI
backend/           FastAPI — workflow, auth, governance APIs
risk_engine/       Deterministic scoring (versioned methodology)
rag/               ChromaDB + embeddings over 9 Indian regulatory docs
ai/                Prompt templates + agent pipeline documentation
brds/              17 synthetic BRDs for demo and evals
evals/             Golden dataset + scoring eval runner
tests/             Pytest suite
Architecture/      Detailed architecture and roadmap
docs/              Requirements, governance, changelog
```

See [Architecture/ARCHITECTURE.md](Architecture/ARCHITECTURE.md) for the full system design.

---

## Decision log

Key engineering decisions and rationale:

| Decision | Choice | Why |
|---|---|---|
| **Client model** | Single-tenant (one bank) | Matches exam/supervisory context; avoids multi-bank scope creep |
| **Jurisdiction** | Indian regs primary (RBI, PMLA, FIU-IND) | Corpus already ingested; client supervised by RBI |
| **Risk scoring** | Deterministic weighted model | Reproducible, explainable, examinable — core brief requirement |
| **AI role** | Advisory only (BRD extract + assessment draft) | Humans decide; `REQUIRES_FCRM_REVIEW` fixed in prompt |
| **BRD extraction** | LLM + mandatory human apply (G1) | Prevents silent intake corruption from hallucinations |
| **Methodology changes** | Versioned maker-checker | Weight changes affect whole portfolio — model governance |
| **Audit trail** | Hash-chained append-only events | Tamper-evident for examiner handoff |
| **Learning** | Similar cases + override analytics → suggest methodology drafts | Data-informed tuning without auto-changing scores |
| **Database** | SQLite (demo) | SQLAlchemy abstracts to Postgres for production |
| **Synthetic data** | BRDs in `brds/` only | No real customer PII in hackathon submission |

Expanded requirements: [docs/requirements/expanded-spec.md](docs/requirements/expanded-spec.md)  
Review gates: [docs/governance/review-gates.md](docs/governance/review-gates.md)  
AI pipeline: [ai/agents.md](ai/agents.md)

---

## Evaluation

```bash
python evals/run_evals.py
pytest tests/
```

Golden BRD labels: `evals/datasets/golden.jsonl`  
Latest results: `evals/results/`

---

## Repository layout (submission mapping)

| Brief path | Actual location |
|---|---|
| `/src` | `backend/`, `frontend/`, `rag/`, `risk_engine/` |
| `/ai` | `ai/` |
| `/docs/requirements` | `docs/requirements/` |
| `/docs/architecture` | `Architecture/` + `docs/` |
| `/docs/governance` | `docs/governance/` |
| `/evals` | `evals/` |
| `/tests` | `tests/` |
| `/ops` | `ops/` — Docker demo stack |

## Docker demo (judges)

```bash
docker compose -f ops/docker-compose.yml up --build
```

Open **http://localhost:8080** (UI) and **http://localhost:8000/docs** (API).  
Full instructions: [ops/README.md](ops/README.md)

---

## Changelog

See [docs/CHANGELOG.md](docs/CHANGELOG.md) for day-by-day development history.
