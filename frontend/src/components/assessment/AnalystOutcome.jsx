import { CheckCircle2, Hourglass, PenLine } from "lucide-react";

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

export function AwaitingAnalystReview({ riskCalculated }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <Hourglass size={34} className="mx-auto text-slate-300" />
      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        Risk results are under analyst review
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {riskCalculated
          ? "The risk assessment has been calculated. It will appear here once the Risk Analyst has reviewed it and either accepted the system rating or recorded their suggestions."
          : "The Risk Analyst has not run the risk assessment yet. Results will appear here after it is calculated and reviewed."}
      </p>
    </div>
  );
}

function AnalystOutcome({ review }) {
  if (!review) {
    return null;
  }

  const accepted = review.analyst_rating === review.system_rating;
  const Icon = accepted ? CheckCircle2 : PenLine;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-lg p-2 ${
              accepted ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
            }`}
          >
            <Icon size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Risk Analyst outcome</h3>
            <p className="mt-1 text-sm text-slate-500">
              {accepted
                ? "The analyst accepted the system-calculated rating."
                : `The analyst adjusted the rating from ${review.system_rating} to ${review.analyst_rating}.`}
              {review.reviewed_by ? ` Reviewed by ${review.reviewed_by}.` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Final rating
          </p>
          <span
            className={`mt-1 inline-block rounded-full border px-3 py-1 text-sm font-bold ${getRiskClass(
              review.analyst_rating
            )}`}
          >
            {review.analyst_rating}
          </span>
        </div>
      </div>

      {(review.override_reason || review.consequences) && (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {review.override_reason && (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reason for adjustment
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
                {review.override_reason}
              </p>
            </div>
          )}
          {review.consequences && (
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Analyst suggestions & conditions
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-amber-900">
                {review.consequences}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalystOutcome;
