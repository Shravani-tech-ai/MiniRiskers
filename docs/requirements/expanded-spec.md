# MiniRiskers — Expanded Requirements Specification

**Project:** Genius Hacks Q3 2026 — Risk Assessment Workbench  
**Version:** 2026.1  
**Client context:** Large national bank (~USD 500B assets), consumer/commercial/payments/wealth, heavily supervised on financial-crime controls  
**Deployment model:** Single-tenant — the entire platform serves this one institution  

---

## 1. Original brief → expanded requirements

| # | Brief requirement | Our interpretation | Rationale / acceptance criteria |
|---|---|---|---|
| R1 | Governed platform: intake → assessment → committee | Five enforced stages with server-side gates | Cannot skip stages (`assert_workflow_stage`); each stage has audit events |
| R2 | Three user groups (product owner, FCRM analyst, committee) | Five roles: Business Owner, Risk Analyst, Risk Committee, Auditor, Admin | Auditor read-only for exam readiness; Admin for support only |
| R3 | Intake-to-decision ~2 days (vs 15–20) | 48-hour SLA tracked from submission to committee decision; clock pauses on deferral to BO | Analytics shows median time, breach count, stage averages |
| R4 | Every rating traceable to inputs and reasoning | Separate tables for system, AI, analyst, committee ratings; methodology report; regulatory evidence per factor | Examiner pack exports full lineage |
| R5 | Modelled, governed data layer | SQLAlchemy schema: intake, factors, assessments, controls, evidence, methodology versions | Rich structured intake the engine and RAG can reason over |
| R6 | Scoring parameters tunable by risk function | Versioned methodology with maker-checker; what-if impact preview | `/methodology` UI; `MethodologyVersion` immutable versions |
| R7 | Immutable audit trail for examiners | Hash-chained `AuditEvent`; append-only guards; PDF/JSON/CSV examiner pack | `/audit/verify` detects tampering |
| R8 | System prepares, humans decide | AI recommendation fixed to `REQUIRES_FCRM_REVIEW`; no auto-approve path | Enforced in prompt + stored separately from final decision |
| R9 | Human disagreement has consequences | Override policy: acknowledge / escalate; committee blocks on large downgrades | `backend/override_policy.py` |
| R10 | Grounded in supervisory frameworks | 7 categories mapped in `config/risk_framework.json`; RAG over 9 Indian regs | Framework tab on methodology screen |
| R11 | Controls mitigate, never eliminate | Residual floors + concentration floors | Tested in `tests/test_risk_calculator.py` |
| R12 | Synthetic data only | 17 BRDs in `brds/`; no real customer PII | All demo accounts and BRDs are fictional |
| R13 | Consistency across analysts | Deterministic engine + similar-case lookup + override learning loop | Same inputs → same score; prior cases shown to analyst |

---

## 2. Client profile

### 2.1 Institution

| Attribute | Value |
|---|---|
| Type | Large national bank |
| Assets | ~USD 500 billion |
| Lines of business | Consumer banking, commercial banking, payments, wealth management |
| Supervisory focus | AML/CFT, sanctions, fraud, third-party / outsourcing risk |
| Operating context | India — RBI, PMLA, FIU-IND, UAPA 51A primary supervisors |

MiniRiskers is **not** multi-tenant. The bank is the implicit deployment boundary. Users are bank employees; change requests are internal product/change proposals.

### 2.2 Regulatory adaptation (US/global brief → India)

The hackathon brief uses global/US framing. We adapted to **Indian banking supervision** because:

1. Our regulatory corpus is 9 Indian documents already ingested (RBI KYC MD, PMLA, PML Rules, FIU-IND, etc.).
2. The client's primary examiner is RBI/FIU-IND, not OCC/FinCEN.
3. FATF, Wolfsberg, and Basel references remain in `config/risk_framework.json` as **international alignment**, not as replaced Indian law.

---

## 3. Personas

### 3.1 Priya Sharma — Business Owner (Retail Payments)

| Field | Detail |
|---|---|
| Role in app | `BUSINESS_OWNER` |
| Goal | Launch or change a product without waiting 15–20 days for FCRM sign-off |
| Pain | Re-types the same BRD information into spreadsheets; unclear what FCRM needs |
| Success | Submits complete intake once; responds to committee conditions with evidence |

**User story:** As a Business Owner, I upload a BRD and confirm AI-extracted fields so that the analyst receives structured intake without re-keying.

**Acceptance:** Intake completeness blocks submission; extraction requires explicit apply step.

---

### 3.2 Arjun Mehta — FCRM Risk Analyst

