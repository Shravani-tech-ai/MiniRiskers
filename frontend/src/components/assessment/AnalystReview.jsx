import { useEffect, useState } from "react";
import { AlertTriangle, CornerUpLeft, ShieldAlert } from "lucide-react";

import api from "../../services/api";

function getRiskClass(rating) {
  switch (rating) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900";
    case "HIGH":
      return "bg-orange-100 dark:bg-orange-950/40 text-orange-700 border-orange-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "LOW":
      return "bg-green-100 text-green-700 dark:text-green-300 border-green-200";
    default:
      return "bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
}

const ESCALATION_STYLES = {
  ESCALATED: "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800",
  ACKNOWLEDGE: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300",
  NONE: "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900",
};

function OverrideConsequences({ preview }) {
  if (!preview || preview.direction === "NONE") {
    return null;
  }
  const level = preview.escalation_level;
  const title =
    level === "ESCALATED"
      ? "This override will be escalated to the committee"
      : level === "ACKNOWLEDGE"
        ? "The committee must acknowledge this override"
        : "Conservative override";
  return (
    <div className={`rounded-lg border p-4 ${ESCALATION_STYLES[level] || ESCALATION_STYLES.NONE}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle size={16} />
        {title}
      </div>
      {preview.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {preview.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {preview.consequences.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function DeferralNotice({ deferral, audience }) {
  if (!deferral) {
    return null;
  }
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-5 py-4 text-orange-900">
      <CornerUpLeft size={20} className="mt-0.5 shrink-0 text-orange-600" />
      <div className="text-sm leading-6">
        <p className="font-semibold">
          {audience === "BUSINESS_OWNER"
            ? "The Risk Committee returned this request to you for rework"
            : "The Risk Committee deferred this request for reassessment"}
          {deferral.decided_by ? ` (${deferral.decided_by})` : ""}.
        </p>
        <p className="mt-1">
          <span className="font-medium">Committee's reasons:</span> {deferral.rationale}
        </p>
        <p className="mt-1 text-orange-800 dark:text-orange-300">
          {audience === "BUSINESS_OWNER"
            ? "Update the inputs or controls and resubmit. The SLA clock is paused while the request is with you."
            : `This is revision ${(deferral.revision || 1) + 1}. Record a fresh analyst review for the committee.`}
        </p>
      </div>
    </div>
  );
}

function AnalystReview({
  changeRequestId,
  deferral,
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
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!analystRating || !changeRequestId || analystReviewed) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/change-requests/${changeRequestId}/override-preview`, {
        params: { analyst_rating: analystRating },
      })
      .then((response) => !cancelled && setPreview(response.data))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [analystRating, changeRequestId, analystReviewed]);

  const minChars = preview?.min_reason_chars || 0;

  return (
    <div className="mt-6">
    <DeferralNotice deferral={deferral} audience="RISK_ANALYST" />
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-slate-200 p-2.5">
            <ShieldAlert size={22} className="text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">FCRM Analyst Review</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review the system and AI assessment before making the final risk determination.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/40 p-4">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Human decision checkpoint</p>
          <p className="mt-1 text-sm leading-6 text-blue-700 dark:text-blue-300">
            The system and AI provide recommendations only. The FCRM analyst is responsible for reviewing the evidence and recording the final assessment rationale.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">System Assessment</h4>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Inherent Risk</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{riskAssessment?.inherent_score?.toFixed(1) || "—"}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(riskAssessment?.inherent_rating)}`}>
                  {riskAssessment?.inherent_rating || "—"}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Residual Risk</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{riskAssessment?.residual_score?.toFixed(1) || "—"}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClass(riskAssessment?.residual_rating)}`}>
                  {riskAssessment?.residual_rating || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">AI Recommendation</h4>
          <div className="mt-4 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">AI Recommendation</span>
              <span className="rounded-full bg-orange-100 dark:bg-orange-950/40 px-3 py-1 text-xs font-semibold text-orange-700">
                {aiAssessment?.recommendation || riskAssessment?.ai_recommendation || "Not Generated"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-indigo-700 dark:text-indigo-300">
              Review the AI recommendation against the underlying risk factors and regulatory evidence before making a decision.
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Analyst Rating</label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Accept the system rating, or select a different rating and explain why.</p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          {!analystReviewed && canSubmit && riskAssessment?.residual_rating && (
            <button
              type="button"
              onClick={() => {
                setAnalystRating(riskAssessment.residual_rating);
                setOverrideReason("");
              }}
              className={[
                "rounded-lg border px-4 py-3 text-sm font-semibold transition",
                analystRating === riskAssessment.residual_rating
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                  : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              {analystRating === riskAssessment.residual_rating ? "✓ " : ""}
              Accept system rating ({riskAssessment.residual_rating})
            </button>
          )}
          <select
            value={analystRating}
            onChange={(e) => {
              setAnalystRating(e.target.value);
              if (e.target.value === riskAssessment?.residual_rating) {
                setOverrideReason("");
              }
            }}
            disabled={analystReviewed || !canSubmit}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 md:w-72"
          >
            <option value="">Select rating</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          </div>
        </div>

        {analystRating && analystRating !== riskAssessment?.residual_rating && (
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reason for Override</label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Required when the analyst rating differs from the system-calculated residual risk.</p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={4}
              placeholder="Explain why the analyst disagrees with the system rating..."
              disabled={analystReviewed || !canSubmit}
              className="mt-3 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
            />
            {minChars > 0 && !analystReviewed && (
              <p
                className={`mt-1 text-xs ${
                  overrideReason.trim().length >= minChars
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {overrideReason.trim().length} / {minChars} characters minimum for a downgrade
              </p>
            )}
          </div>
        )}

        {!analystReviewed && <OverrideConsequences preview={preview} />}

        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Suggestions / Conditions</label>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Record suggested controls, mitigations, or conditions. These are shared with the Business Owner together with the final rating once you submit.</p>
          <textarea
            value={consequences}
            onChange={(e) => setConsequences(e.target.value)}
            rows={4}
            placeholder="Enter additional controls, monitoring conditions, or consequences..."
            className="mt-3 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:ring-indigo-900/40"
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6">
          {analystReviewed ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">✓</span>
              Analyst review recorded
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">Final committee decision remains separate from analyst review.</p>
          )}
          {!analystReviewed && canSubmit && (
            <button onClick={submitAnalystReview} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
              Submit Analyst Review
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export default AnalystReview;
