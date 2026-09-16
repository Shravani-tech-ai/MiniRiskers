import { ShieldCheck } from "lucide-react";

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

function CommitteeDecision({
  riskAssessment,
  analystRating,
  aiAssessment,
  committeeDecision,
  setCommitteeDecision,
  committeeConditions,
  setCommitteeConditions,
  committeeReason,
  setCommitteeReason,
  committeeSubmitted,
  submitCommitteeDecision,
}) {
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
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Analyst Rating</p>
              <div className="mt-2"><span className="text-2xl font-bold text-slate-900">{analystRating || "Not Submitted"}</span></div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI Recommendation</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{aiAssessment?.recommendation || riskAssessment?.ai_recommendation || "Not Generated"}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Committee Decision</label>
          <p className="mt-1 text-xs text-slate-500">Select the final outcome for this change request.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <button type="button" onClick={() => setCommitteeDecision("APPROVE")} className={`rounded-lg border p-4 text-left transition ${committeeDecision === "APPROVE" ? "border-green-500 bg-green-50 ring-2 ring-green-100" : "border-slate-200 hover:border-green-300"}`}>
              <p className="font-semibold text-slate-900">Approve</p>
              <p className="mt-1 text-xs text-slate-500">Approve the proposed change without additional conditions.</p>
            </button>
            <button type="button" onClick={() => setCommitteeDecision("APPROVE_WITH_CONDITIONS")} className={`rounded-lg border p-4 text-left transition ${committeeDecision === "APPROVE_WITH_CONDITIONS" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}>
              <p className="font-semibold text-slate-900">Approve with Conditions</p>
              <p className="mt-1 text-xs text-slate-500">Approve subject to specified controls or monitoring conditions.</p>
            </button>
            <button type="button" onClick={() => setCommitteeDecision("DEFER")} className={`rounded-lg border p-4 text-left transition ${committeeDecision === "DEFER" ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100" : "border-slate-200 hover:border-amber-300"}`}>
              <p className="font-semibold text-slate-900">Defer</p>
              <p className="mt-1 text-xs text-slate-500">Additional analysis, evidence, or controls are required.</p>
            </button>
            <button type="button" onClick={() => setCommitteeDecision("REJECT")} className={`rounded-lg border p-4 text-left transition ${committeeDecision === "REJECT" ? "border-red-500 bg-red-50 ring-2 ring-red-100" : "border-slate-200 hover:border-red-300"}`}>
              <p className="font-semibold text-slate-900">Reject</p>
              <p className="mt-1 text-xs text-slate-500">Do not approve the proposed change.</p>
            </button>
          </div>
        </div>

        {committeeDecision === "APPROVE_WITH_CONDITIONS" && (
          <div>
            <label className="text-sm font-semibold text-slate-700">Approval Conditions</label>
            <p className="mt-1 text-xs text-slate-500">Specify the conditions that must be satisfied before or after implementation.</p>
            <textarea value={committeeConditions} onChange={(e) => setCommitteeConditions(e.target.value)} rows={4} placeholder="Example: Enhanced transaction monitoring must be enabled before go-live..." className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-slate-700">Committee Rationale</label>
          <p className="mt-1 text-xs text-slate-500">Record the reasoning behind the final committee decision.</p>
          <textarea value={committeeReason} onChange={(e) => setCommitteeReason(e.target.value)} rows={5} placeholder="Explain the basis for the committee decision..." className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          {committeeSubmitted ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">✓</span>
              Committee decision recorded
            </div>
          ) : (
            <p className="text-xs text-slate-400">This decision represents the final governance outcome.</p>
          )}
          {!committeeSubmitted && (
            <button onClick={submitCommitteeDecision} disabled={!committeeDecision} className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50">
              Submit Committee Decision
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommitteeDecision;
