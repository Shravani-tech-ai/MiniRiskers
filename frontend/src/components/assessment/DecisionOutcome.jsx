import { CheckCircle2, ClipboardCheck, XCircle } from "lucide-react";

const OUTCOMES = {
  APPROVE: {
    title: "Approved",
    Icon: CheckCircle2,
    border: "border-emerald-200",
    iconWrap: "bg-emerald-100 text-emerald-700",
    note: "The committee approved the change. Workflow closed.",
  },
  APPROVE_WITH_CONDITIONS: {
    title: "Approved with conditions",
    Icon: ClipboardCheck,
    border: "border-blue-200",
    iconWrap: "bg-blue-100 text-blue-700",
    note: "Approval stands subject to the conditions below. Each is tracked until verified.",
  },
  REJECT: {
    title: "Rejected",
    Icon: XCircle,
    border: "border-red-200",
    iconWrap: "bg-red-100 text-red-700",
    note: "The committee rejected the change. Workflow closed.",
  },
};

function DecisionOutcome({ changeRequest, riskAssessment, decision }) {
  const outcome = OUTCOMES[decision?.decision] || {
    title: "Assessment complete",
    Icon: CheckCircle2,
    border: "border-emerald-200",
    iconWrap: "bg-emerald-100 text-emerald-700",
    note: "",
  };
  const conditionsMet = changeRequest?.status === "CONDITIONS_MET";

  return (
    <div className={`rounded-2xl border ${outcome.border} bg-white p-8 shadow-sm`}>
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-3 ${outcome.iconWrap}`}>
          <outcome.Icon size={28} />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900">
            {outcome.title}
            {conditionsMet && " — all conditions met"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {changeRequest?.request_number} — {changeRequest?.title}
          </p>
          {riskAssessment && (
            <p className="mt-4 text-sm text-slate-700">
              Final rating:{" "}
              <span className="font-bold">
                {riskAssessment.final_rating ||
                  riskAssessment.residual_rating ||
                  riskAssessment.inherent_rating}
              </span>
              {riskAssessment.residual_score != null && (
                <span className="text-slate-500">
                  {" "}
                  (system residual {Number(riskAssessment.residual_score).toFixed(1)}, methodology v
                  {riskAssessment.risk_model_version})
                </span>
              )}
            </p>
          )}
          {decision && (
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">Committee rationale</span>
              {decision.decided_by ? ` (${decision.decided_by})` : ""}: {decision.rationale}
            </p>
          )}
          {outcome.note && <p className="mt-2 text-sm text-slate-500">{outcome.note}</p>}
          {(changeRequest?.revision || 1) > 1 && (
            <p className="mt-2 text-xs text-slate-400">
              Decided on revision {changeRequest.revision} after{" "}
              {changeRequest.revision - 1} deferral{changeRequest.revision > 2 ? "s" : ""}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default DecisionOutcome;
