import {
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

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

function getScoreColor(score) {
  if (score >= 76) {
    return "text-red-600";
  }

  if (score >= 51) {
    return "text-orange-600";
  }

  if (score >= 26) {
    return "text-yellow-600";
  }

  return "text-green-600";
}

function RiskCard({ title, score }) {
  const numericScore = Number(score || 0);

  let rating = "LOW";

  if (numericScore >= 76) {
    rating = "CRITICAL";
  } else if (numericScore >= 51) {
    rating = "HIGH";
  } else if (numericScore >= 26) {
    rating = "MEDIUM";
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <div className="mt-3 flex items-end justify-between">

        <span
          className={`text-3xl font-bold ${getScoreColor(
            numericScore
          )}`}
        >
          {numericScore.toFixed(1)}
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskClass(
            rating
          )}`}
        >
          {rating}
        </span>

      </div>

    </div>
  );
}

function RiskOverview({
  riskAssessment,
  runningRiskAssessment,
  runRiskAssessment,
  canRun = true,
}) {
  return (
    <div className="mt-8">

      {/* ======================================================= */}
      {/* RUN RISK ASSESSMENT */}
      {/* ======================================================= */}

      <div className="mb-8 rounded-xl border border-indigo-200 bg-indigo-50/40 p-6">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <h3 className="text-xl font-bold text-slate-900 lg:text-2xl">
              Run Financial Crime Risk Assessment
            </h3>

            <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
              Generate risk factors, calculate inherent and residual risk,
              and retrieve relevant regulatory evidence for this change request.
            </p>

            <p className="mt-2 text-xs text-slate-500">
              AI assessment and final FCRM decision are completed separately.
            </p>

          </div>

          <button
            onClick={runRiskAssessment}
            disabled={!canRun || runningRiskAssessment}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {runningRiskAssessment ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Running Assessment...
              </>
            ) : (
              <>
                <ShieldAlert size={17} />
                Run Risk Assessment
              </>
            )}

          </button>

        </div>

      </div>


      {/* ======================================================= */}
      {/* RISK OVERVIEW HEADER */}
      {/* ======================================================= */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold text-slate-900">
            Risk Overview
          </h2>

          <p className="mt-2 text-base text-slate-600">
            Calculated financial crime risk across key assessment dimensions
          </p>

        </div>

        {riskAssessment && (
          <span className="text-xs text-slate-400">
            Risk Model v{riskAssessment.risk_model_version}
          </span>
        )}

      </div>


      {/* ======================================================= */}
      {/* RISK CATEGORY CARDS */}
      {/* ======================================================= */}

      {riskAssessment ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

          <RiskCard
            title="Customer"
            score={riskAssessment.customer_risk_score}
          />

          <RiskCard
            title="Product"
            score={riskAssessment.product_risk_score}
          />

          <RiskCard
            title="Geography"
            score={riskAssessment.geography_risk_score}
          />

          <RiskCard
            title="Transaction"
            score={riskAssessment.transaction_risk_score}
          />

          <RiskCard
            title="Channel"
            score={riskAssessment.channel_risk_score}
          />

          <RiskCard
            title="Third Party"
            score={riskAssessment.third_party_risk_score}
          />

          <RiskCard
            title="Fraud"
            score={riskAssessment.fraud_risk_score}
          />

        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">

          <ShieldAlert
            size={30}
            className="mx-auto text-slate-300"
          />

          <p className="mt-3 text-sm font-medium text-slate-700">
            Risk assessment not generated yet
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Complete the assessment inputs and run the risk assessment
            to generate the risk overview.
          </p>

        </div>
      )}


      {/* ======================================================= */}
      {/* INHERENT + RESIDUAL RISK */}
      {/* ======================================================= */}

      {riskAssessment && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* INHERENT RISK */}

          <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-red-50 p-2">
                <ShieldAlert
                  size={22}
                  className="text-red-600"
                />
              </div>

              <div>

                <h3 className="font-semibold text-slate-900">
                  Inherent Risk
                </h3>

                <p className="text-xs text-slate-500">
                  Risk before considering controls
                </p>

              </div>

            </div>

            <div className="mt-6">

              <div className="flex items-end gap-3">

                <span className="text-4xl font-bold text-slate-900">
                  {riskAssessment.inherent_score?.toFixed(1) || "—"}
                </span>

                <span
                  className={`mb-1 rounded-full border px-3 py-1 text-xs font-semibold ${getRiskClass(
                    riskAssessment.inherent_rating
                  )}`}
                >
                  {riskAssessment.inherent_rating || "—"}
                </span>

              </div>

            </div>

          </div>


          {/* RESIDUAL RISK */}

          <div className="rounded-xl border border-green-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-green-50 p-2">
                <ShieldCheck
                  size={22}
                  className="text-green-600"
                />
              </div>

              <div>

                <h3 className="font-semibold text-slate-900">
                  Residual Risk
                </h3>

                <p className="text-xs text-slate-500">
                  Risk after considering controls
                </p>

              </div>

            </div>

            <div className="mt-6">

              <div className="flex items-end gap-3">

                <span
                  className={`text-4xl font-bold ${getScoreColor(
                    Number(riskAssessment.residual_score || 0)
                  )}`}
                >
                  {riskAssessment.residual_score?.toFixed(1) || "—"}
                </span>

                <span
                  className={`mb-1 rounded-full border px-3 py-1 text-xs font-semibold ${getRiskClass(
                    riskAssessment.residual_rating
                  )}`}
                >
                  {riskAssessment.residual_rating || "—"}
                </span>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default RiskOverview;