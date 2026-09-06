import { useEffect, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Sparkles,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../services/api";

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

function Assessment() {
  const { changeRequestId } = useParams();
  const navigate = useNavigate();

  const [changeRequest, setChangeRequest] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [regulatoryEvidence, setRegulatoryEvidence] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAssessment();
  }, [changeRequestId]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      setError("");

      const changeRequestResponse = await api.get(
        `/change-requests/${changeRequestId}`
      );

      const riskAssessmentResponse = await api.get(
        `/change-requests/${changeRequestId}/risk-assessment`
      );

      const evidenceResponse = await api.get(
        `/change-requests/${changeRequestId}/regulatory-evidence`
      );

      setChangeRequest(changeRequestResponse.data);
      setRiskAssessment(riskAssessmentResponse.data);
      setRegulatoryEvidence(evidenceResponse.data.evidence || []);

    } catch (error) {
      console.error("Failed to load assessment:", error);

      setError(
        "Unable to load the risk assessment."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">

        <div className="mx-auto max-w-7xl">

          <p className="text-sm text-slate-500">
            Loading risk assessment...
          </p>

        </div>

      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">

        <div className="mx-auto max-w-7xl">

          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Change Requests
          </button>

          <div className="rounded-xl border border-red-200 bg-red-50 p-6">

            <div className="flex items-center gap-3">

              <AlertTriangle
                size={20}
                className="text-red-600"
              />

              <p className="text-sm text-red-700">
                {error}
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ========================================================= */}
      {/* PAGE HEADER */}
      {/* ========================================================= */}

      <div className="border-b border-slate-200 bg-white">

        <div className="mx-auto max-w-7xl px-8 py-6">

          <button
            onClick={() => navigate("/")}
            className="mb-5 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Change Requests
          </button>

          {changeRequest && (
            <>

              <div className="flex items-center gap-3">

                <span className="text-sm font-semibold text-slate-500">
                  {changeRequest.request_number}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {changeRequest.status || "DRAFT"}
                </span>

              </div>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {changeRequest.title}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {changeRequest.business_unit}
                {" • "}
                {changeRequest.product_type}
                {" • "}
                {changeRequest.customer_segment}
              </p>

              <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
                {changeRequest.description}
              </p>

            </>
          )}

        </div>

      </div>


      {/* ========================================================= */}
      {/* MAIN CONTENT */}
      {/* ========================================================= */}

      <main className="mx-auto max-w-7xl px-8 py-8">

        {/* Risk Overview heading */}

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-xl font-semibold text-slate-900">
              Risk Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Calculated financial crime risk across key assessment dimensions
            </p>

          </div>

          {riskAssessment && (
            <span className="text-xs text-slate-400">
              Risk Model v{riskAssessment.risk_model_version}
            </span>
          )}

        </div>


        {/* ========================================================= */}
        {/* RISK CATEGORY CARDS */}
        {/* ========================================================= */}

        {riskAssessment && (
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
        )}


        {/* ========================================================= */}
        {/* INHERENT + RESIDUAL RISK */}
        {/* ========================================================= */}

        {riskAssessment && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

            {/* INHERENT */}

            <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-red-50 p-2">

                  <ShieldAlert
                    size={22}
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


              <div className="mt-6 flex items-end gap-4">

                <span
                  className={`text-5xl font-bold ${getScoreColor(
                    riskAssessment.inherent_score
                  )}`}
                >
                  {Number(
                    riskAssessment.inherent_score
                  ).toFixed(1)}
                </span>

                <span
                  className={`mb-1 rounded-full border px-3 py-1.5 text-sm font-semibold ${getRiskClass(
                    riskAssessment.inherent_rating
                  )}`}
                >
                  {riskAssessment.inherent_rating}
                </span>

              </div>

            </div>


            {/* RESIDUAL */}

            <div className="rounded-xl border border-orange-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-orange-50 p-2">

                  <ShieldAlert
                    size={22}
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


              <div className="mt-6 flex items-end gap-4">

                <span
                  className={`text-5xl font-bold ${getScoreColor(
                    riskAssessment.residual_score
                  )}`}
                >
                  {Number(
                    riskAssessment.residual_score
                  ).toFixed(1)}
                </span>

                <span
                  className={`mb-1 rounded-full border px-3 py-1.5 text-sm font-semibold ${getRiskClass(
                    riskAssessment.residual_rating
                  )}`}
                >
                  {riskAssessment.residual_rating}
                </span>

              </div>

            </div>

          </div>
        )}


        {/* ========================================================= */}
        {/* AI RECOMMENDATION */}
        {/* ========================================================= */}

        {riskAssessment && (
          <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">

            <div className="flex items-start gap-4">

              <div className="rounded-lg bg-indigo-50 p-3">

                <Sparkles
                  size={22}
                  className="text-indigo-600"
                />

              </div>

              <div className="flex-1">

                <div className="flex items-center justify-between">

                  <div>

                    <h3 className="font-semibold text-slate-900">
                      AI-Assisted Recommendation
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      AI prepares the assessment; FCRM retains the final decision.
                    </p>

                  </div>

                  <span className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-semibold text-orange-700">
                    {riskAssessment.ai_recommendation}
                  </span>

                </div>

              </div>

            </div>

          </div>
        )}


        {/* ========================================================= */}
        {/* NEXT SECTIONS PLACEHOLDER */}
        {/* ========================================================= */}

        <div className="mt-8">

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            {/* Evidence Header */}

            <div className="border-b border-slate-200 p-6">

                <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                    <div className="rounded-lg bg-blue-50 p-2">

                    <FileText
                        size={20}
                        className="text-blue-600"
                    />

                    </div>

                    <div>

                    <h3 className="font-semibold text-slate-900">
                        Regulatory Evidence
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                        Regulatory sources retrieved to support the risk assessment
                    </p>

                    </div>

                </div>


                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">

                    {regulatoryEvidence.length} Evidence Records

                </span>

                </div>

            </div>


            {/* Evidence Records */}

            <div className="divide-y divide-slate-100">

                {regulatoryEvidence.length === 0 ? (

                <div className="p-6">

                    <p className="text-sm text-slate-500">
                    No regulatory evidence available.
                    </p>

                </div>

                ) : (

                regulatoryEvidence.map((evidence, index) => (

                    <div
                    key={evidence.id || index}
                    className="p-6"
                    >

                    {/* Top row */}

                    <div className="flex items-start justify-between gap-4">

                        <div className="flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {evidence.authority || "Unknown Authority"}
                            </span>

                            {evidence.page_number && (

                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">

                                Page {evidence.page_number}

                            </span>

                            )}

                        </div>


                        <h4 className="mt-3 font-semibold text-slate-900">

                            {evidence.document_name ||
                            "Regulatory Document"}

                        </h4>

                        </div>


                        {/* Relevance */}

                        {evidence.relevance_score !== null &&
                        evidence.relevance_score !== undefined && (

                        <div className="text-right">

                            <p className="text-xs text-slate-400">
                            Retrieval Score
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-700">
                            {Number(
                                evidence.relevance_score
                            ).toFixed(4)}
                            </p>

                        </div>

                        )}

                    </div>


                    {/* Query */}

                    {evidence.query && (

                        <div className="mt-4 rounded-lg bg-slate-50 p-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Regulatory Query
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-700">
                            {evidence.query}
                        </p>

                        </div>

                    )}


                    {/* Evidence text */}

                    {evidence.evidence_text && (

                        <div className="mt-4">

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Evidence
                        </p>

                        <p className="mt-2 text-sm leading-7 text-slate-600">
                            {evidence.evidence_text}
                        </p>

                        </div>

                    )}


                    {/* Source reference */}

                    {evidence.source_reference && (

                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">

                        <FileText size={14} />

                        <span>
                            {evidence.source_reference}
                        </span>

                        </div>

                    )}

                    </div>

                ))

                )}

            </div>

            </div>


          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">

              <Sparkles
                size={20}
                className="text-slate-500"
              />

              <h3 className="font-semibold text-slate-900">
                AI Assessment
              </h3>

            </div>

            <p className="mt-3 text-sm text-slate-500">
              AI-generated FCRM assessment will appear here.
            </p>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Assessment;