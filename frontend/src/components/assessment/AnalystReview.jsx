import { ShieldAlert } from "lucide-react";

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

function AnalystReview({
  riskAssessment,
  aiAssessment,
  analystRating,
  setAnalystRating,
  overrideReason,
  setOverrideReason,
  consequences,
  setConsequences,
  analystReviewed,
  submitAnalystReview,
  canSubmit = true,
}) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-200 p-2.5">
            <ShieldAlert size={22} className="text-slate-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">FCRM Analyst Review</h3>
            <p className="mt-1 text-sm text-slate-500">
              Review the system and AI assessment before making the final risk determination.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Human decision checkpoint</p>
          <p className="mt-1 text-sm leading-6 text-blue-700">
            The system and AI provide recommendations only. The FCRM analyst is responsible for reviewing the evidence and recording the final assessment rationale.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">System Assessment</h4>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Inherent Risk</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">{riskAssessment?.inherent_score?.toFixed(1) || "—"}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(riskAssessment?.inherent_rating)}`}>
                  {riskAssessment?.inherent_rating || "—"}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Residual Risk</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900">{riskAssessment?.residual_score?.toFixed(1) || "—"}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(riskAssessment?.residual_rating)}`}>
                  {riskAssessment?.residual_rating || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">AI Recommendation</h4>
          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-900">AI Recommendation</span>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                {aiAssessment?.recommendation || riskAssessment?.ai_recommendation || "Not Generated"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-indigo-700">
              Review the AI recommendation against the underlying risk factors and regulatory evidence before making a decision.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">Analyst Rating</label>
          <p className="mt-1 text-xs text-slate-500">Select the rating determined by the FCRM analyst.</p>
          <select
            value={analystRating}
            onChange={(e) => {
              setAnalystRating(e.target.value);
              if (e.target.value === riskAssessment?.residual_rating) {
                setOverrideReason("");
              }
            }}
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 md:w-72"
          >
            <option value="">Select rating</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        {analystRating && analystRating !== riskAssessment?.residual_rating && (
          <div>
            <label className="text-sm font-semibold text-slate-700">Reason for Override</label>
            <p className="mt-1 text-xs text-slate-500">Required when the analyst rating differs from the system-calculated residual risk.</p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={4}
              placeholder="Explain why the analyst disagrees with the system rating..."
              className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-slate-700">Consequences / Conditions</label>
          <p className="mt-1 text-xs text-slate-500">Record any additional conditions, mitigations, or consequences associated with the analyst decision.</p>
          <textarea
            value={consequences}
            onChange={(e) => setConsequences(e.target.value)}
            rows={4}
            placeholder="Enter additional controls, monitoring conditions, or consequences..."
            className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          {analystReviewed ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">✓</span>
              Analyst review recorded
            </div>
          ) : (
            <p className="text-xs text-slate-400">Final committee decision remains separate from analyst review.</p>
          )}
          {!analystReviewed && canSubmit && (
            <button onClick={submitAnalystReview} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Submit Analyst Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalystReview;
