# AI prompts and agent documentation

| Path | Purpose |
|---|---|
| [agents.md](agents.md) | Full AI pipeline: agents, guardrails, retry policy, human gates |
| [prompts/assessment.md](prompts/assessment.md) | FCRM assessment drafter prompt (v2026.1) |
| [prompts/brd-extraction.md](prompts/brd-extraction.md) | BRD → structured intake extraction prompt (v2026.1) |

**Code loaders:** `backend/assessment_prompt.py`, `backend/intake_service.py`

Prompt templates use `{{CONTEXT}}`, `{{SCHEMA}}`, and `{{DOCUMENT_TEXT}}` placeholders replaced at runtime.
