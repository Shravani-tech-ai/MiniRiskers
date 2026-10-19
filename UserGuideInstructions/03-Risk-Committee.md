# Risk Committee Guide

> **Your job in one sentence:** review the full assessment (system score, AI draft, analyst review, controls and regulations), record the bank's final decision, and keep the scoring rules up to date by proposing methodology changes.

You are the **final human decision-maker**. You also act as the **"maker"** in two maker-checker processes:

- **Methodology changes:** you propose, an Admin approves.
- **Regulatory documents:** you upload, an Admin approves.

Shared topics (signing in, notifications, Settings, Track your Progress) are in the [index](README.md).

---

## Contents

1. [What you can and cannot do](#1-what-you-can-and-cannot-do)
2. [Your menu](#2-your-menu)
3. [Your Dashboard ("Pending Committee Decisions")](#3-your-dashboard-pending-committee-decisions)
4. [Reviewing a request before deciding](#4-reviewing-a-request-before-deciding)
5. [The Committee Decision workspace](#5-the-committee-decision-workspace)
6. [The four decisions and what each one triggers](#6-the-four-decisions-and-what-each-one-triggers)
7. [After the decision: outcome, conditions, audit](#7-after-the-decision-outcome-conditions-audit)
8. [Proposing a methodology change](#8-proposing-a-methodology-change)
9. [Training suggestions from the Admin](#9-training-suggestions-from-the-admin)
10. [Uploading a regulation](#10-uploading-a-regulation)
11. [Assessments and Analytics pages](#11-assessments-and-analytics-pages)
12. [Notifications you receive](#12-notifications-you-receive)
13. [FAQ and troubleshooting](#13-faq-and-troubleshooting)

---

## 1. What you can and cannot do

| ✅ You can | ❌ You cannot |
|---|---|
| See requests that have reached **committee review** or later | See requests before they reach committee review |
| Read the full risk assessment, AI draft, evidence and analyst review | Edit intake, run the risk pipeline, add controls or write the analyst review |
| Acknowledge analyst overrides | Approve your own methodology proposal (an Admin must) |
| **Approve / Approve with conditions / Defer / Reject** | Approve regulatory uploads (an Admin must) |
| Propose, edit and submit methodology drafts | Verify condition evidence (that's the analyst's job) |
| Start a draft from an Admin-shared training run | Open the Admin console |
| Upload new regulations (pending Admin approval) | |
| See the audit trail and export examiner packs (on the Done view) | |

---

## 2. Your menu

| Menu item | What it is for |
|---|---|
| **Requests** | Your decision queue |
| **Assessments** | It opens on **"Analyst reviewed"**: requests waiting for you |
| **Track your Progress** | Stepper and SLA per request |
| **Analytics** | Portfolio, SLA and the override learning loop |
| **Methodology** | View and **propose** scoring rule changes, plus the **Training suggestions** tab |
| **Regulations** | Browse and **upload** regulations |
| **Settings** | Profile, password, theme and notifications |

---

## 3. Your Dashboard ("Pending Committee Decisions")

The subtitle reads: *"Requests reviewed by Risk Analysts and awaiting a committee decision."*

### Stat cards

| Card | Counts |
|---|---|
| Pending decision | In committee review |
| Approved | Including approved with conditions |
| Rejected / deferred | — |
| Total | — |

### Filters

**Pending decision** (selected by default) · **Decided** · **All**

### Action button on each request

| Label | When |
|---|---|
| **Review & decide** | In committee review |
| **View** | Anything else |

**Preview** shows the intake read-only.

> **Why you don't see earlier requests:** the committee should judge a completed, reviewed package, not work in progress.

---

## 4. Reviewing a request before deciding

Click **Review & decide**. The page opens on the **Committee review** view.

Before deciding, use **← Analyst review** and **← Risk assessment** in the footer to look back at the earlier work.

### Request details view (read-only)

- The six intake tabs and the Preview tab, all open.
- A banner: *"Submitted by {name} on {date}. Intake inputs are read-only."*

### Risk assessment view (read-only)

| Section | What you get from it |
|---|---|
| **Risk Overview** | 7 category scores, inherent and residual risk, model version |
| **How was this calculated?** | Full score breakdown, factor-level regulatory basis, floors and concentration rules. **Download PDF** available |
| **AI-Assisted FCRM Assessment** | Executive summary, **View details**, **Download PDF**, and *"Was this AI draft helpful?"* (Yes / No + reason) |
| **Similar past cases** | How comparable requests were rated and decided. Useful for consistency |
| **Regulatory Evidence** | The cited passages (**View evidence**, Previous / Next) |

> The **Controls** section is not shown on your Risk view. The controls' effect is visible in the Residual score and in the "How was this calculated?" breakdown.

### Analyst review view (read-only)

- What the analyst chose, their override reason, and their suggestions.
- The panel footer reads *"Final committee decision remains separate from analyst review."*

---

## 5. The Committee Decision workspace

The panel is titled **"Risk Committee Decision — Final governance checkpoint for the proposed change."**

Info box:

> **Final human decision.** The Risk Committee reviews the FCRM assessment, analyst review, risk factors, controls, and regulatory evidence before making the final decision.

### Decision Context (three cards)

| Card | Shows |
|---|---|
| **System Residual Risk** | Score, rating and *"Methodology vX"* |
| **Analyst Rating** | The analyst's rating, with a badge *"Lowered N band(s)"* or *"Raised N band(s)"* |
| **AI Recommendation** | Always "Requires FCRM review" (the AI never decides) |

**Why three separate ratings?** Regulators want to see what the *machine*, the *AI* and the *human* each said. They are never merged.

### Override acknowledgement (only if the analyst lowered the rating)

| Box | When |
|---|---|
| 🟠 **"Analyst override requires acknowledgement"** | The analyst lowered the rating by 1 band |
| 🔴 **"Escalated analyst override"** | Lowered by 2 or more bands, lowered from CRITICAL, or below a concentration floor |

The box shows:

- *"{Analyst} lowered the system rating from X to Y."*
- the escalation reasons
- *"Analyst's reason: …"*

Type into **"Committee acknowledgement of the override"**: *"Record why the committee accepts (or does not accept) the analyst's lower rating..."*

> This is a **written note**, not a checkbox. You **cannot submit any decision** until it's filled in.

If the override is **escalated**: *"Unconditional approval is not available for this request."*

**Why:** a downgrade means the bank is accepting *more* risk than its own model suggests. The committee must consciously own that, in writing.

### Committee Decision options

| Option | Description shown |
|---|---|
| **Approve** | *"Approve the proposed change without additional conditions. Closes the request."* Disabled if the override is escalated: *"Not available: the analyst's downgrade was escalated."* |
| **Approve with Conditions** | *"Approve subject to conditions. Each condition is tracked until the analyst verifies the owner's evidence."* |
| **Defer** | *"Send the request back for rework. It returns to the committee as a new revision."* |
| **Reject** | *"Do not approve the proposed change. The request is closed."* |

### Extra fields by decision

#### Approve with Conditions → "Approval conditions"

- Each row has a description (e.g. *"Enhanced transaction monitoring enabled before go-live"*) and an optional **Due date**.
- Leave the due date blank to use the default of **30 days** from today.
- **Add condition** adds a row; 🗑 removes one (at least one row must stay).
- There is no "owner" field. The **Business Owner evidences** each condition and the **Risk Analyst verifies** it.

#### Defer → "Send back to"

| Choice | Description | Use it when |
|---|---|---|
| **Business Owner** | *"Inputs or controls must change. Intake reopens; the SLA clock pauses until resubmission."* | The facts are wrong or incomplete, or the product design must change |
| **Risk Analyst** | *"The assessment needs another look (e.g. an override needs better support)."* | The analysis is weak, e.g. an override reason doesn't convince you |

#### Rationale (always required)

- The label is **"Committee Rationale"**. For Defer it becomes **"What must change (shared with the recipient)"**.
- Placeholder: *"Explain the basis for the committee decision..."*

### Submit

Footer: *"This decision is recorded in the audit trail."*, or *"Acknowledge the analyst override before deciding."* if a note is still needed.

**Submit Committee Decision** stays disabled until:

- a decision is chosen, **and**
- the rationale is filled in, **and**
- the acknowledgement note is filled in (if required), **and**
- a "Send back to" target is chosen (if Defer), **and**
- at least one condition has a description (if Approve with Conditions), **and**
- Approve isn't chosen on an escalated override.

Afterwards: *"✓ Committee decision recorded"*.

---

## 6. The four decisions and what each one triggers

| Decision | Status → | Stage → | Closed? | What happens next |
|---|---|---|---|---|
| **Approve** | Approved | Done | ✅ | The Business Owner is notified and asked for feedback |
| **Approve with conditions** | Approved — conditions open | Done | ❌ until all conditions are verified | One condition record per row (status Open, due date). The Business Owner gets *"Condition opened…"* for each |
| **Defer → Business Owner** | Returned for rework | Request | ❌ | The revision number goes up (+1). Intake **reopens** for the Business Owner. The SLA clock **pauses**. Analysts lose sight of it until resubmission |
| **Defer → Risk Analyst** | Deferred for reassessment | Analyst | ❌ | The revision number goes up (+1). The analyst gets *"returned for reassessment"* and a fresh review form. The SLA clock **keeps running** |
| **Reject** | Rejected | Done | ✅ | The Business Owner is notified and asked for feedback |

**Audit events written:**

- `COMMITTEE_DECISION`, with your rationale and conditions
- `OVERRIDE_ACKNOWLEDGED`, if you acknowledged an override
- `CONDITION_OPENED`, per condition
- `WORKFLOW_STAGE_CHANGED`

> **What others see now:**
>
> | Role | What they see |
> |---|---|
> | **Business Owner** | A notification: *approved / approved with conditions / deferred / rejected*. The Outcome view with your rationale. On a defer to them: a banner with *"Committee's reasons: …"* and editable intake. Their **AI assessment card unlocks** once the decision is final |
> | **Risk Analyst** | The Committee view changes to *"Committee decision recorded — View outcome →"*. The Audit Trail and exports appear on Outcome. On a defer to them: a notification and a fresh review form with your reasons |
> | **Admin** | Everything, including the committee notifications (Admins receive committee notifications too) |

**When a deferred request comes back to you:** it reappears under **Pending decision** as a new revision. The previous decision is kept in history, and the final Outcome will say *"Decided on revision N after M deferral(s)."*

---

## 7. After the decision: outcome, conditions, audit

### Outcome view

- The title: Approved / Approved with conditions / Rejected, with *"— all conditions met"* added when that applies.
- *"Final rating: X (system residual NN.N, methodology vN)"*.
- *"Committee rationale (name): …"*.

### Approval conditions (read-only for you)

- *"{verified} of {total} verified · {n} overdue"*.
- Each condition's status: Open / Evidence submitted / Verified, plus the evidence and verification notes.
- When all are verified you get *"All conditions met on CR-…"*, and the request closes as **"Approved — conditions met"**.

### Audit Trail and exports

- Automatic chain check: 🟢 *"Chain verified"* / 🔴 *"Chain broken"*.
- **Examiner pack (PDF)** · **JSON** · **CSV**. The PDF keeps the system, AI, analyst and committee outputs **separate**, and includes the SLA, methodology, cited regulations and the full hash-chained trail.

---

## 8. Proposing a methodology change

**What is the methodology?** It is the **rulebook** the risk engine uses: category weights, rating bands, floors, concentration rules, override policy, SLA targets, control credits and factor scores. Each set of rules is a **version** (v1.0, v1.1, …). Only one version is **Active** at a time, and every assessment remembers which version scored it.

**Why maker-checker?** Changing a weight re-rates every *future* request across the whole bank. One person must not be able to do that alone. **You propose, an Admin approves**, and the system blocks anyone from approving their own proposal.

### The Methodology page

- Header: *"Active: vX · approved by {name} · since {date}"*.
- Tabs: **Methodology** · **Framework basis** · **Versions** · **Training suggestions**.

### Step 1: Propose a change

Click **Propose a change**. This creates a **Draft** copy of the active version, numbered +0.1 (e.g. v1.0 → v1.1).

- Only **one** open draft or pending version can exist at a time.
- While one exists, the button changes to **"v1.1 is in draft"** or **"v1.1 is awaiting approval"**. Clicking it opens that version.

### Step 2: Edit the draft

**Only the person who created the draft can save it.**

| Card | What you can edit | Rules |
|---|---|---|
| **Category weights** | The 7 weights (0–1) | Must add up to **1.00**. The total turns red otherwise |
| **Rating bands and residual floors** | Upper bounds of LOW, MEDIUM and HIGH (CRITICAL is fixed at 100), and the floor per inherent band | Bounds must increase |
| **Risk concentration rules** | The floor of each rule | 0–100 |
| **Override escalation policy** | Bands needing acknowledgement (default 1); bands that escalate (default 2); minimum downgrade reason length (default 40); ☐ escalate below a concentration floor; ☐ escalated downgrades can't be approved unconditionally | 1 ≤ acknowledge ≤ escalate ≤ 3 |
| **Workflow SLA** | Total target (48h), at-risk % (75), stage targets (8/12/12/16h), default condition due days (30) | > 0 |
| **Controls and residual risk** | Residual method (Average of all controls / Per risk category), and the credit points for Effective, Partially effective, Ineffective and Not tested | Effective ≥ Partial ≥ Ineffective |
| **Factor thresholds** | High transaction velocity (5); large customer population (100000) | Positive |
| **Factor catalog** | Score and weight of each factor | Factors can't be added or removed |

**What changed and why** (required to submit): for example, *"Raise fraud weight after the mule-account typology review (ref. FIU-IND advisory)…"*

**Changes from vX** lists every difference automatically.

Click **Save draft** as you go.

### Step 3: Run impact preview (strongly recommended)

Click **Run impact preview**. The card is titled *"What-if impact on the current portfolio"*.

- Every assessed request is re-scored under your draft. **Nothing stored changes.**
- Summary chips: *"N requests · N rating(s) up · N rating(s) down · N unchanged"*.
- A table shows each request's Current vs Proposed residual and rating, with **Δ residual** in red (riskier) or green (lower). Rows where the rating changes are highlighted.

**Why:** you and the Admin can see exactly who would be affected before anything goes live.

### Step 4: Submit for approval

Click **Submit for approval**. It saves first, then submits.

- The status becomes **Pending approval**, and all Admins get *"Methodology vX pending approval"*.
- You'll see *"Waiting for an Admin to approve this change before it is used."*

### Step 5: Outcome

| Outcome | What it means |
|---|---|
| Admin **approves** | You get *"Methodology vX approved and now in use"*. The old version becomes **Retired** |
| Admin **rejects** | You get *"Methodology vX rejected"*, with the reason. A rejected version is final; propose a new draft if needed |

**Existing assessments are never re-rated.** The new version applies only to calculations run after approval.

### Other tabs

- **Framework basis:** every category, factor and concentration rule mapped to its regulatory source (RBI KYC MD paragraphs, PMLA rules, FATF recommendations, Wolfsberg).
- **Versions:** the full history (Version, Status, Change, Proposed by, Approved by). Click a row to open it.
- **Lifecycle** (on each version): the append-only log, e.g. draft created → submitted → approved and published.

---

## 9. Training suggestions from the Admin

The Admin can run **model training**. The system studies past decisions (how analysts actually rated cases) and suggests new **category weights**. When the Admin **shares** a run, you get the notification *"Suggested methodology weights from model training"*.

### Methodology → Training suggestions tab

- Each card shows *"Training run #N — {cases} decided cases · shared by X"*, plus the message and a table (Category / Current / Suggested / Change).
- **Start a draft from this** creates a methodology draft with those weights, then follows the normal edit → impact preview → submit → Admin approval flow.
- It is disabled (*"Finish the open draft first"*) while another draft or pending version exists.

**Why it's your decision:** training is a statistical suggestion. You decide whether it makes risk sense before anything changes.

The **Analytics → Override learning loop** section also offers hints like *"Consider increasing Geography weight"*. Use them as input for proposals.

---

## 10. Uploading a regulation

The **Regulations** page holds the documents the system searches for evidence.

### Upload a regulation

The form notes: *"Your upload goes to an Admin for approval before analysts can cite it."*

| Field | Notes |
|---|---|
| Document * | PDF or .txt, up to 25 MB |
| Title * | e.g. "Master Direction on KYC (Amendment) 2026" |
| Issuing authority * | Default "RBI" |
| Document type | Master Direction, Circular… |
| Reference / circular number | — |
| Effective from | A future date means it becomes searchable only from that date |
| Replaces an existing document | Pick the old version. Once approved, the old one stops being cited and open requests that relied on it are flagged |
| What changed | Free text |

Click **Upload**. The result: *"Uploaded. An Admin must approve it before it is used as evidence."*

### What happens next

1. Admins are notified.
2. When the Admin approves, the document is indexed and becomes **Active** ("Searchable"). You get *"Approved: {title}"*, or *"Rejected: {title}"* with a reason.
3. If your upload replaces an older document, the old one becomes **Superseded**. Analysts working on open requests that cited it get *"Re-check evidence for CR-…"*.

**Why approval?** Evidence drives regulatory justification, so a second person must confirm a document is genuine and current.

Other features: filters (In use / Awaiting approval / Superseded / withdrawn / All), expanding a row for details and "Open requests citing this document", and **Download**.

---

## 11. Assessments and Analytics pages

### Assessments

- *"Analyst-reviewed requests awaiting a decision, and the decisions already recorded."*
- It opens on **Analyst reviewed**: your to-do list.

### Analytics

- Portfolio charts and the **Intake-to-decision SLA** section. Watch **Open requests against SLA**: committee review has a 16-hour target.
- The **Override learning loop** (downgrade rate, categories and factors in downgraded cases, suggested drafts) is your evidence base for methodology proposals.

---

## 12. Notifications you receive

| When | Title |
|---|---|
| An analyst submits a review | Request CR-… ready for committee |
| An analyst's downgrade is escalated | Escalated override on CR-… |
| All conditions on a request are verified | All conditions met on CR-… |
| The committee stage reaches 75% of its 16h target | Committee decision due within Nh on CR-… |
| The committee stage is over target | Committee review overdue on CR-… |
| The overall 48h SLA is at risk or breached | Intake-to-decision SLA at risk / breached on CR-… |
| An Admin shares a training run | Suggested methodology weights from model training |
| Your methodology is approved or rejected | Methodology vX approved and now in use / rejected |
| Your regulation upload is approved or rejected | Approved / Rejected: {title} |

---

## 13. FAQ and troubleshooting

**Submit Committee Decision stays grey.**
Check the rationale, the acknowledgement note, the defer target, and that conditions have text.

**I can't pick Approve.**
The analyst's downgrade was escalated. Choose Approve with conditions, Defer or Reject.

**"Propose a change" is missing.**
A draft or pending version already exists. Click the amber "vX is in draft / awaiting approval" button.

**Save draft gives a permission error.**
Only the committee member who created the draft can edit it.

**How do I delete a draft?**
There's currently no delete or withdraw option. Submit it, and an Admin can reject it.

**I can't see a request the analyst says they sent.**
It must be in committee review. Check the **All** filter, and ask whether the analyst actually clicked **Submit Analyst Review**.
