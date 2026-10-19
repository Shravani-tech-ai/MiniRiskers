# MiniRiskers User Guide

This folder explains how to use MiniRiskers, role by role. Each guide covers every button you can press, what it does, why it matters, and **what the other roles see at that moment**.

| Guide | Read this if you… |
|---|---|
| [01 – Business Owner](01-Business-Owner.md) | propose new products or changes and need them risk-assessed |
| [02 – Risk Analyst](02-Risk-Analyst.md) | run the risk assessment and review the system's rating |
| [03 – Risk Committee](03-Risk-Committee.md) | make the final decision, and propose changes to the scoring rules |
| [04 – Admin](04-Admin.md) | run the system: users, approvals, audit, training, libraries and settings |

---

## The whole process on one page

```text
 BUSINESS OWNER          RISK ANALYST                          RISK COMMITTEE          
 ──────────────          ────────────                          ──────────────          
 1. Create request  ──►  3. Run risk assessment                                        
 2. Fill intake +        4. Add controls (residual risk)                               
    Submit               5. Continue → AI draft                                        
                         6. Submit analyst review  ─────────►  7. Decide:               
                                                                  Approve               
                                                                  Approve w/ conditions 
                                                                  Defer ──┐             
                                                                  Reject  │             
        ▲                        ▲                                        │             
        └──── Defer to Business Owner (inputs must change) ◄──────────────┤             
                                 └── Defer to Risk Analyst (reassess) ◄───┘             

 8. (If conditions) Business Owner submits evidence → Risk Analyst verifies → "Conditions met"
 9. Business Owner rates the experience (1–5 stars)

 ADMIN can do every step above, and also approves methodology changes and regulations,
 manages users and settings, runs model training and exports audit evidence.
```

### The five workflow stages

These are the labels in the **Track your Progress** stepper and the page footer:

| Stage | Internal name | Who acts | What happens |
|---|---|---|---|
| **Request** | `REQUEST_CREATED` | Business Owner | The intake form is filled in and submitted |
| **Risk** | `RISK_ASSESSMENT` | Risk Analyst | The system scores risk, finds regulations, and the analyst adds controls |
| **Analyst** | `ANALYST_REVIEW` | Risk Analyst | The analyst accepts or overrides the rating |
| **Committee** | `COMMITTEE_REVIEW` | Risk Committee | The final decision is made |
| **Done** | `COMPLETED` | everyone | The outcome, any conditions, and the audit trail |

### Status labels you will see on requests

| Label | Meaning |
|---|---|
| Draft | The Business Owner is still filling it in |
| Submitted | It is in the Risk Analyst queue and nothing has run yet |
| In risk assessment | The analyst has calculated risk |
| Analyst review | The AI draft is ready and the analyst is reviewing it |
| Committee review | It is waiting for the committee's decision |
| Approved | Approved, and the request is closed |
| Approved — conditions open | Approved, but conditions still need evidence or verification |
| Approved — conditions met | All conditions have been verified, and the request is closed |
| Returned for rework | The committee sent it back to the Business Owner |
| Deferred for reassessment | The committee sent it back to the Risk Analyst |
| Rejected | Rejected, and the request is closed |

### Who sees which requests

| Role | Requests you can see |
|---|---|
| Business Owner | Only requests **you** created |
| Risk Analyst | Only **submitted** requests that are unassigned or assigned to you. Drafts, and requests returned to the Business Owner, are hidden |
| Risk Committee | Only requests that have **reached committee review**, or later stages |
| Admin | Everything |

### Who sees which menu items

| Menu item | Business Owner | Risk Analyst | Risk Committee | Admin |
|---|:-:|:-:|:-:|:-:|
| Requests (Dashboard) | ✅ | ✅ | ✅ | ✅ |
| Assessments | ✅ | ✅ | ✅ | ✅ |
| Track your Progress | ✅ | ✅ | ✅ | ✅ |
| Analytics | ✅ (no override section) | ✅ | ✅ | ✅ |
| Methodology | ❌ | ✅ read-only | ✅ propose | ✅ approve |
| Regulations | ❌ | ✅ read-only | ✅ upload | ✅ approve |
| Admin console | ❌ | ❌ | ❌ | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ |

---

## Things every role shares

### Signing in

1. Open the app at `http://localhost:5173/` and click **Sign in**.
2. **Pick your role card** (Business Owner, Risk Analyst, Risk Committee or Admin).
3. Enter your username (or email) and password, then click **Sign in as {Role}**.

If you pick the wrong card, you will see *"This account is not registered as {Role}. Change role and try again."* Click **Change role** to pick again.

**Development accounts:**

| Username | Password |
|---|---|
| `business_owner` | `dev-business-owner` |
| `risk_analyst` | `dev-risk-analyst` |
| `risk_committee` | `dev-risk-committee` |
| `admin` | `dev-admin` |

**Creating an account:** go to **Create account**, then fill in Full name, Username (lowercase letters, numbers and `_` only), Email, Role and Password (at least 8 characters). You are then sent to sign in; you are **not** logged in automatically.

**Session:** your login lasts 8 hours, and closing the browser tab logs you out.

**Log out:** click your name in the top-right header. On a phone-sized screen, use the **log out icon** at the top right.

### Notifications (bell icon)

- The bell checks for new notifications every **30 seconds** and shows the unread count.
- New notifications also pop up as **toasts** (up to 3 at a time, each for 10 seconds; hover over one to pause it).
- Clicking a notification marks it read and takes you to the request. Clicking **X** on a toast only hides it; it stays unread.
- **Mark all read** clears every unread notification.
- You can switch whole categories off in **Settings → Notifications**: Workflow updates, Committee decisions, Approval conditions, SLA reminders and Methodology changes.

### Settings page (all roles)

| Card | What you can do |
|---|---|
| **Account** | Change your **Full name** and **Email**, then click **Save profile**. Your username and role cannot be changed here |
| **Password** | Enter your current password and the new one twice, then click **Change password** |
| **Appearance** | Choose Light, Dark or System (follows your computer). This is saved in this browser only |
| **Notifications** | Turn each notification category on or off. It saves immediately |

### Track your Progress page (all roles)

- Pick a request from the dropdown to see a 5-step stepper (Request → Risk → Analyst → Committee → Done) with the time each step was reached.
- Click any completed step to open the request on that stage.
- Below the stepper is the **SLA panel**. The target is **48 hours** from submission to committee decision, and it shows time used, time remaining and time per stage.

| SLA status | Meaning |
|---|---|
| Not submitted | The clock has not started |
| On track | Less than 75% of the target time used |
| At risk | 75% or more used |
| Paused (with owner) | The request was returned to the Business Owner. The clock stops |
| SLA breached | Over 48 hours and still open |
| SLA met / SLA missed | Decided within, or after, 48 hours |

Stage targets: Awaiting analyst 8h · Risk assessment 12h · Analyst review 12h · Committee review 16h.

---

## Good to know

1. **Approval-condition evidence is a text note**, not a file upload. Reference where the proof lives (ticket number, document link, etc.).
2. **A one-band downgrade** by the analyst sends no special notification to the committee. The committee sees the acknowledgement box when it opens the request. Only **escalated** overrides send an extra notification.
3. **Changing your Full name** in Settings carries your requests over to the new name. The exception is when another account shares your old name; then ask an Admin.
