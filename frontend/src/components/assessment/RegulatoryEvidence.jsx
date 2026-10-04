import { useEffect, useState } from "react";
import { ChevronLeft, Eye, FileText } from "lucide-react";

import EvidencePreviewModal from "./EvidencePreviewModal";

const PAGE_SIZE = 5;

// fillHeight: the card takes the remaining height of its (flex) column and
// scrolls its list, so it lines up with the neighbouring column instead of
// leaving blank space. It is absolutely positioned on xl so its content does
// not stretch the row.
function RegulatoryEvidence({
  regulatoryEvidence,
  riskFactors = [],
  fillHeight = false,
}) {
  const [page, setPage] = useState(0);
  const [openIndex, setOpenIndex] = useState(null);

  const total = regulatoryEvidence.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageItems = fillHeight
    ? regulatoryEvidence
    : regulatoryEvidence.slice(start, start + PAGE_SIZE);
  const listStart = fillHeight ? 0 : start;

  const factorNames = Object.fromEntries(
    riskFactors.map((factor) => [factor.id, factor.risk_factor])
  );

  // A re-run can shrink the list; keep the page in range.
  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(pageCount - 1);
    }
  }, [page, pageCount]);

  const openEvidence = openIndex !== null ? regulatoryEvidence[openIndex] : null;

  const showEvidence = (index) => {
    setOpenIndex(index);
    if (!fillHeight) {
      setPage(Math.floor(index / PAGE_SIZE));
    }
  };

  return (
    <div
      className={
        fillHeight
          ? "mt-8 xl:relative xl:mt-0 xl:min-h-[26rem] xl:flex-1"
          : "mt-8 xl:mt-0"
      }
    >
      <div
        className={`flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm ${
          fillHeight ? "xl:absolute xl:inset-0" : ""
        }`}
      >
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-2">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  Regulatory Evidence
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Regulatory sources retrieved to support the risk assessment
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              {total} records
            </span>
          </div>
        </div>

        {total === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No regulatory evidence available.
            </p>
          </div>
        ) : (
          <>
            <ol
              className={`divide-y divide-slate-100 dark:divide-slate-800 ${
                fillHeight
                  ? "max-h-[32rem] overflow-y-auto xl:max-h-none xl:min-h-0 xl:flex-1"
                  : ""
              }`}
            >
              {pageItems.map((evidence, offset) => {
                const index = listStart + offset;

                return (
                  <li
                    key={evidence.id || index}
                    className="flex items-start gap-4 px-6 py-4"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold tabular-nums text-slate-600 dark:text-slate-400">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-slate-800 dark:text-slate-200">
                      {evidence.query || evidence.document_name || "Regulatory evidence"}
                    </p>
                    <button
                      type="button"
                      onClick={() => showEvidence(index)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Eye size={14} />
                      View evidence
                    </button>
                  </li>
                );
              })}
            </ol>

            {!fillHeight && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-700 px-6 py-4">
              <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                {page + 1}/{pageCount}
              </span>
              <div className="flex gap-2">
                {page > 0 && (
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>
                )}
                {page < pageCount - 1 && (
                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    className="rounded-lg px-4 py-1.5 text-sm font-semibold border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-900/40"
                  >
                    View more
                  </button>
                )}
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {openEvidence && (
        <EvidencePreviewModal
          evidence={openEvidence}
          number={openIndex + 1}
          total={total}
          riskFactorName={factorNames[openEvidence.risk_factor_id]}
          onClose={() => setOpenIndex(null)}
          onPrevious={
            openIndex > 0 ? () => showEvidence(openIndex - 1) : null
          }
          onNext={
            openIndex < total - 1 ? () => showEvidence(openIndex + 1) : null
          }
        />
      )}
    </div>
  );
}

export default RegulatoryEvidence;
