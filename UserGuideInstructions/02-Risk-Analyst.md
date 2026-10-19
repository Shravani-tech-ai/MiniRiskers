# Risk Analyst Guide

> **Your job in one sentence:** take a submitted request, run the system's risk assessment, record the controls that reduce risk, check the AI draft and regulations, then give your professional rating for the committee.

You are the **expert in the middle**:

- The system calculates a score; you decide whether it's right.
- The committee relies on your review to make the final decision.

Shared topics (signing in, notifications, Settings, Track your Progress) are in the [index](README.md).

---

## Contents

1. [What you can and cannot do](#1-what-you-can-and-cannot-do)
2. [Your menu](#2-your-menu)
3. [Your Dashboard ("Risk Assessments")](#3-your-dashboard-risk-assessments)
4. [Step A: Open the request and check the intake](#4-step-a-open-the-request-and-check-the-intake)
5. [Step B: Run risk assessment](#5-step-b-run-risk-assessment)
6. [Step C: Read the results (Risk view)](#6-step-c-read-the-results-risk-view)
7. [Step D: Add controls to get residual risk](#7-step-d-add-controls-to-get-residual-risk)
8. [Step E: Continue to analyst review (AI draft)](#8-step-e-continue-to-analyst-review-ai-draft)
9. [Step F: Submit your analyst review (accept or override)](#9-step-f-submit-your-analyst-review-accept-or-override)
10. [While the committee decides](#10-while-the-committee-decides)
11. [After the decision: conditions, audit trail, exports](#11-after-the-decision-conditions-audit-trail-exports)
12. [When a request is deferred back to you](#12-when-a-request-is-deferred-back-to-you)
13. [Other pages: Assessments, Analytics, Methodology, Regulations](#13-other-pages-assessments-analytics-methodology-regulations)
14. [Notifications you receive](#14-notifications-you-receive)
15. [FAQ and troubleshooting](#15-faq-and-troubleshooting)

---

## 1. What you can and cannot do

| ✅ You can | ❌ You cannot |
|---|---|
| See all **submitted** requests that are unassigned or assigned to you | See drafts, or requests currently returned to the Business Owner |
| Run the risk assessment (factors → score → regulatory evidence) | Edit the Business Owner's intake inputs |
| Add and remove controls, and record their effectiveness | Make the committee decision |
| Generate the AI assessment draft and rate it helpful or not | Propose or approve methodology changes (Methodology is read-only for you) |
| Accept or override the system rating, with reasons | Upload regulations (Regulations is read-only for you) |
| Verify or send back condition evidence | Open the Admin console |
| See the audit trail and export examiner packs (on the Done view) | |
| View the risk methodology and the regulatory library | |

---

## 2. Your menu

| Menu item | What it is for |
|---|---|
| **Requests** | Your queue |
| **Assessments** | Your pipeline grouped by step. It opens on **"Risk calculated"**, the requests waiting for your review |
| **Track your Progress** | Stepper and SLA clock per request |
| **Analytics** | Portfolio charts, SLA, and the **Override learning loop** |
| **Methodology** | Read-only view of the current scoring rules and their regulatory basis |
| **Regulations** | Read-only regulatory library, with downloads |
| **Settings** | Profile, password, theme and notifications |

---

## 3. Your Dashboard ("Risk Assessments")

The subtitle reads: *"Requests submitted by Business Owners, ready for risk assessment and analyst review."*

### Stat cards

| Card | Counts |
|---|---|
| Queue total | Everything you can see |
| New | Submitted but not yet assessed |
| In assessment | In risk assessment or analyst review |
| Sent to committee | In committee review |

### Filters

**All** · **New (not yet assessed)** · **In assessment** · **Sent to committee** · **Decided** · **High priority** (HIGH or CRITICAL)

### Action button on each request

| Label | When |
|---|---|
| **Start risk assessment** | The status is Submitted (nothing run yet) |
| **Continue assessment** | In risk assessment or analyst review |
| **View** | Anything later |

**Preview** opens a read-only popup of the intake.

> There is **no "New request" button** for you. Only Business Owners and Admins create requests.

---

## 4. Step A: Open the request and check the intake

Click **Start risk assessment**. The request opens on the **Request details** view.

You see:

- An indigo banner: *"Submitted by {name} on {date}. Intake inputs are read-only."*
- The six intake tabs (Product, Customer, Geography, Transaction, Channel, Vendor, Preview). They are **read-only** for you, but every tab is open.

Read through them. If something looks wrong or incomplete, you **can't edit it**. Note it, and raise it in your review. The committee can then send the request back to the Business Owner.

### The footer

> **Ready for risk assessment.** Running it syncs the intake, generates risk factors, calculates scores and retrieves regulatory evidence.
>
> **[ Run risk assessment → ]**

> **What others see now:**
>
> - **Business Owner:** *"Awaiting Risk Analyst. This request is in the Risk Analyst queue…"*
> - **Committee:** nothing.

---

## 5. Step B: Run risk assessment

Click **Run risk assessment →**. The button changes to *"Calculating risk..."*.

### What happens, in order

| # | Step | What it produces | Why it matters |
|---|---|---|---|
| 0 | **Sync intake** | Checks all 11 required fields are present | If any are missing it stops: *"Complete required intake fields before risk calculation (n missing)."* |
| 1 | **Generate risk factors** | Turns intake answers into named risk factors (e.g. "Cross Border Transactions", "PEP Exposure", "Sanctions Exposure"). Audit: `RISK_FACTORS_GENERATED` | Factors are the building blocks of the score. They are fully rule-based: the same inputs always give the same factors |
| 2 | **Calculate risk** | Seven category scores and an **inherent** score and rating. Residual stays **"Pending"** until you add controls. Audit: `RISK_ASSESSMENT_CALCULATED` | The deterministic baseline every later step builds on |
| 3 | **Regulatory evidence** | For each risk factor, searches the regulatory library and keeps the top 3 passages. Audit: `REGULATORY_EVIDENCE_GENERATED` | Ties the risk to actual RBI, PMLA and FIU-IND clauses |

When it finishes, the page switches to the **Risk assessment** view.

| Effect | Detail |
|---|---|
| Stage | Request → **Risk** (status pill "In risk assessment") |
| Business Owner notification | *"Risk assessment run on CR-… (inherent risk HIGH). Controls are being reviewed next."* |
| AI used? | **No.** This step works without a Gemini key |

> **What others see now:**
>
> - **Business Owner:** *"Risk results are under analyst review — The risk assessment has been calculated. It will appear here once the Risk Analyst has reviewed it…"*. They do **not** see the numbers yet.
> - **Committee:** nothing.

---

## 6. Step C: Read the results (Risk view)

The layout is two columns:

```text
┌──────────────────────────────────┬─────────────────────────┐
│ Risk Overview                    │ Similar past cases      │
│ Controls & residual risk         │ Regulatory Evidence     │
│ AI-Assisted FCRM Assessment      │                         │
└──────────────────────────────────┴─────────────────────────┘
```

### Risk Overview

- **Seven category cards:** Customer, Product, Geography, Transaction, Channel, Third Party, Fraud. Each shows a 0–100 score and a rating pill.
- **Inherent Risk:** *"Risk before considering controls"*.
- **Residual Risk:** shows *"Pending control assessment"* until you add controls.
- **Risk Model v{x}:** the methodology version used. It is stored permanently with this assessment.

#### "How was this calculated?" button

Opens a full explanation, titled *"How this risk was calculated"*:

1. **Inputs taken into consideration:** how many factors were triggered, from which intake sections.
2. **Category scores → inherent risk:** a table (Score × Model weight = Contribution). **Click a category row** to see the individual factors and their *Supervisory framework basis* (the RBI, FATF or PMLA clause behind each).
3. **Controls → residual risk:** the formula, base floor, concentration floor and final residual. Triggered rules appear as amber chips.
4. **Regulatory evidence:** how many passages came from how many documents.
5. **Notes & assumptions.**

Buttons: **Download PDF** (`CR-…-risk-methodology.pdf`) and **Close**.

**Why it matters:** you must be able to explain any score to the committee or an examiner. This shows every number.

### How the score works (in plain words)

1. Each **factor** has a score (0–100) and a weight.
2. **Category score** = the weighted average of its factors.
3. **Inherent** = the sum of (category score × category weight). Default weights: Customer 20%, Product 20%, Geography 15%, Transaction 20%, Channel 10%, Third Party 10%, Fraud 5%.
4. **Residual** = Inherent × (1 − control effectiveness %), **but never below a floor**:
   - **Base floor:** inherent ≥ 76 gives a floor of 51; inherent ≥ 51 gives 26; otherwise 5.
   - **Concentration floors** apply when dangerous combinations are present:

| Rule | Factors | Floor |
|---|---|---|
| Cross-border velocity | Cross Border + High Velocity + Rapid Movement | 60 |
| PEP and high-risk customer | PEP + High Risk Customer | 55 |
| Third-party cross-border | Third Party Processing + Cross Border Processing | 55 |
| Sanctions exposure | Sanctions Exposure | 65 |

5. **Rating bands:** LOW ≤ 25 · MEDIUM ≤ 50 · HIGH ≤ 75 · CRITICAL ≤ 100.

**Why floors?** Controls reduce risk but can never *eliminate* it. A sanctions-exposed product cannot be "LOW" just because many controls are listed.

### Similar past cases (right column)

- Up to 3 previous requests that look similar, each with a **"{n}% match"** score.
- Each shows its system rating, your colleague's analyst rating (if different) and the committee decision.
- **Refresh** recalculates the matches. Click a case to open it.

**Why:** consistency. If a similar remittance product was rated HIGH last month, you should have a good reason to rate this one differently.

### Regulatory Evidence (right column)

- A numbered list: *"{document} · Page {n}"*, *"{authority} · Supports: {risk factor}"*.
- **View evidence** opens the passage, with a relevance score (lower = closer) and **Previous / Next** (or the ← / → keys).

**Why:** this is your regulatory justification. Evidence supports the review; it **doesn't change the score**.

---

## 7. Step D: Add controls to get residual risk

The section is titled **"Controls & residual risk"**. Residual risk stays **Pending**, and you **cannot continue**, until at least one control is recorded.

### Adding a control

1. Choose **From control library** (recommended) or **Custom control**.
2. **From the library:** pick *"{code} · {name}"*, e.g. `TM-01 · Transaction monitoring`.
   - You'll see its description, type, nature, frequency, owner, *"Mitigates: …"* and the regulation it maps to.
   - Controls already added are disabled, marked "(added)".
3. **Custom control:** fill in:
   - Control name
   - Mitigates risk categories (leave all unselected for "every category")
   - Type: Preventive / Detective / Corrective
   - Nature: Manual / Automated / Hybrid
   - Frequency
   - Key control ☐
   - Description
4. Set the two **tested** ratings:

| Rating | Default credit |
|---|---|
| Effective | 90 |
| Partially effective | 50 |
| Ineffective | 0 |
| Not tested | 30 |

5. Read the preview: *"Effectiveness credited: {n}% (the weaker of design and operating, under the active methodology)."*
6. Click **Add control**.

**Why two ratings?**

- **Design** asks whether the control is built correctly.
- **Operating** asks whether it actually works in practice.

A well-designed control that has never been tested only earns the "Not tested" credit. That stops untested promises from lowering the risk.

### What happens when you add or remove a control

- An audit event is recorded: `CONTROL_ADDED` (or `CONTROL_REMOVED`).
- **Risk is recalculated automatically** (*"Recalculating residual risk..."*), and the Residual Risk card now shows a score and rating.
- **Registered controls (n)** lists each control with *"Design X · Operating Y · Effectiveness Z%"*.
- The 🗑 icon removes a control. Removing the last one makes the residual **Pending** again.

The residual method depends on the methodology:

- **Average** (default): *"Residual uses the average effectiveness of all controls against the inherent score."*
- **Per category:** each category is reduced only by controls mapped to it.

---

## 8. Step E: Continue to analyst review (AI draft)

Footer hint: *"Continuing generates the AI assessment and moves the request to analyst review."*

Click **Continue to analyst review →** (*"Preparing analyst step..."*).

- It is disabled while the residual is still pending.
- **This step needs `GEMINI_API_KEY`.**

### What happens

| Effect | Detail |
|---|---|
| AI draft | Gemini writes an assessment using the scores, controls, regulatory evidence and up to 3 similar decided cases as examples |
| Recommendation | Always **"Requires FCRM review"**. The AI never approves or rejects |
| Stage | Risk → **Analyst** (status pill "Analyst review") |
| Audit | `AI_ASSESSMENT_GENERATED` (with model version), `WORKFLOW_STAGE_CHANGED` |
| Business Owner notification | *"Request CR-… in analyst review"* |

The page jumps to the **Analyst review** view.

### The AI card ("AI-Assisted FCRM Assessment")

You can see it on the Risk view.

- **Executive Summary**, with *Read more / Show less*.
- **View details** opens these sections: Change description, Risk by category, Inherent risk analysis, Key risk factors, Control assessment, Residual risk analysis, Regulatory considerations (with source citations) and Rationale. Use **Expand all / Collapse all** to open or close them together.
- **Download PDF**: `CR-…-ai-assessment.pdf`.
- *"This is an AI-generated recommendation and does not constitute the final FCRM decision."*

#### "Was this AI draft helpful?"

- **Yes**, or **No** → pick what was wrong (Inaccurate or wrong facts / Missed a relevant risk / Weak or irrelevant regulatory evidence / Too generic / Other), add optional detail, then **Send feedback**.
- **Why:** the Admin tracks AI quality from these votes.

> Some detail sections (inherent/residual analysis, key factors, control assessment) only show right after generation. After a page reload, the summary, category analysis, regulatory considerations and rationale remain.

> **What others see now:**
>
> - **Business Owner:** still *"Risk results are under analyst review"*. Scores and AI stay hidden.
> - **Committee:** nothing yet.

---

## 9. Step F: Submit your analyst review (accept or override)

The panel is titled **"FCRM Analyst Review — Review the system and AI assessment before making the final risk determination."**

### System Assessment

Inherent and Residual cards, each with a score and rating.

### Analyst Rating

| Control | What it does |
|---|---|
| **Accept system rating ({rating})** | One click to agree. It shows ✓ when selected |
| **Rating dropdown** | Choose LOW, MEDIUM, HIGH or CRITICAL to **override** |

### Reason for Override

This appears only if your rating differs from the system's.

**Main reason** (required; it is used to improve the model):

- Controls are stronger than scored
- Controls are weaker than scored
- A risk factor is overstated
- A risk factor is understated / missing
- Geography exposure is mis-scored
- Customer profile context not captured
- Regulatory expectation requires a different rating
- Risk concentration not captured
- Other (explained in the reason)

**Free text:** *"Explain why the analyst disagrees with the system rating..."*

- For a **downgrade**, a counter shows *"n / 40 characters minimum for a downgrade"*.

### Suggestions / Conditions (optional)

Record recommended controls, monitoring or conditions.

- **These are shared with the Business Owner** together with the final rating.
- The committee often turns them into formal conditions.

### Override preview: what your choice will trigger

As soon as you pick a different rating, a coloured box explains the consequences.

| Your choice | Box | Consequence |
|---|---|---|
| **Same as system** | none | Goes straight to the committee |
| **Higher** (upgrade, more cautious) | 🟢 *"Conservative override"* | *"The higher rating becomes the final rating and is shown to the committee."* No extra hurdles |
| **Lower by 1 band** | 🟠 *"The committee must acknowledge this override"* | The committee must write an acknowledgement note before deciding. Reason ≥ 40 characters |
| **Lower by 2+ bands**, **any downgrade from CRITICAL**, or **below a concentration floor** | 🔴 *"This override will be escalated to the committee"* | The committee must acknowledge it, **and cannot give a plain Approve**. It can only approve with conditions, defer or reject |

**Why downgrades are strict:** under-rating risk is the most dangerous mistake a bank can make. Upgrading is always safe; downgrading must be justified and seen by the committee.

### Submit

Footer: *"Final committee decision remains separate from analyst review."*

Click **Submit Analyst Review**. Possible errors:

- *"Please select an analyst rating."*
- *"Please provide a reason when overriding the system rating."*
- *"Please choose the main reason for the override."*
- *"Lowering the system rating needs a fuller justification: at least 40 characters."*
- *"Residual risk is pending control assessment…"*

### What happens

| Effect | Detail |
|---|---|
| Final rating | Set to your rating |
| Stage and status | → **Committee review** |
| Audit | `ANALYST_REVIEW_SUBMITTED`, plus `OVERRIDE_FLAGGED_FOR_ACKNOWLEDGEMENT` or `OVERRIDE_ESCALATED` if applicable |
| Your view | *"✓ Analyst review recorded"*. The page switches to the Committee view |

> **What others see now:**
>
> | Role | What they see |
> |---|---|
> | **Business Owner** | Notification *"Request CR-… sent to the Risk Committee"*. Their Risk view **unlocks**: the "Risk Analyst outcome" card (your rating, reason and suggestions), Risk Overview, Similar cases and Evidence |
> | **Risk Committee** | Notification *"Request CR-… ready for committee — Analyst review is complete with rating X"*. If escalated, also *"Escalated override on CR-…"*. The request appears under **Pending decision** |

### Missed a control?

While the request is in **Analyst review** and before you submit, go back to **← Risk assessment**:

- Click **Edit controls**. A warning reads: *"Changing controls recalculates residual risk and returns this request to the risk step."*
- After changing controls, press **Continue to analyst review →** again. The AI draft is regenerated, and the old one shows *"Risk has changed since this draft was generated…"*.

---

## 10. While the committee decides

On the **Committee review** view you see a status panel (not the committee's workspace):

> **Awaiting committee decision** — *"This request is with the Risk Committee (since …). Committee deliberations are visible to committee members only; the decision and any conditions will appear here once recorded."*

**Why:** the committee deliberates independently.

---

## 11. After the decision: conditions, audit trail, exports

Open **Outcome** (or **View outcome →**). You see the decision, final rating and committee rationale.

### Approval conditions: your verification job

When the committee approves with conditions:

1. The Business Owner submits evidence.
2. You get *"Evidence submitted for CR-…"*.
3. The condition shows **Evidence submitted** and the Business Owner's note.

Type into *"Verification note (required if the evidence is not sufficient)..."*, then click:

| Button | Effect |
|---|---|
| **Verify** | The status becomes **Verified** (the note is optional). The Business Owner is notified. When the last condition is verified, the request becomes **"Approved — conditions met"** and closes, and the Business Owner and Committee are notified |
| **Send back** | The status returns to **Open**, with your note shown as *"Analyst feedback: …"*. **A note is required.** The Business Owner is notified to resubmit |

**Why:** maker-checker. The person proving a condition is met can't be the person confirming it.

### Audit Trail (bottom of the Outcome view)

- *"Append-only, hash-chained record of every assessment and decision activity"*.
- The chain is checked automatically: 🟢 **"Chain verified · n events"** or 🔴 **"Chain broken · n problem(s)"**.
- Each event shows the actor, timestamp, previous and new values, reason, evidence, model and methodology version.

**Export buttons:**

| Button | Gives you |
|---|---|
| **Examiner pack (PDF)** | A complete examiner document: integrity check, decision trail (system / AI / analyst / committee kept separate), SLA, methodology, regulations cited, full trail |
| **JSON** | The same pack, machine-readable |
| **CSV** | The event list, for spreadsheets |

Each export itself is logged (`AUDIT_PACK_EXPORTED`).

**Why:** examiners must be able to follow a rating from inputs to decision and confirm nothing was altered.

---

## 12. When a request is deferred back to you

If the committee chooses **Defer → Risk Analyst**:

- You get *"Request CR-… returned for reassessment"*.
- The status becomes **"Deferred for reassessment"** and the request lands directly in **Analyst review**.
- A banner shows:
  - *"The Risk Committee deferred this request for reassessment."*
  - *"Committee's reasons: …"*
  - *"This is revision N. Record a fresh analyst review for the committee."*
- The review form is **empty again**; earlier reviews are kept in history.
- You can also add or change controls, which recalculates risk and regenerates the AI draft.
- Submit a new review. It goes back to the committee.

**Note:** the SLA clock **keeps running** during reassessment, because the bank still owns the work.

If the committee defers to the **Business Owner** instead, the request disappears from your queue until they resubmit. Then it comes back as **New**, and you run the assessment again.

---

## 13. Other pages: Assessments, Analytics, Methodology, Regulations

### Assessments

- *"Your assessment pipeline — calculated risks awaiting your review, and what has moved on to the committee."*
- It opens on **Risk calculated**: requests where you've run the risk but haven't submitted a review.
- Each card has three tiles: Risk assessment (residual/inherent), Analyst review ("Accepted · X" or "Adjusted X → Y") and Committee.

### Analytics

- **Top tiles:** Requests, Risk assessed, Avg residual score, High / critical %, Approval rate.
- **Charts:** rating distribution, workflow pipeline, average risk by category, requests per month, analyst review outcomes (Accepted / Raised / Lowered), committee decisions, and inherent vs residual risk.
- **Intake-to-decision SLA:**
  - median time to decision, % decided within SLA, open at-risk, open breached, escalated overrides
  - average time per stage (red = over target)
  - **Open requests against SLA** (top 10)
- **Override learning loop:**
  - analyst reviews, downgrade rate, and how many were accepted as scored
  - **Categories in downgraded cases:** which categories drive disagreements
  - **Factors in downgraded cases**
  - **Suggested methodology drafts:** e.g. *"Consider increasing Geography weight"*. These are advice for the Committee only; nothing changes automatically

**Why the override loop matters:** if analysts keep downgrading the same pattern, the scoring rules may be wrong. That evidence goes to the Committee, who can propose a fix.

### Methodology (read-only)

- **Methodology tab:** the active version's weights, bands, floors, concentration rules, override policy, SLA targets, control credits, factor thresholds and factor catalog.
- **Framework basis tab:** every category, factor and rule mapped to RBI, PMLA, FATF and Wolfsberg clauses.
- **Versions tab:** history of all versions.
- On draft or pending versions you can click **Run impact preview** to see which existing ratings would change.

### Regulations (read-only)

- Filters: **In use** · **Awaiting approval** · **Superseded / withdrawn** · **All**.
- Expand a document to see who uploaded it, its page and passage count, and **"Open requests citing this document"**.
- **Download** saves the file.
- Only **Active** documents are cited as evidence. Superseded and withdrawn ones are kept for audit only.
- If a regulation you cited gets superseded or withdrawn, you'll get *"Re-check evidence for CR-…"*. Re-run the assessment to refresh the evidence.

---

## 14. Notifications you receive

| When | Title |
|---|---|
| A Business Owner submits | New request CR-… submitted |
| The committee defers to you | Request CR-… returned for reassessment |
| A Business Owner submits condition evidence | Evidence submitted for CR-… |
| A cited regulation changes | Re-check evidence for CR-… |
| A stage reaches 75% of its target time | Risk assessment / Awaiting analyst pickup / Analyst review due within Nh on CR-… |
| A stage is over target | … overdue on CR-… |
| The overall 48h SLA is at risk or breached | Intake-to-decision SLA at risk / breached on CR-… |

If no analyst is assigned to a request, **all** analysts (and Admins) get these notifications.

---

## 15. FAQ and troubleshooting

**"Run risk assessment" says fields are missing.**
The Business Owner didn't save all 11 required fields. You can't edit them. Ask them to fix it, or ask an Admin.

**"Continue to analyst review" is disabled.**
Residual is pending. Add at least one control.

**"The AI assessment could not be generated because GEMINI_API_KEY is not configured…"**
Ask whoever runs the server to add the key to `.env` and restart. If the message says *"The AI service could not produce an assessment right now"*, retry in a moment. Either way the request stays at the Risk stage and nothing is lost.

**What does the AI card's "Generate AI Assessment" button do?**
The same as **Continue to analyst review →**: it generates the draft and moves you to Analyst review. It is disabled until residual risk is calculated.

**Can I take a request off another analyst?**
No. You only see unassigned requests or ones assigned to you.
