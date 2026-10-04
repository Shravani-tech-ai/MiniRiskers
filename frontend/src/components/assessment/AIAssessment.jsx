import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import api from "../../services/api";
import { btnPrimaryMd } from "../../utils/buttonStyles";

function getRiskClass(rating) {
  switch (rating) {
    case "CRITICAL":
      return "bg-red-100 text-red-900 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900";

    case "HIGH":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900";

    case "MEDIUM":
      return "bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-900";

    case "LOW":
      return "bg-green-100 text-green-900 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900";

    default:
      return "bg-slate-100 text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
}


function getScoreColor(score) {
  const numericScore = Number(score || 0);

  if (numericScore >= 76) {
    return "text-red-600 dark:text-red-400";
  }

  if (numericScore >= 51) {
    return "text-orange-600 dark:text-orange-400";
  }

  if (numericScore >= 26) {
    return "text-yellow-600 dark:text-yellow-400";
  }

  return "text-green-600 dark:text-green-400";
}


function formatCategory(category) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function formatRecommendation(recommendation) {
  const text = String(recommendation || "").replaceAll("_", " ").toLowerCase();
  return text
    .replace(/^\w/, (letter) => letter.toUpperCase())
    .replace(/\bfcrm\b/g, "FCRM");
}


// The model is asked for strings but sometimes returns structured objects
// (e.g. {authority, document, page_number, statement}). Rendering an object
// as a React child crashes the page, so always reduce values to text.
function toDisplayText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean).join("; ");
  }

  if (typeof value === "object") {
    const primary =
      value.statement ||
      value.analysis ||
      value.description ||
      value.factor ||
      value.text ||
      value.summary;

    if (primary) {
      return toDisplayText(primary);
    }

    return Object.entries(value)
      .map(([key, item]) => `${formatCategory(key)}: ${toDisplayText(item)}`)
      .join(" · ");
  }

  return String(value);
}


function getSourceLabel(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return "";
  }

  const parts = [
    item.authority,
    item.document,
    item.page_number ? `p. ${item.page_number}` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}


const sectionLabelClass =
  "text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

const panelClass =
  "rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50";

const bodyTextClass = "text-sm leading-7 text-slate-700 dark:text-slate-300";


function CollapsibleSection({ id, title, meta, open, onToggle, children }) {
  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-700">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {title}
          </span>
          {meta && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {meta}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          {open ? "Hide" : "View"}
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          {children}
        </div>
      )}
    </section>
  );
}


