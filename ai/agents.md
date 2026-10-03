# MiniRiskers AI Agents & Pipeline

Version: **2026.1**  
Model provider: **Google Gemini** (`gemini-flash-latest`, with fallbacks in `backend/gemini_service.py`)

MiniRiskers uses AI in **two places only**. Risk scoring, workflow enforcement,
and audit integrity are **deterministic**. Humans make every approval decision.

---

## Pipeline overview

```text
BRD upload
    │
    ▼
[Agent 1: BRD Extractor] ──► heuristic fallback if Gemini unavailable
    │
    ▼
[G1 Human gate] Business Owner confirms extracted fields
    │
    ▼
[Deterministic] Risk factor generation + scoring + RAG evidence
    │
    ▼
[Agent 2: Assessment Drafter] ──► advisory JSON only
    │
    ▼
[G3 Human gate] Risk Analyst review / override
    │
    ▼
[G5 Human gate] Risk Committee decision
```

---

## Agent 1 — BRD field extractor

| Property | Value |
|---|---|
| **Prompt file** | `ai/prompts/brd-extraction.md` |
| **Code** | `backend/intake_service.py` → `build_brd_extraction_prompt()` |
| **Model** | Gemini (JSON mode) |
| **Fallback** | `backend/brd_heuristic.py` (regex / label matching) |
| **Input** | Raw BRD text (max 120k chars) |
| **Output** | JSON matching `backend/intake_schema.py` (`EXTRACTION_JSON_SCHEMA`) |
| **Guardrails** | Human must apply extraction (G1); never auto-saves to intake |
| **Audit** | `BRD_EXTRACTED` event with extraction method |

**Why LLM here:** BRDs are unstructured Word/PDF exports with inconsistent labels.
**Why not auto-apply:** Extraction errors silently corrupt every downstream score.

---

## Agent 2 — FCRM assessment drafter

| Property | Value |
|---|---|
| **Prompt file** | `ai/prompts/assessment.md` |
| **Code** | `backend/assessment_prompt.py`, `backend/assessment_service.py` |
| **Model** | Gemini (JSON mode) |
| **Input** | Structured context from `backend/assessment_context.py`: intake, category scores, risk factors, regulatory evidence, controls |
| **Output** | JSON assessment with sections + `recommendation: REQUIRES_FCRM_REVIEW` |
| **Guardrails** | Prompt forbids inventing regulations; must cite only supplied evidence; cannot change calculated scores; fixed recommendation enum |
| **Storage** | Separate `AIRecommendation` table — never overwrites analyst or committee rows |

**Why LLM here:** Narrative synthesis and analyst question generation — where AI earns its place.
**Why advisory only:** RBI/FATF accountability requires human FCRM judgement on the final rating.

---

## Non-LLM intelligence (still "AI" in the broad sense)

| Component | Approach | Code |
|---|---|---|
| Regulatory retrieval | Sentence embeddings (`all-MiniLM-L6-v2`) + ChromaDB | `rag/` |
| Similar-case lookup | Same embedding model; token overlap fallback | `backend/similar_cases.py` |
| Override learning analytics | Rule-based aggregation over analyst overrides | `backend/override_insights.py` |
| Risk scoring | Deterministic weighted model | `risk_engine/` |

---

## Retry & failure policy

| Step | On failure |
|---|---|
| Gemini call | Try fallback models in `FALLBACK_MODELS`; raise if all fail |
| BRD extraction | Fall back to heuristic extractor; mark `extraction_method` in audit |
| AI assessment | API error returned to analyst; deterministic score + evidence still available |
| RAG | Empty evidence list; analyst sees "no evidence found" |

---

## Prompt versioning

| Prompt | Version | Stored on output |
|---|---|---|
| `brd-extraction.md` | 2026.1 | Audit event metadata |
| `assessment.md` | 2026.1 | `AIRecommendation` (model name via Gemini response) |

Future: add explicit `prompt_version` column on `AIRecommendation`.

---

## Context window management

Assessment prompt sends **structured JSON** (not raw BRD text):

- Change request + intake objects
- Pre-calculated scores and factors
- Top regulatory evidence passages (already retrieved)
- Control effectiveness summary

Excluded: full regulatory corpus, other change requests, user credentials.

---

## Human–AI division (summary)

| Task | AI? | Final authority |
|---|---|---|
| BRD → structured fields | LLM + human confirm | Business Owner |
| Risk factor generation | Deterministic rules | System |
| Inherent / residual score | Deterministic model | System (tunable by risk function) |
| Regulatory evidence | Embeddings search | Verifiable against source PDFs |
| Assessment narrative | LLM draft | Risk Analyst |
| Rating override | Human | Risk Analyst (+ committee if escalated) |
| Approve / reject | Human | Risk Committee |
