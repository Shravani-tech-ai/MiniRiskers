# Admin Guide

> **Your job in one sentence:** oversee and run the system. You approve methodology changes and regulations, manage users and settings, check audit integrity, run model training, maintain the control library, and step in on any request when needed.

You are the **"checker"** in the system's maker-checker controls, and the only role with full access.

Shared topics (signing in, notifications, Settings, Track your Progress) are in the [index](README.md).

> **Note:** the old **Auditor** role has been retired. Its audit work (chain verification and examiner exports) now belongs to you.

---

## Contents

1. [What you can and cannot do](#1-what-you-can-and-cannot-do)
2. [Your menu](#2-your-menu)
3. [Your Dashboard ("System Overview")](#3-your-dashboard-system-overview)
4. [Working on requests (you can do every step)](#4-working-on-requests-you-can-do-every-step)
5. [Admin console overview](#5-admin-console-overview)
6. [Tab: Overview](#6-tab-overview)
7. [Approving methodology changes](#7-approving-methodology-changes)
8. [Approving and managing regulations](#8-approving-and-managing-regulations)
9. [Tab: Model training](#9-tab-model-training)
10. [Tab: Feedback](#10-tab-feedback)
11. [Tab: Control library](#11-tab-control-library)
12. [Tab: Users](#12-tab-users)
13. [Tab: Audit](#13-tab-audit)
14. [Tab: Settings](#14-tab-settings)
15. [Notifications you receive](#15-notifications-you-receive)
16. [FAQ and troubleshooting](#16-faq-and-troubleshooting)

---

## 1. What you can and cannot do

| ✅ You can | ❌ You cannot |
|---|---|
| See **every** request, including drafts | **Propose** a methodology change (the Risk Committee does that) |
| Create requests, and edit intake **at any stage** | Approve a methodology version you created |
| Run the risk pipeline, add controls, write the analyst review | Approve a regulation you uploaded yourself |
| Record committee decisions | Verify condition evidence that you submitted yourself |
| Submit and verify condition evidence (but not both for the same item) | Change your own role, or deactivate yourself |
| Approve or reject methodology versions | Edit a user's name, email or password from the console |
| Upload regulations (auto-approved), approve, reject or withdraw them | |
| Manage users, settings and the control library | |
| Run model training and share it with the committee | |
| Verify every audit chain and export portfolio-wide evidence | |

> **Good practice:** use your power to fix or unblock problems, not to replace the normal roles. Every action you take is recorded in the audit trail under your name.

---

## 2. Your menu

All eight items: **Requests**, **Assessments**, **Track your Progress**, **Analytics**, **Methodology**, **Regulations**, **Admin console** (only you) and **Settings**.

---

## 3. Your Dashboard ("System Overview")

The subtitle reads: *"Financial crime risk assessment workbench — monitor intake, workflow, and residual risk across change requests."*

- **New request** button.
- **Stat cards:** Total requests · Drafts · In progress · Completed · High / critical.
- **Filters:** All · Draft · Submitted · In review · Decided · High priority.
- **Action button:** always **Open assessment**.
- **Risk overview bar:** residual rating distribution across everything.

---

## 4. Working on requests (you can do every step)

On a request page you have **all** permissions combined. See the [Business Owner](01-Business-Owner.md), [Risk Analyst](02-Risk-Analyst.md) and [Risk Committee](03-Risk-Committee.md) guides for each step's buttons.

Admin-specific points:

| Area | What's different for you |
|---|---|
| **Intake** | The Intake panel and Save buttons stay available **even after submission**. Use this to correct a typo instead of deferring the request. Every edit is audited |
| **Submit** | You can submit a draft on the Business Owner's behalf |
| **Risk pipeline and controls** | You see **Run risk assessment →**, the Controls section and **Continue to analyst review →**, just like an analyst |
| **Analyst review** | You can submit it |
| **Committee decision** | You see the full decision workspace and can decide |
| **Conditions** | You can submit evidence **and** verify, but **not for the same condition**: *"Evidence cannot be verified by the person who submitted it."* |
| **Audit Trail** | Shown on **every** view of the request (other roles only see it on Done), with **Examiner pack (PDF) / JSON / CSV** |

**Notifications:** Admins are included as a fallback in analyst notifications (when no analyst is assigned) and in **all committee notifications**. Turn categories off in Settings if this is too much.

---

## 5. Admin console overview

Open **Admin console** from the menu. The page reads *"Approvals, audit, model training, feedback, the control library and system settings."*

Tabs: **Overview** · **Model training** · **Feedback** · **Control library** · **Users** · **Audit** · **Settings**

---

## 6. Tab: Overview

Your **daily starting point**.

### Stat cards

| Card | Meaning | Click |
|---|---|---|
| **Waiting for your approval** | Pending methodology versions plus pending regulations (amber if above 0) | — |
| **Open requests** | Requests not yet Done | — |
| **Average feedback** | Business Owner star rating, *"X / 5"* | → Feedback tab |
| **System matches final rating** | % of decided cases where the system's residual rating equals the final rating | → Model training tab |

### "Approvals" panel

*"Changes the Risk Committee submitted for your sign-off"*:

- **Methodology changes pending approval** → *"N · Review"* opens /methodology.
- **Regulations uploaded by the Risk Committee** → *"N · Review"* opens /regulations.
- **Regulations whose indexing failed** → *"N · Fix"*.
- **Users on a retired role (e.g. Auditor) who cannot sign in** → *"N · Assign role"* opens the Users tab.

### "Model training" panel

- How many decided cases are available versus the minimum needed.
- The last run's message.
- **Open model training →**.

---

## 7. Approving methodology changes

**Background:** the methodology is the rulebook for scoring. See the [Committee guide, section 8](03-Risk-Committee.md#8-proposing-a-methodology-change) for everything a draft can change.

The lifecycle:

```text
Committee:  DRAFT ──(Submit for approval)──► PENDING APPROVAL
            (the proposer can Withdraw a draft or a pending version → WITHDRAWN)
Admin:                                         ├─(Approve and publish)─► ACTIVE  (old ACTIVE → RETIRED)
                                               └─(Reject + note)───────► REJECTED (final)
```

### Your steps

1. Notification: *"Methodology vX pending approval"*, or Overview → Approvals → Review.
2. On **Methodology**, open the pending version. Read:
   - **What changed and why**: the proposer's explanation.
   - **Changes from vY**: every changed value, shown as *path: from → to*.
   - Any **validation errors**, in red.
3. Click **Run impact preview** to see how many existing ratings would go **up**, go **down** or stay **unchanged**, request by request.
4. Type into *"Approval note (required to reject)…"*, then click:

| Button | Effect |
|---|---|
| **Approve and publish** | The note is optional. The version becomes **Active** immediately, and the previous Active version becomes **Retired**. All **new** risk calculations use it; stored assessments are **not** re-rated. The proposer gets *"Methodology vX approved and now in use"* |
| **Reject** | **A note is required.** The version becomes **Rejected** (final). The proposer gets *"Methodology vX rejected"* with your note |

**Why you, and why not the proposer?** Two-person control. The backend refuses with *"Maker-checker: the proposer of a methodology change cannot approve it."* Admins can't propose at all, so the two roles never overlap.

> **What others see now:**
>
> - **Committee:** the new Active version in the header, *"Active: vX · approved by {you}"*.
> - **Analysts:** new risk calculations show *"Risk Model vX"*.
> - Earlier assessments keep their original version number.

---

## 8. Approving and managing regulations

On the **Regulations** page, your view opens on **Awaiting approval** if anything is pending.

### Statuses

| Status | Cited as evidence? | Meaning |
|---|---|---|
| Pending approval | ❌ | Uploaded by the Committee, waiting for you |
| **Active** | ✅ (once "Searchable") | In use |
| Superseded | ❌ (kept for audit) | Replaced by a newer document |
| Withdrawn | ❌ (kept for audit) | Removed by an Admin |
| Rejected | ❌ | Not accepted |

### Index labels (Active documents)

**Searchable** · **Searchable from effective date** · **Indexing…** · **Not indexed** · **Indexing failed** · **Indexing skipped**

### Your buttons

| Situation | Button | Effect |
|---|---|---|
| Pending document | **Approve** | Becomes Active, and indexing starts (*"Approved. Indexing has started."*). The uploader is notified. **Disabled on your own upload** (*"You cannot approve your own upload"*) |
| Pending document | **Reject** + note | Becomes Rejected, and the uploader gets your reason |
| Active document | **Withdraw** + reason | Stops being cited. Analysts on open requests that cited it get *"Re-check evidence for CR-…"* (*"Withdrawn. Affected open requests were flagged."*) |
| Indexing failed or Not indexed | **Retry indexing** | Re-runs indexing (*"Re-indexing started."*) |
| Any document with a file | **Download** | Saves the file |

### Uploading yourself

The form is the same as in the [Committee guide, section 10](03-Risk-Committee.md#10-uploading-a-regulation), but **your uploads are approved immediately**: *"Uploaded and approved. It becomes searchable once indexing finishes."*

### Superseding

Choose **"Replaces an existing document"** in the upload form. When the new document finishes indexing:

- The old one becomes **Superseded**.
- Open requests that cited it are flagged with an audit event `REGULATORY_SOURCE_CHANGED`, and the analyst is notified.

> A replacement with a *future* effective date still supersedes the old one as soon as it's approved and indexed. Upload it close to its effective date.

**Why it matters:** analysts must never cite an outdated rule. Old versions stay for audit, so past decisions remain explainable.

---

## 9. Tab: Model training

**What it is:** the system learns from how analysts **actually** rated decided cases, and suggests better category weights. **It never changes scoring by itself.**

### Stat cards

| Card | Meaning |
|---|---|
| Decided cases | Available to learn from |
| System matches final rating | % agreement between the system and the final rating |
| Analyst upgrades | Cases rated higher than the system |
| Analyst downgrades | Cases rated lower than the system |

### "Calibrate methodology weights"

Click **Run training** (*"Training…"*).

- It uses decided cases (Approved, Approved with conditions, Conditions met, Rejected) that have a final rating, limited by the Settings below.
- **Fewer than the minimum** (default 10): *"Not enough data — Only N decided case(s)… at least M are needed."*
- **Otherwise:** *"Completed — Fitted on N decided cases. Exact agreement with final ratings X% now vs Y% with the suggested weights (+Z points)."*

**Each run card shows:**

- The Category weight table: Current / Suggested / Change.
- *"Exact agreement: a% now → b% suggested (within one band: c% → d%)."*
- The caveat: *"Agreement is measured on the same cases the weights were fitted on, so it is optimistic. Use it to compare, not as a forecast."*

### Share with Risk Committee

- **Share with Risk Committee** sends the suggestion to all committee members (*"Suggested methodology weights from model training"*).
- The card then shows *"Shared with the Risk Committee {date}"*, and later *"· draft started"* once they adopt it.

**The full governed loop:**

```text
Admin: Run training → Share
Committee: "Start a draft from this" → edit → impact preview → Submit for approval
Admin: Approve and publish
```

You **cannot** adopt a run yourself. This keeps the risk judgement with the committee and the sign-off with you.

### Training settings (embedded)

The same as in the Settings tab: minimum and maximum cases, lookback, AI learning on/off, and the number of AI examples.

### Other panels

- **Agreement by month:** whether the system is getting closer to analysts' judgement over time.
- **Why analysts override:** counts per override reason code.
- **AI draft feedback:** *"X% helpful (h of t)"*, plus not-helpful reasons.
- **AI models used:** which Gemini model produced each draft.

---

## 10. Tab: Feedback

This covers Business Owner ratings, collected after requests close.

| Card | Meaning |
|---|---|
| Average rating | X / 5 |
| Responses | Count |
| Response rate | Responses as a share of closed requests |
| Feedback window | N days |

**Panels:**

- **Rating distribution:** 1–5 stars.
- **What owners mention:** tag counts (e.g. "Too slow", "Clear explanation").
- **Average rating by month.**
- **Low ratings (1–2 stars) — Follow up on these first:** up to 20.
- **Recent comments:** up to 20.

**Embedded setting:** Feedback window (days).

**Why:** low ratings point at friction in the process. Follow them up.

---

## 11. Tab: Control library

This is the standard catalogue of controls analysts pick from. *"Each control is mapped to the risk categories it mitigates, so residual risk can be reduced only where a control actually applies."*

**Table columns:** Control (code, name, 🔑 key, regulatory refs, Inactive tag) · Mitigates · Type · nature · frequency · Owner · ✏️ edit.

**Add control / ✏️ edit form:**

| Field | Notes |
|---|---|
| Code * | e.g. `TM-02`, stored uppercase, must be unique |
| Name * | — |
| Description | — |
| Mitigates risk categories | Chips for the 7 categories. None selected means "All" |
| Type | Preventive / Detective / Corrective |
| Nature | Manual / Automated / Hybrid |
| Frequency | Continuous / Per event / Daily / Weekly / Monthly / Quarterly / Annual |
| Default design rating | Effective / Partially effective / Ineffective / Not tested |
| Default operating rating | Same options (default Not tested) |
| Owner | — |
| Regulatory references | — |
| ☐ Key control | — |
| ☐ Available to analysts | Untick to **deactivate**. There is no delete, so history stays intact |

**Buttons:** **Add to library** / **Save changes**, and **Cancel**.

The library starts with 13 controls: CDD-01, EDD-01, SCR-01, PEP-01, TM-01, STR-01, LIM-01, DIG-01, FRD-01, TPR-01, REC-01, GEO-01, TRN-01.

**Why mapping matters:** under the "Per risk category" residual method, a sanctions-screening control only reduces Geography or Customer risk, not Fraud.

---

## 12. Tab: Users

*"Change a user's role or deactivate their account. Users signed in with an old role are signed out on their next request."*

| Column | What you can do |
|---|---|
| User | Full name ("(you)" on your row), username and email. **Read-only** |
| Role | Choose Business Owner / Risk Analyst / Risk Committee / Admin |
| Joined | Read-only |
| Active | Tick or untick to activate or deactivate |

- Changes **take effect immediately**. The user's next action signs them out if their role changed or they were deactivated.
- **Your own row is locked.** You can't demote or deactivate yourself, so the system always keeps at least one Admin.
- **Retired Auditor accounts** show *"AUDITOR (retired, choose a role)"*. Those users see *"This account's role has been retired. Ask an Admin to assign a current role."* until you pick a role.
- Name, email and password can only be changed by the user, in **Settings**.

---

## 13. Tab: Audit

### "Audit trail integrity"

*"Every request's audit events are hash-chained and append-only. Verification recomputes every chain and reports any event that was changed or removed."*

Click **Verify all requests**. The result is one of:

- 🟢 *"All N audit chains are intact (M events)."*
- 🔴 *"X of N audit chains failed verification."*, followed by *"Request CR-…: {issue}"*. Possible issues:
  - *"Event is not sealed (no hash)."*
  - *"Chain link broken: … an event was removed or reordered."*
  - *"Content hash mismatch: the event was modified after it was recorded."*

**How it works (simply):**

- Each event stores a fingerprint (SHA-256 hash) of its content **plus the previous event's fingerprint**.
- Changing, deleting or reordering any event breaks every link after it.
- On SQLite, the database also refuses edits and deletes of audit rows.

### "Examiner export"

| Button | File |
|---|---|
| **Audit trail (CSV)** | `audit-trail-YYYYMMDD.csv`: every event across all requests |
| **Full audit packs (JSON)** | `audit-export-YYYYMMDD.json`: every request's inputs, system / AI / analyst / committee outputs, methodology and verified trail |

For one request's **PDF** examiner pack, open the request. The Audit Trail card is on every view for you.

---

## 14. Tab: Settings

*"System settings — All configurable settings in one place."* Each row shows a description, its default, and *"Last changed by X on date"*. **Save** is enabled once you change something.

| Setting | Default | Range | What it does |
|---|---|---|---|
| Feedback window (days) | 5 | 1–90 | How long Business Owners can rate a closed request |
| Minimum decided cases to train | 10 | 5–10000 | Training refuses to run below this |
| Most recent decided cases to use (0 = all) | 200 | 0–100000 | Limits training to the newest cases. Must be ≥ the minimum, or 0 |
| Only use cases closed in the last N days (0 = no limit) | 0 | 0–3650 | Keeps training focused on recent decisions |
| Give the AI past decided cases as examples | On | on/off | Adds similar decided cases to the AI assessment prompt, so drafts reflect how the bank actually judges |
| Examples given to the AI | 3 | 1–10 | How many similar cases go into each prompt |

> Scoring rules (weights, SLA targets, override policy) are **not** here. They live in the **Methodology**, and change only through Committee proposal plus your approval.

### Environment settings (`.env`, set by whoever runs the server)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI BRD extraction and AI assessment drafts |
| `JWT_SECRET`, `JWT_EXPIRE_MINUTES` (480) | Login token security and duration |
| `ALLOW_ADMIN_SELF_SIGNUP` (true) | Whether anyone can sign up as Admin. When false, the Signup page hides the Admin option. **Set it to false outside development** |
| `DEV_PASSWORD_*` | Override seeded development passwords |

---

## 15. Notifications you receive

| When | Title |
|---|---|
| The Committee submits a methodology version | Methodology vX pending approval |
| The Committee uploads a regulation | Regulation awaiting approval: {title} |
| A Business Owner submits (no analyst assigned) | New request CR-… submitted |
| An analyst submits a review | Request CR-… ready for committee |
| An escalated override occurs | Escalated override on CR-… |
| Condition evidence is submitted (no analyst assigned) | Evidence submitted for CR-… |
| All conditions are met | All conditions met on CR-… |
| SLA reminders (analyst and committee stages) | … due within Nh / overdue / SLA at risk / breached |
| A cited regulation changes (no analyst assigned) | Re-check evidence for CR-… |

---

## 16. FAQ and troubleshooting

**The Approve button on a methodology version is missing.**
You either created it (impossible for Admins), or it isn't **Pending approval** yet.

**Approve is disabled on a regulation.**
You uploaded it yourself, and another Admin must approve. Admin uploads are normally auto-approved, so this mainly affects older uploads.

**A regulation shows "Indexing failed".**
Click **Retry indexing**. Check that the file has selectable text.

**A user says they can't log in.**
In **Users**, check that they are **Active** and don't hold a retired role.

**"The AI assessment could not be generated because GEMINI_API_KEY is not configured…"**
Add `GEMINI_API_KEY` to the backend `.env` and restart the backend.

**Training says "Not enough data".**
Lower *Minimum decided cases to train* in Settings, or wait for more decisions.

**An audit chain failed.**
Treat it as a security incident. The failing event and the reason are listed. Export the evidence before investigating.
