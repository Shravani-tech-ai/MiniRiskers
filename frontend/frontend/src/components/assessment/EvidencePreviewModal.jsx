import { useEffect } from "react";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";

// PDF extraction hard-wraps every line; keep blank-line paragraph breaks only.
function reflow(text) {
  return text
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

function EvidencePreviewModal({
  evidence,
  number,
  total,
  riskFactorName,
  onClose,
  onPrevious,
  onNext,
}) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && onPrevious) onPrevious();
      if (event.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onPrevious, onNext]);

  const hasScore =
    evidence.relevance_score !== null && evidence.relevance_score !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-preview-title"
        className="flex max-h-full w-full max-w-3xl flex-col rounded-xl bg-white dark:bg-slate-900 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-700 p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Evidence {number} of {total}
            </p>
            <h3
              id="evidence-preview-title"
              className="mt-1 text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100"
            >
              {evidence.query || "Regulatory evidence"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence preview"
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {/* Source & relevance */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Source document
              </p>
              <div className="mt-2 flex items-start gap-2">
                <FileText size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {evidence.document_name || "Regulatory document"}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {evidence.authority || "Unknown authority"}
                </span>
                {evidence.page_number && (
                  <span className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-slate-200">
                    Page {evidence.page_number}
                  </span>
                )}
                {riskFactorName && (
                  <span className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-slate-200">
                    Supports: {riskFactorName}
                  </span>
                )}
              </div>
            </div>

            {hasScore && (
              <div className="sm:border-l sm:border-slate-200 sm:pl-5 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Relevance score
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {Number(evidence.relevance_score).toFixed(4)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Retrieval distance · lower is closer
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Extracted evidence
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-300">
              {evidence.evidence_text
                ? reflow(evidence.evidence_text)
                : "No evidence text was captured."}
            </p>
          </div>

          {evidence.source_reference && (
            <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <FileText size={14} />
              {evidence.source_reference}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!onPrevious}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvidencePreviewModal;
