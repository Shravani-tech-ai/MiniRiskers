import { AlertTriangle, Plus, ShieldCheck, Trash2 } from "lucide-react";

function getRiskClass(rating) {
  switch (rating) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "LOW":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

const DECISIONS = [
  {
    key: "APPROVE",
    label: "Approve",
    description: "Approve the proposed change without additional conditions. Closes the request.",
    active: "border-green-500 bg-green-50 ring-2 ring-green-100",
    hover: "hover:border-green-300",
  },
  {
    key: "APPROVE_WITH_CONDITIONS",
    label: "Approve with Conditions",
    description: "Approve subject to conditions. Each condition is tracked until the analyst verifies the owner's evidence.",
    active: "border-blue-500 bg-blue-50 ring-2 ring-blue-100",
    hover: "hover:border-blue-300",
  },
  {
    key: "DEFER",
    label: "Defer",
    description: "Send the request back for rework. It returns to the committee as a new revision.",
    active: "border-amber-500 bg-amber-50 ring-2 ring-amber-100",
    hover: "hover:border-amber-300",
  },
  {
    key: "REJECT",
    label: "Reject",
    description: "Do not approve the proposed change. The request is closed.",
    active: "border-red-500 bg-red-50 ring-2 ring-red-100",
    hover: "hover:border-red-300",
  },
];

const DEFER_TARGETS = [
  {
    key: "BUSINESS_OWNER",
    label: "Business Owner",
    description: "Inputs or controls must change. Intake reopens; the SLA clock pauses until resubmission.",
  },
  {
    key: "RISK_ANALYST",
    label: "Risk Analyst",
    description: "The assessment needs another look (e.g. an override needs better support).",
  },
];

function OverridePanel({ review, acknowledgement, setAcknowledgement, canSubmit }) {
  if (!review || !review.escalation_level || review.escalation_level === "NONE") {
    return null;
  }
  const escalated = review.escalation_level === "ESCALATED";
  return (
    <div
      className={`rounded-lg border p-4 ${
        escalated ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-sm font-semibold ${
          escalated ? "text-red-800" : "text-amber-900"
        }`}
      >
        <AlertTriangle size={16} />
        {escalated
          ? "Escalated analyst override"
          : "Analyst override requires acknowledgement"}
      </div>
      <p className={`mt-2 text-sm ${escalated ? "text-red-800" : "text-amber-900"}`}>
        {review.reviewed_by || "The analyst"} lowered the system rating from{" "}
        <b>{review.system_rating}</b> to <b>{review.analyst_rating}</b>.
      </p>
      {review.escalation_reasons?.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {review.escalation_reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      {review.override_reason && (
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium">Analyst's reason:</span> {review.override_reason}
        </p>
      )}
      {escalated && (
        <p className="mt-2 text-sm font-medium text-red-800">
          Unconditional approval is not available for this request.
        </p>
      )}
      {review.acknowledged_by ? (
        <p className="mt-3 text-sm text-slate-700">
          Acknowledged by {review.acknowledged_by}: {review.acknowledgement_note}
        </p>
      ) : (
        <>
          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Committee acknowledgement of the override
          </label>
          <textarea
            value={acknowledgement}
            onChange={(e) => setAcknowledgement(e.target.value)}
            rows={3}
            disabled={!canSubmit}
            placeholder="Record why the committee accepts (or does not accept) the analyst's lower rating..."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-50"
          />
        </>
      )}
    </div>
  );
}

function ConditionsEditor({ conditions, setConditions, disabled }) {
  const update = (index, patch) =>
    setConditions(conditions.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">Approval conditions</label>
      <p className="mt-1 text-xs text-slate-500">
        Each condition is tracked separately: the Business Owner submits evidence and the Risk Analyst verifies it.
        Leave the due date empty to use the methodology default.
      </p>
      <div className="mt-3 space-y-3">
        {conditions.map((condition, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 md:flex-row md:items-start">
            <textarea
              value={condition.description}
              onChange={(e) => update(index, { description: e.target.value })}
              rows={2}
              disabled={disabled}
              placeholder="e.g. Enhanced transaction monitoring enabled before go-live"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
            <input
              type="date"
              value={condition.due_date || ""}
              onChange={(e) => update(index, { due_date: e.target.value })}
              disabled={disabled}
              aria-label="Due date"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 md:w-44"
            />
            <button
              type="button"
              onClick={() => setConditions(conditions.filter((_, i) => i !== index))}
              disabled={disabled || conditions.length === 1}
              aria-label="Remove condition"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setConditions([...conditions, { description: "", due_date: "" }])}
        disabled={disabled}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        <Plus size={15} />
        Add condition
      </button>
    </div>
  );
}

function CommitteeDecision({
  riskAssessment,
  analystRating,
  analystReview,
  aiAssessment,
  committeeDecision,
  setCommitteeDecision,
  committeeConditions,
  setCommitteeConditions,
  committeeReason,
  setCommitteeReason,
  deferTarget,
  setDeferTarget,
  overrideAcknowledgement,
  setOverrideAcknowledgement,
  committeeSubmitted,
  submitCommitteeDecision,
  canSubmit = true,
}) {
  const approveBlocked = analystReview?.escalation_level === "ESCALATED";
  const needsAck =
    analystReview?.escalation_level &&
    analystReview.escalation_level !== "NONE" &&
    !analystReview.acknowledged_by;
  const editable = canSubmit && !committeeSubmitted;

  const readyToSubmit =
    committeeDecision &&
    committeeReason.trim() &&
    (!needsAck || overrideAcknowledgement.trim()) &&
    (committeeDecision !== "DEFER" || deferTarget) &&
    (committeeDecision !== "APPROVE_WITH_CONDITIONS" ||
      committeeConditions.some((c) => c.description.trim())) &&
    !(committeeDecision === "APPROVE" && approveBlocked);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-purple-100 p-2.5">
            <ShieldCheck size={22} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Risk Committee Decision</h3>
            <p className="mt-1 text-sm text-slate-500">Final governance checkpoint for the proposed change.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-sm font-medium text-purple-900">Final human decision</p>
          <p className="mt-1 text-sm leading-6 text-purple-700">
            The Risk Committee reviews the FCRM assessment, analyst review, risk factors, controls, and regulatory evidence before making the final decision.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Decision Context</h4>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">System Residual Risk</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">{riskAssessment?.residual_score?.toFixed(1) || "—"}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(riskAssessment?.residual_rating)}`}>
                  {riskAssessment?.residual_rating || "—"}
                </span>
              </div>
              {riskAssessment?.risk_model_version && (
                <p className="mt-2 text-xs text-slate-400">Methodology v{riskAssessment.risk_model_version}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Analyst Rating</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">{analystRating || "Not Submitted"}</span>
                {analystReview?.override_direction && analystReview.override_direction !== "NONE" && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {analystReview.override_direction === "DOWNGRADE" ? "Lowered" : "Raised"}{" "}
                    {Math.abs(analystReview.band_delta)} band{Math.abs(analystReview.band_delta) > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI Recommendation</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{aiAssessment?.recommendation || riskAssessment?.ai_recommendation || "Not Generated"}</p>
            </div>
          </div>
        </div>

        <OverridePanel
          review={analystReview}
          acknowledgement={overrideAcknowledgement}
          setAcknowledgement={setOverrideAcknowledgement}
          canSubmit={editable}
        />

        <div>
          <label className="text-sm font-semibold text-slate-700">Committee Decision</label>
          <p className="mt-1 text-xs text-slate-500">Select the outcome for this change request.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {DECISIONS.map((option) => {
              const blocked = option.key === "APPROVE" && approveBlocked;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setCommitteeDecision(option.key)}
                  disabled={!editable || blocked}
                  className={`rounded-lg border p-4 text-left transition disabled:cursor-not-allowed ${
                    committeeDecision === option.key ? option.active : `border-slate-200 ${option.hover}`
                  } ${blocked ? "opacity-50" : ""}`}
                >
                  <p className="font-semibold text-slate-900">{option.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {blocked
                      ? "Not available: the analyst's downgrade was escalated."
                      : option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {committeeDecision === "APPROVE_WITH_CONDITIONS" && (
          <ConditionsEditor
            conditions={committeeConditions}
            setConditions={setCommitteeConditions}
            disabled={!editable}
          />
        )}

        {committeeDecision === "DEFER" && (
          <div>
            <label className="text-sm font-semibold text-slate-700">Send back to</label>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {DEFER_TARGETS.map((target) => (
                <button
                  key={target.key}
                  type="button"
                  onClick={() => setDeferTarget(target.key)}
                  disabled={!editable}
                  className={`rounded-lg border p-4 text-left transition ${
                    deferTarget === target.key
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100"
                      : "border-slate-200 hover:border-amber-300"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{target.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{target.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-slate-700">
            {committeeDecision === "DEFER" ? "What must change (shared with the recipient)" : "Committee Rationale"}
          </label>
          <p className="mt-1 text-xs text-slate-500">Record the reasoning behind the committee decision.</p>
          <textarea value={committeeReason} onChange={(e) => setCommitteeReason(e.target.value)} rows={5} disabled={!editable} placeholder="Explain the basis for the committee decision..." className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-50" />
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          {committeeSubmitted ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">✓</span>
              Committee decision recorded
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              {needsAck ? "Acknowledge the analyst override before deciding." : "This decision is recorded in the audit trail."}
            </p>
          )}
          {editable && (
            <button onClick={submitCommitteeDecision} disabled={!readyToSubmit} className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50">
              Submit Committee Decision
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommitteeDecision;
