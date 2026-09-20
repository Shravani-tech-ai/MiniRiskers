import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Sparkles,
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
  const numericScore = Number(score || 0);

  if (numericScore >= 76) {
    return "text-red-600";
  }

  if (numericScore >= 51) {
    return "text-orange-600";
  }

  if (numericScore >= 26) {
    return "text-yellow-600";
  }

  return "text-green-600";
}


function formatCategory(category) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function AIAssessment({
  aiAssessment,
  generatingAI,
  generateAIAssessment,
  canGenerate = true,
}) {
  return (
    <div className="mt-6 rounded-xl border border-indigo-200 bg-white shadow-sm">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <div className="border-b border-indigo-100 bg-indigo-50/40 p-6">

        <div className="flex items-start justify-between gap-4">

          <div className="flex items-center gap-3">

            <div className="rounded-lg bg-indigo-100 p-2.5">
              <Sparkles
                size={22}
                className="text-indigo-600"
              />
            </div>

            <div>

              <h3 className="font-semibold text-slate-900">
                AI-Assisted FCRM Assessment
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                AI prepares the assessment using the calculated risk
                and regulatory evidence. FCRM retains the final decision.
              </p>

            </div>

          </div>

          {aiAssessment?.recommendation && (
            <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700">
              {aiAssessment.recommendation}
            </span>
          )}

        </div>

      </div>


      {/* ===================================================== */}
      {/* NOT GENERATED */}
      {/* ===================================================== */}

      {!aiAssessment && (

        <div className="p-8 text-center">

          <Sparkles
            size={32}
            className="mx-auto text-indigo-400"
          />

          <h4 className="mt-4 font-semibold text-slate-800">
            AI assessment not generated yet
          </h4>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Generate an AI-assisted assessment using the calculated
            financial crime risk factors and retrieved regulatory evidence.
          </p>

          <button
            onClick={generateAIAssessment}
            disabled={!canGenerate || generatingAI}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {generatingAI ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating Assessment...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate AI Assessment
              </>
            )}

          </button>

        </div>

      )}


      {/* ===================================================== */}
      {/* AI RESULT */}
      {/* ===================================================== */}

      {aiAssessment && (

        <div className="space-y-8 p-6">

          {/* ================================================= */}
          {/* MODEL + STATUS */}
          {/* ================================================= */}

          <div className="flex flex-wrap items-center gap-3">

            {aiAssessment.model && (
              <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Model: {aiAssessment.model}
              </span>
            )}

            {aiAssessment.model_version && (
              <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Version: {aiAssessment.model_version}
              </span>
            )}

            {aiAssessment.status && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                <CheckCircle2 size={13} />
                {aiAssessment.status}
              </span>
            )}

          </div>


          {/* ================================================= */}
          {/* EXECUTIVE SUMMARY */}
          {/* ================================================= */}

          {aiAssessment.assessment?.executive_summary && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Executive Summary
              </h4>

              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-5">

                <p className="text-sm leading-7 text-slate-700">
                  {aiAssessment.assessment.executive_summary}
                </p>

              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* CHANGE DESCRIPTION */}
          {/* ================================================= */}

          {aiAssessment.assessment?.change_description && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Change Description
              </h4>

              <p className="mt-3 text-sm leading-7 text-slate-700">
                {aiAssessment.assessment.change_description}
              </p>

            </section>

          )}


          {/* ================================================= */}
          {/* RISK ASSESSMENT */}
          {/* ================================================= */}

          {aiAssessment.assessment?.risk_assessment && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Risk Assessment
              </h4>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">

                {Object.entries(
                  aiAssessment.assessment.risk_assessment
                ).map(([category, analysis]) => (

                  <div
                    key={category}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {formatCategory(category)}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {analysis}
                    </p>

                  </div>

                ))}

              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* INHERENT RISK */}
          {/* ================================================= */}

          {aiAssessment.assessment?.inherent_risk && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Inherent Risk Analysis
              </h4>

              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-5">

                <div className="flex items-center gap-3">

                  <div className="rounded-lg bg-red-100 p-2">
                    <ShieldAlert
                      size={20}
                      className="text-red-600"
                    />
                  </div>

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Inherent Risk
                    </p>

                    <p className="text-sm text-slate-500">
                      Risk before considering controls
                    </p>

                  </div>

                </div>


                <div className="mt-5 flex items-end gap-4">

                  <span
                    className={`text-4xl font-bold ${getScoreColor(
                      aiAssessment.assessment.inherent_risk.score
                    )}`}
                  >
                    {Number(
                      aiAssessment.assessment.inherent_risk.score
                    ).toFixed(1)}
                  </span>

                  <span
                    className={`mb-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${getRiskClass(
                      aiAssessment.assessment.inherent_risk.rating
                    )}`}
                  >
                    {aiAssessment.assessment.inherent_risk.rating}
                  </span>

                </div>


                {aiAssessment.assessment.inherent_risk.analysis && (
                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {aiAssessment.assessment.inherent_risk.analysis}
                  </p>
                )}

              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* KEY RISK FACTORS */}
          {/* ================================================= */}

          {aiAssessment.assessment?.key_risk_factors?.length > 0 && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Key Risk Factors
              </h4>

              <div className="mt-4 space-y-3">

                {aiAssessment.assessment.key_risk_factors.map(
                  (factor, index) => (

                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"
                    >

                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />

                      <p className="text-sm leading-6 text-slate-700">
                        {factor}
                      </p>

                    </div>

                  )
                )}

              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* CONTROL ASSESSMENT */}
          {/* ================================================= */}

          {aiAssessment.assessment?.control_assessment && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Control Assessment
              </h4>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">

                <div className="flex items-start gap-3">

                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <p className="text-sm leading-7 text-slate-700">
                    {aiAssessment.assessment.control_assessment}
                  </p>

                </div>

              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* RESIDUAL RISK */}
          {/* ================================================= */}

          {aiAssessment.assessment?.residual_risk && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Residual Risk Analysis
              </h4>

              <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50 p-5">

                <div className="flex items-center gap-3">

                  <div className="rounded-lg bg-orange-100 p-2">
                    <ShieldCheck
                      size={20}
                      className="text-orange-600"
                    />
                  </div>

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Residual Risk
                    </p>

                    <p className="text-sm text-slate-500">
                      Risk after considering controls
                    </p>

                  </div>

                </div>


                <div className="mt-5 flex items-end gap-4">

                  <span
                    className={`text-4xl font-bold ${getScoreColor(
                      aiAssessment.assessment.residual_risk.score
                    )}`}
                  >
                    {Number(
                      aiAssessment.assessment.residual_risk.score
                    ).toFixed(1)}
                  </span>

                  <span
                    className={`mb-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${getRiskClass(
                      aiAssessment.assessment.residual_risk.rating
                    )}`}
                  >
                    {aiAssessment.assessment.residual_risk.rating}
                  </span>

                </div>


                {aiAssessment.assessment.residual_risk.analysis && (
                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {aiAssessment.assessment.residual_risk.analysis}
                  </p>
                )}

              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* REGULATORY CONSIDERATIONS */}
          {/* ================================================= */}

          {aiAssessment.assessment?.regulatory_considerations?.length > 0 && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Regulatory Considerations
              </h4>

              <div className="mt-4 space-y-3">

                {aiAssessment.assessment.regulatory_considerations.map(
                  (item, index) => (

                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"
                    >

                      <FileText
                        size={18}
                        className="mt-0.5 shrink-0 text-indigo-500"
                      />

                      <p className="text-sm leading-6 text-slate-700">
                        {item}
                      </p>

                    </div>

                  )
                )}

              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* RECOMMENDATION */}
          {/* ================================================= */}

          {aiAssessment.recommendation && (

            <section>

              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                AI Recommendation
              </h4>

              <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-5">

                <div className="flex items-start gap-3">

                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-orange-600"
                  />

                  <div>

                    <p className="font-semibold text-slate-900">
                      {aiAssessment.recommendation}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This is an AI-generated recommendation and does not
                      constitute the final FCRM decision.
                    </p>

                  </div>

                </div>

              </div>

            </section>

          )}

        </div>

      )}

    </div>
  );
}


export default AIAssessment;