| Field | Detail |
|---|---|
| Role in app | `RISK_ANALYST` |
| Goal | Consistent, defensible risk assessments with regulatory citations |
| Pain | Identical changes rated differently by different analysts; hunting for precedent |
| Success | Runs pipeline, reviews AI draft, overrides with reason when needed, sees similar past cases |

**User story:** As a Risk Analyst, I see similar past assessments when reviewing a request so that my rating stays consistent with prior committee-approved cases.

**Acceptance:** Similar-case panel shows ≥1 match when portfolio has scored requests; override reason enforced on downgrade.

---

### 3.3 Dr. Kavitha Nair — Risk Committee Chair

| Field | Detail |
|---|---|
| Role in app | `RISK_COMMITTEE` |
| Goal | Accountable sign-off on residual risk acceptance |
| Pain | Analyst downgrades buried in email threads; no audit trail for examiners |
| Success | Sees escalated overrides prominently; records decision with rationale |

**User story:** As Committee Chair, I must acknowledge escalated analyst downgrades before approving so that under-rating pressure is visible in the audit trail.

**Acceptance:** Unconditional approve blocked on escalated override until acknowledgement recorded.

---

### 3.4 Suresh Iyer — Internal Auditor

| Field | Detail |
|---|---|
| Role in app | `AUDITOR` |
| Goal | Verify governance controls and export evidence for RBI inspection |
| Pain | Fragmented emails and spreadsheets; no tamper evidence |
| Success | Read-only portfolio view; exports examiner pack; verifies hash chain |

**User story:** As Auditor, I export an examiner pack and verify the audit hash chain so that I can demonstrate integrity to supervisors.

**Acceptance:** Export includes methodology version, all rating layers, hash verification result.

---

## 4. Framework grounding (summary)

Full mapping: `config/risk_framework.json`

| Category | Primary Indian anchor | International alignment |
|---|---|---|
| CUSTOMER | RBI KYC MD — customer categorisation (Low/Medium/High) | FATF R.10, Wolfsberg RA FAQs |
| PRODUCT | RBI KYC MD product risk; PMLA s.12 | FATF RBA Banking |
| GEOGRAPHY | RBI KYC MD para 5A; UAPA 51A | FATF high-risk jurisdictions |
| TRANSACTION | PML Rules reporting thresholds | FATF R.10, BCBS AML |
| CHANNEL | RBI Digital Payment Security Controls | FATF RBA |
| THIRD_PARTY | RBI IT Outsourcing MD 2023 | FATF R.18, Wolfsberg |
| FRAUD | RBI Fraud Risk Management | FATF R.1 |

---

## 5. Open questions and assumptions log

| # | Question | Decision | Date |
|---|---|---|---|
| A1 | Multi-bank SaaS? | Single-tenant for one national bank | 2026-09 |
| A2 | Which jurisdiction's regs? | India primary; int'l refs for mapping only | 2026-09 |
| A3 | Can AI set final rating? | No — advisory draft only | 2026-09 |
| A4 | Auto-apply BRD extraction? | No — Business Owner confirms (G1) | 2026-09 |
| A5 | Retrospective re-rating on methodology change? | No — what-if preview only; stored assessments keep original version | 2026-10 |
| A6 | Real customer data in demo? | No — synthetic BRDs only | 2026-09 |
| A7 | Business hours for SLA? | Calendar hours (documented limitation) | 2026-10 |
| A8 | ML auto-tuning weights? | Suggestions only; maker-checker on methodology | 2026-10 |

---

## 6. Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| NFR1 | Role-based access on every write endpoint | ✅ `backend/permissions.py` |
| NFR2 | Passwords bcrypt-hashed | ✅ `backend/auth.py` |
| NFR3 | JWT 8-hour expiry | ✅ Configurable via env |
| NFR4 | Examiner-ready export | ✅ PDF/JSON/CSV pack |
| NFR5 | Deterministic scoring reproducibility | ✅ Eval suite + tests |
| NFR6 | Graceful degradation without Gemini | ⚠️ Partial — heuristic BRD extract; score/evidence work without LLM |

---

## 7. Out of scope (v1)

- Multi-bank tenancy
- Password reset / email verification
- Per-analyst assignment UI (field exists, no queue UI)
- Periodic automatic re-assessment triggers
- Real-time sanctions list screening (factors model the risk, not live screening)

---

## 8. Related documents

| Document | Path |
|---|---|
| Architecture overview | `Architecture/ARCHITECTURE.md` |
| Review gates | `docs/governance/review-gates.md` |
| AI pipeline | `ai/agents.md` |
| Eval framework | `evals/README.md` |
| Improvement roadmap | `Architecture/IMPROVEMENT_ROADMAP.md` |