function RiskScoreBlock({ risk, tone, label, caption }) {
  const tones = {
    inherent: {
      box: "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
      iconBox: "bg-red-100 dark:bg-red-900/40",
      icon: <ShieldAlert size={20} className="text-red-600 dark:text-red-400" />,
    },
    residual: {
      box: "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30",
      iconBox: "bg-orange-100 dark:bg-orange-900/40",
      icon: (
        <ShieldCheck size={20} className="text-orange-600 dark:text-orange-400" />
      ),
    },
  }[tone];

  return (
    <div className={`rounded-lg border p-5 ${tones.box}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${tones.iconBox}`}>{tones.icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{caption}</p>
        </div>
      </div>

      <div className="mt-5 flex items-end gap-4">
        <span className={`text-4xl font-bold ${getScoreColor(risk.score)}`}>
          {Number(risk.score).toFixed(1)}
        </span>
        <span
          className={`mb-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${getRiskClass(
            risk.rating
          )}`}
        >
          {risk.rating}
        </span>
      </div>

      {risk.analysis && (
        <p className={`mt-4 ${bodyTextClass}`}>{toDisplayText(risk.analysis)}</p>
      )}
    </div>
  );
}


function AIAssessment({
  aiAssessment,
  generatingAI,
  generateAIAssessment,
  canGenerate = true,
  changeRequestId,
  requestNumber,
  stale = false,
}) {
  const [openSections, setOpenSections] = useState({});
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const assessment = aiAssessment?.assessment || {};
  const riskByCategory = assessment.risk_assessment || {};
  const riskCategoryCount =
    riskByCategory && typeof riskByCategory === "object"
      ? Object.keys(riskByCategory).length
      : 0;
  const keyRiskFactors = Array.isArray(assessment.key_risk_factors)
    ? assessment.key_risk_factors
    : [];
  const regulatoryConsiderations = Array.isArray(
    assessment.regulatory_considerations
  )
    ? assessment.regulatory_considerations
    : [];

  // Everything except the executive summary and the recommendation is
  // collapsed by default so the card reads as a summary first.
  const sections = [
    assessment.change_description && {
      id: "change",
      title: "Change description",
      content: (
        <p className={bodyTextClass}>
          {toDisplayText(assessment.change_description)}
        </p>
      ),
    },
    riskCategoryCount > 0 && {
      id: "risk",
      title: "Risk assessment by category",
      meta: `${riskCategoryCount} categories`,
      content: (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.entries(riskByCategory).map(([category, analysis]) => (
            <div key={category} className={`${panelClass} p-4`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {formatCategory(category)}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {toDisplayText(analysis)}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    assessment.inherent_risk && {
      id: "inherent",
      title: "Inherent risk analysis",
      content: (
        <RiskScoreBlock
          risk={assessment.inherent_risk}
          tone="inherent"
          label="Inherent Risk"
          caption="Risk before considering controls"
        />
      ),
    },
    keyRiskFactors.length > 0 && {
      id: "factors",
      title: "Key risk factors",
      meta: keyRiskFactors.length,
      content: (
        <div className="space-y-3">
          {keyRiskFactors.map((factor, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                {toDisplayText(factor)}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    assessment.control_assessment && {
      id: "controls",
      title: "Control assessment",
      content: (
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={19}
            className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
          />
          <p className={bodyTextClass}>
            {toDisplayText(assessment.control_assessment)}
          </p>
        </div>
      ),
    },
    assessment.residual_risk && {
      id: "residual",
      title: "Residual risk analysis",
      content: (
        <RiskScoreBlock
          risk={assessment.residual_risk}
          tone="residual"
          label="Residual Risk"
          caption="Risk after considering controls"
        />
      ),
    },
    regulatoryConsiderations.length > 0 && {
      id: "regulatory",
      title: "Regulatory considerations",
      meta: regulatoryConsiderations.length,
      content: (
        <div className="space-y-3">
          {regulatoryConsiderations.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
            >
              <FileText
                size={18}
                className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400"
              />
              <div>
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {toDisplayText(item)}
                </p>
                {getSourceLabel(item) && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {getSourceLabel(item)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    assessment.rationale && {
      id: "rationale",
      title: "Rationale",
      content: (
        <p className={bodyTextClass}>{toDisplayText(assessment.rationale)}</p>
      ),
    },
  ].filter(Boolean);

  const allOpen =
    sections.length > 0 && sections.every((section) => openSections[section.id]);

  const toggleSection = (id) =>
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));

  const toggleAll = () =>
    setOpenSections(
      allOpen
        ? {}
        : Object.fromEntries(sections.map((section) => [section.id, true]))
    );

  const downloadPdf = async () => {
    try {
      setDownloading(true);
      setDownloadError("");
      const response = await api.get(
        `/change-requests/${changeRequestId}/ai-assessment/pdf`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${requestNumber || changeRequestId}-ai-assessment.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Unable to download the AI assessment PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-900/60 dark:bg-slate-900">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <div className="border-b border-indigo-100 bg-indigo-50 p-6 dark:border-indigo-900/60 dark:bg-indigo-950/40">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded-lg bg-indigo-100 p-2.5 dark:bg-indigo-900/50">
              <Sparkles
                size={22}
                className="text-indigo-600 dark:text-indigo-300"
              />
            </div>

            <div>

              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                AI-Assisted FCRM Assessment
              </h3>

              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                AI prepares the assessment using the calculated risk
                and regulatory evidence. FCRM retains the final decision.
              </p>

            </div>

          </div>

          {aiAssessment && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              {aiAssessment.recommendation && (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                  {formatRecommendation(aiAssessment.recommendation)}
                </span>
              )}
              {changeRequestId && (
                <button
                  type="button"
                  onClick={downloadPdf}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
                >
                  {downloading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  {downloading ? "Preparing PDF..." : "Download PDF"}
                </button>
              )}
            </div>
          )}

        </div>

        {downloadError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {downloadError}
          </p>
        )}

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

          <h4 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
            AI assessment not generated yet
          </h4>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
            Generate an AI-assisted assessment using the calculated
            financial crime risk factors and retrieved regulatory evidence.
          </p>

          <button
            onClick={generateAIAssessment}
            disabled={!canGenerate || generatingAI}
            className={`mt-5 shadow-sm ${btnPrimaryMd}`}
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

        <div className="space-y-6 p-6">

          {stale && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
              />
              <p className="text-sm leading-6 text-amber-800 dark:text-amber-300">
                Risk has changed since this draft was generated. It will be
                regenerated when you continue to analyst review.
              </p>
            </div>
          )}

          {/* ================================================= */}
          {/* MODEL + STATUS */}
          {/* ================================================= */}

          <div className="flex flex-wrap items-center gap-2">

            {aiAssessment.model && (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Model: {aiAssessment.model}
              </span>
            )}

            {aiAssessment.model_version && (
              <span className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Version: {aiAssessment.model_version}
              </span>
            )}

            {aiAssessment.status && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300">
                <CheckCircle2 size={13} />
                {aiAssessment.status}
              </span>
            )}

          </div>


          {/* ================================================= */}
          {/* EXECUTIVE SUMMARY (always visible) */}
          {/* ================================================= */}

          {assessment.executive_summary && (

            <section>

              <h4 className={sectionLabelClass}>Executive Summary</h4>

              <div className={`mt-3 p-5 ${panelClass}`}>
                <p className={bodyTextClass}>
                  {toDisplayText(assessment.executive_summary)}
                </p>
              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* DETAIL SECTIONS (collapsed by default) */}
          {/* ================================================= */}

          {sections.length > 0 && (

            <section>

              <div className="flex items-center justify-between gap-3">
                <h4 className={sectionLabelClass}>Assessment details</h4>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {sections.map((section) => (
                  <CollapsibleSection
                    key={section.id}
                    id={section.id}
                    title={section.title}
                    meta={section.meta}
                    open={Boolean(openSections[section.id])}
                    onToggle={toggleSection}
                  >
                    {section.content}
                  </CollapsibleSection>
                ))}
              </div>

            </section>

          )}


          {/* ================================================= */}
          {/* RECOMMENDATION */}
          {/* ================================================= */}

          {aiAssessment.recommendation && (

            <section>

              <h4 className={sectionLabelClass}>AI Recommendation</h4>

              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/70 dark:bg-amber-950/30">

                <div className="flex items-start gap-3">

                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                  />

                  <div>

                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      {formatRecommendation(aiAssessment.recommendation)}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800/80 dark:text-amber-300/80">
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
