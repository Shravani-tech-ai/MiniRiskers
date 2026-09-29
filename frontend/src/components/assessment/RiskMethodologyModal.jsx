import { useEffect, useState } from "react";
import { ChevronDown, Download, Loader2, X } from "lucide-react";

import api from "../../services/api";

function getRiskClass(rating) {
  switch (rating) {
    case "CRITICAL":
      return "bg-red-100 text-red-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700";
    case "LOW":
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function RatingBadge({ rating }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRiskClass(
        rating
      )}`}
    >
      {rating || "—"}
    </span>
  );
}

function Section({ step, title, children }) {
  return (
    <section>
      <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs text-indigo-700">
          {step}
        </span>
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Formula({ children }) {
  return (
    <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
      {children}
    </p>
  );
}

function CategoryRow({ category }) {
  const [open, setOpen] = useState(false);
  const hasFactors = category.factors.length > 0;

  return (
    <>
      <tr
        className={hasFactors ? "cursor-pointer hover:bg-slate-50" : ""}
        onClick={() => hasFactors && setOpen(!open)}
      >
        <td className="px-3 py-2.5 font-medium text-slate-800">
          <span className="inline-flex items-center gap-1.5">
            <ChevronDown
              size={14}
              className={[
                "transition",
                hasFactors ? "text-slate-400" : "invisible",
                open ? "" : "-rotate-90",
              ].join(" ")}
            />
            {category.label}
          </span>
          <span className="ml-2 text-xs text-slate-400">
            {category.factors.length} factor
            {category.factors.length === 1 ? "" : "s"}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{category.score}</td>
        <td className="px-3 py-2.5 text-right tabular-nums">
          × {category.model_weight}
        </td>
        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
          {category.weighted_contribution}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
          {category.share_of_inherent_pct}%
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-3 pb-3 pt-1">
            <table className="w-full text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1.5 pl-6 text-left font-semibold">Factor</th>
                  <th className="py-1.5 text-right font-semibold">Score</th>
                  <th className="py-1.5 text-right font-semibold">Weight</th>
                  <th className="py-1.5 text-right font-semibold">Score × weight</th>
                  <th className="py-1.5 text-right font-semibold">Evidence</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {category.factors.map((factor) => (
                  <tr key={factor.name} className="border-t border-slate-200">
                    <td className="py-1.5 pl-6">
                      {factor.name}
                      <span className="ml-1.5 text-slate-400">
                        ({factor.value})
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{factor.score}</td>
                    <td className="py-1.5 text-right tabular-nums">{factor.weight}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {factor.weighted_score}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {factor.evidence_count}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-300 font-semibold">
                  <td className="py-1.5 pl-6">
                    Category score = {category.factors
                      .reduce((sum, f) => sum + f.weighted_score, 0)
                      .toFixed(2)}{" "}
                    ÷ {category.total_factor_weight}
                  </td>
                  <td colSpan={4} className="py-1.5 text-right tabular-nums">
                    {category.score}
                  </td>
                </tr>
              </tbody>
            </table>
            {category.framework_basis?.length > 0 && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">Supervisory framework basis</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {category.framework_basis.map((ref) => (
                    <li key={`${ref.source}-${ref.clause}`}>
                      {ref.source_title} — {ref.clause}
                    </li>
                  ))}
                </ul>
                {category.factors.some((f) => f.framework_basis?.length) && (
                  <ul className="mt-2 space-y-0.5">
                    {category.factors.map((factor) => (
                      <li key={factor.name}>
                        <span className="font-medium">{factor.name}:</span>{" "}
                        {(factor.framework_basis || [])
                          .map((ref) => `${ref.source_title.split(" — ")[0]} ${ref.clause}`)
                          .join("; ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function RiskMethodologyModal({ changeRequestId, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/change-requests/${changeRequestId}/risk-methodology`)
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
              "Unable to load the risk methodology."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [changeRequestId]);

  useEffect(() => {
    const handleKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const downloadPdf = async () => {
    try {
      setDownloading(true);
      const response = await api.get(
        `/change-requests/${changeRequestId}/risk-methodology/pdf`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${
        report?.change_request?.request_number || changeRequestId
      }-risk-methodology.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const residual = report?.residual;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-full w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {report?.change_request?.request_number || "Risk methodology"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              How this risk was calculated
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5 text-sm text-slate-700">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Building methodology…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {report && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Inherent
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {report.assessment.inherent_score}
                    </span>
                    <RatingBadge rating={report.assessment.inherent_rating} />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Control effectiveness
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {report.controls.average_effectiveness}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Residual
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {report.assessment.residual_score}
                    </span>
                    <RatingBadge rating={report.assessment.residual_rating} />
                  </div>
                </div>
              </div>

              <Section step={1} title="Inputs taken into consideration">
                <p className="mb-3 text-slate-600">
                  {report.factor_count} risk factors were triggered from the
                  submitted intake sections.
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.inputs_considered.map((section) => (
                    <span
                      key={section.section}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium",
                        section.provided
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-500",
                      ].join(" ")}
                    >
                      {section.section} · {section.fields.length} fields
                    </span>
                  ))}
                </div>
              </Section>

              <Section step={2} title="Category scores → inherent risk">
                <div className="space-y-2">
                  <Formula>
                    Category score = Σ (factor score × factor weight) ÷ Σ
                    factor weight
                  </Formula>
                  <Formula>{report.inherent.formula}</Formula>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-right">Score</th>
                        <th className="px-3 py-2 text-right">Model weight</th>
                        <th className="px-3 py-2 text-right">Contribution</th>
                        <th className="px-3 py-2 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.categories.map((category) => (
                        <CategoryRow key={category.category} category={category} />
                      ))}
                      <tr className="bg-slate-50 font-bold text-slate-900">
                        <td className="px-3 py-2.5">Inherent risk</td>
                        <td />
                        <td className="px-3 py-2.5 text-right">1.00</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {report.inherent.score}
                        </td>
                        <td className="px-3 py-2.5 text-right">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Click a category to see the risk factors behind its score.
                </p>
              </Section>

              <Section step={3} title="Controls → residual risk">
                <Formula>{residual.formula}</Formula>
                <dl className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {[
                    [
                      `${report.inherent.score} × (1 − ${report.controls.average_effectiveness} / 100)`,
                      residual.raw_score,
                    ],
                    ["Base floor from inherent risk", residual.base_floor],
                    ["Risk concentration floor", residual.concentration_floor],
                    ["Applicable floor", residual.applied_floor],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 px-3 py-2">
                      <dt className="text-slate-600">{label}</dt>
                      <dd className="font-medium tabular-nums text-slate-900">
                        {value}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 bg-slate-50 px-3 py-2.5 font-bold text-slate-900">
                    <dt>Residual risk</dt>
                    <dd className="flex items-center gap-2 tabular-nums">
                      {residual.score}
                      <RatingBadge rating={residual.rating} />
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-slate-600">{residual.explanation}</p>
                {residual.triggered_rules.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {residual.triggered_rules.map((rule) => (
                      <li
                        key={rule.name}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900"
                      >
                        <span className="font-semibold">{rule.name}</span> —
                        floor {rule.floor} (factors: {rule.factors.join(", ")})
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section step={4} title="Regulatory evidence">
                <p className="text-slate-600">
                  {report.evidence.count} passages retrieved across{" "}
                  {report.evidence.documents.length} source documents. Evidence
                  supports the review; it does not change the scores.
                </p>
              </Section>

              <Section step={5} title="Notes & assumptions">
                <ul className="list-disc space-y-1.5 pl-5 text-slate-600">
                  {report.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!report || downloading}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export default RiskMethodologyModal;
