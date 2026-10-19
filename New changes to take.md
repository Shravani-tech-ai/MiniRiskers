How the system could handle these 6 areas, based on how banks do it
I checked how the codebase handles each area today and compared it with standard practice in banks' financial-crime risk teams. One thing comes up in several answers, so here it is first: regulators expect risk scores to be explainable and approved by people. So "learning" in this system should mean that data produces suggestions, and a person approves them through the methodology change process. Nothing should change scores automatically.

1. Updating regulations
Today: the 9 regulator PDFs in Documents/ are processed by offline scripts into the search index (the store the system searches for regulatory evidence). There is no way to upload a document, and no versioning. A RegulatorySource table with effective-from/effective-to dates already exists in models.py:552 but nothing uses it. Documents marked "withdrawn" are still returned as evidence.

How banks do it: compliance keeps a regulatory library. A new circular gets an owner, an effective date, an "impact assessment" (what it changes for us) and sign-off before it is used.

Plan:

Upload screen ("Regulatory Library") for Admin, or a new Compliance role. The uploader enters the issuing body, circular number, effective date and which older document it supersedes.
Automatic indexing in the background: text extraction, then chunking and indexing into the same search index, with a version, effective_from and status stored on every chunk.
Approval before go-live: the person who uploads can't publish. The document is searchable only after someone else approves it (the same maker-checker rule the methodology already uses).
Search only current rules: only status=current documents that are in effect on the assessment date are searched. Superseded documents stay available for audit.
Impact check: when a document is superseded, list every open request whose evidence cites it and flag them "Re-check evidence".
Keep history: stop deleting old evidence rows when evidence is regenerated (evidence_service.py:84); keep them as snapshots, which auditors will want.
2. Learning from analyst and committee decisions
Today: the system already stores every analyst override (the system's rating, the analyst's rating, reason, direction) and every committee decision. Some analysis of downgrades exists in override_insights.py, and past similar cases are found in similar_cases.py. None of this is fed back into the AI.

How banks do it: you don't retrain the AI every time an analyst disagrees. Under model risk management rules, any change to a model has to be validated and approved first. The learning loop works like this:

Step	What to build	Effort
a. Record better data	Reason codes from a fixed list (e.g. "control not in place", "geography wrongly scored"), not just free text. Also store the analyst's adjusted score, not only the rating.	Small
b. Give the AI past examples	Put the 3 most similar decided cases and their outcomes into the AI prompt, using similar_cases.py, which already exists.	Small, biggest quick win
c. Adjust weights	Recurring overrides produce a proposed methodology change, which a person approves. override_insights.py already suggests weight changes.	Medium
d. Test set	Add decided cases to evals/golden.jsonl. Each new prompt or model version must match analyst decisions at least as often as the previous one before release.	Medium
e. Fine-tuning	Only after hundreds of decided cases, and only with model validation.	Later
Admin "Model Performance" page:

How often the system's rating agrees with the analyst and with the committee, over time.
Override rate by risk category.
Top override reasons.
Prompt and model version history.
While building this, fix two things: the recorded AI model name is hardcoded to gemini-2.5-flash (assessment_service.py:90) whatever model actually answered, and the override-insights API currently returns "access denied" to everyone because of a missing * at governance_routes.py:852.

3. Ratings and feedback after go-live
Plan:

Business Owner rating: when a request reaches its final stage (approved with all conditions closed, or rejected), ask the owner for 1–5 stars, quick tags (accuracy, speed, clarity) and a comment. Store it in a new RequestFeedback table.
Analyst feedback on the AI: a thumbs-up/down plus a reason on each section of the AI assessment. This is the feedback that should improve the AI. Owner stars measure how happy people are with the process. They shouldn't change risk scores, because an owner may rate a rejection badly.
After go-live:
4–6 weeks of close support with feedback reviewed every week.
Then a monthly review meeting where Admin looks at ratings, AI feedback and agreement rates.
Agreed changes become methodology or prompt change proposals, which go through the approval flow.
Release notes for each published change.
4. What Admin should see
Today: Admin can do everything any other role can, but has no pages of its own.

Methodology approval change you asked for: Analysts and Committee members propose changes, and only Admin approves. The current setting in governance_routes.py:87-88 is the reverse for the Committee (Committee can approve, can't propose). The rule that whoever proposes a change can't approve it stays.

Governance concern:

In most banks the methodology owner is a risk body (the Risk Committee or a model risk team), not a system administrator. A common compromise: the Committee endorses a change, and Admin publishes it.
More urgently: since my last change, anyone can sign up as Admin. If Admin is the methodology approver, admin self-signup must be turned off before go-live.
New Admin area:

Approvals queue: methodology changes and regulatory documents waiting for approval.
Regulatory Library (from point 1).
Model Performance (from point 2).
Feedback Analytics: average rating by month and stage, word cloud of comments, low-rated requests.
Control Library (from point 6).
User management: activate, deactivate, change role. No endpoint for this exists today.
Audit: verify the audit trail is intact and export it. The backend endpoints (/audit/verify, /audit/export) already exist; there's just no screen for them.
5. Should the methodology use ML, for example linear regression?
Today: people type every weight, factor score and threshold into the methodology screen.

How banks do it: most financial-crime risk methodologies are deliberately weighted scoring sheets set by experts, because regulators require scores to be explainable and decided outcomes are scarce. ML is used to set and check the numbers, not to replace the formula.

Plan:

Keep the calculation at runtime simple and explainable, as it is today.
Add a "Calibrate" action that fits a statistical model (ordered logistic regression, since ratings run Low < Medium < High < Critical) predicting the committee's final rating from the factor scores. It shows the suggested weights next to the current ones, with confidence ranges, and saves them as a draft methodology change for approval. Plain linear regression is weaker here because the rating is an ordered category, not a number.
Minimum data: don't allow it below roughly 100 decided cases (about 10 per weight). Until then, the current override-based suggestions are the right tool.
Use outside data for factor scores where it exists instead of typing them in. For example, geography scores could come from FATF lists or the Basel AML Index.
Back-testing: before approval, re-score past cases under the proposed change. The "what-if" preview already does part of this.
6. Controls
Today:

Controls are typed in per request: free-text category, and an effectiveness score from 0 to 100 that defaults to 75.
Type, owner and status are hard-coded.
Residual risk uses one average across all controls, applied to the whole score.
A ControlEffectiveness table for design and operating effectiveness exists, but nothing reads it.
How banks do it: controls follow formal frameworks: COSO internal control, the three lines model, and risk and control self-assessments (RCSAs). Banks keep a control library. Each control has:

an owner
a type: preventive, detective or corrective
whether it is manual or automated
how often it runs
whether it is a key control
links to the risks and regulations it covers
Effectiveness is a tested rating (Effective / Partially effective / Ineffective), combining design (is the control built right?) and operation (does it actually run?). It is not a number someone types.

Plan:

Control Library maintained by Admin or Compliance, starting with standard anti-money-laundering controls: customer due diligence, enhanced due diligence, sanctions screening, politically-exposed-person checks, adverse media checks, transaction monitoring, and record keeping. Each is mapped to risk categories, factors and regulation clauses (config/risk_framework.json already has the clauses).
Analysts pick controls from the library; the AI suggests some based on the risk factors. Custom controls need approval before they're added to the library.
Effectiveness comes from design and operating test results (use the unused ControlEffectiveness table), with test evidence attached and a re-test date.
Calculate residual risk per category, using only the controls mapped to that category. A strong sanctions-screening control shouldn't lower the risk score for fraud.