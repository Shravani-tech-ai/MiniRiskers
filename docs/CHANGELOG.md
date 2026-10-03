# MiniRiskers — Development Changelog

Historical progress notes moved from README.md. For setup and demo instructions see the root [README.md](../README.md).

---

## Progress — September 4, 2026

### Completed

- Set up the MiniRiskers project structure.
- Created Python virtual environment and installed required dependencies.
- Added Indian banking regulatory documents under `documents/`.
- Built PDF document processing pipeline using PyMuPDF.
- Extracted text from 9 regulatory documents and stored processed text under `data/processed/`.
- Built regulatory vector store using ChromaDB and Hugging Face `all-MiniLM-L6-v2` embeddings.
- Built regulatory query engine.
- Set up FastAPI backend with SQLAlchemy and SQLite.
- Created initial `ChangeRequest` database model and first API test (`CR-2026-001`).

---

## Progress — September 5, 2026

### Completed

- Expanded database schema (product, customer, geography, transaction, channel, vendor, controls, risk factors, assessments, regulatory evidence).
- Implemented automatic risk-factor generation and weighted inherent/residual scoring.
- Added risk rating bands, control effectiveness scoring, concentration and floor rules.
- Separated system, AI, analyst, and committee decision storage.
- Integrated regulatory RAG pipeline with evidence generation API.
- Fixed SQLAlchemy serialization, transaction velocity types, and ChromaDB path handling.

---

## Progress — October 2026

### Governance & workflow

- Override escalation policy with committee acknowledgement.
- DEFER / REJECT / conditional approval workflows with revision tracking.
- Versioned methodology with maker-checker and what-if impact preview.
- Hash-chained audit trail and examiner pack export (PDF/JSON/CSV).
- Intake-to-decision SLA tracking on Analytics dashboard.

### Learning & consistency

- Similar-case retrieval panel (embedding + token fallback).
- Override learning loop analytics with methodology suggestions.

### Submission artefacts

- `docs/requirements/expanded-spec.md` — client context, personas, requirements traceability.
- `docs/governance/review-gates.md` — G1–G7 gates with RACI.
- `ai/prompts/` — versioned prompt templates; `ai/agents.md` pipeline documentation.
- `evals/` — golden BRD dataset and scoring eval runner.
- `ops/` — Docker Compose demo stack for judges.
- README rewritten as setup + demo + decision log.
