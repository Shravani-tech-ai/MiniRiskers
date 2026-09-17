import { CheckCircle2 } from "lucide-react";

function CompletedStageSummary({
  changeRequest,
  riskAssessment,
  committeeSubmitted,
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-full bg-emerald-100 p-3">
          <CheckCircle2 className="text-emerald-700" size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Assessment complete
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
                  (score {Number(riskAssessment.residual_score).toFixed(1)})
                </span>
              )}
            </p>
          )}
          {committeeSubmitted && (
            <p className="mt-2 text-sm text-emerald-700">
              Committee decision recorded. Workflow closed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompletedStageSummary;
