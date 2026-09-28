import { useEffect, useState } from "react";
import { ChevronLeft, Eye, FileText } from "lucide-react";

import EvidencePreviewModal from "./EvidencePreviewModal";

const PAGE_SIZE = 5;

function RegulatoryEvidence({ regulatoryEvidence, riskFactors = [] }) {
  const [page, setPage] = useState(0);
  const [openIndex, setOpenIndex] = useState(null);

  const total = regulatoryEvidence.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageItems = regulatoryEvidence.slice(start, start + PAGE_SIZE);

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
    setPage(Math.floor(index / PAGE_SIZE));
  };

  return (
    <div className="mt-8 xl:mt-0">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <FileText size={20} className="text-blue-600" />
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

            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {total} records
            </span>
          </div>
        </div>

        {total === 0 ? (
          <div className="p-6">
            <p className="text-sm text-slate-500">
              No regulatory evidence available.
            </p>
          </div>
        ) : (
          <>
            <ol className="divide-y divide-slate-100">
              {pageItems.map((evidence, offset) => {
                const index = start + offset;

                return (
                  <li
                    key={evidence.id || index}
                    className="flex items-start gap-4 px-6 py-4"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold tabular-nums text-slate-600">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-slate-800">
                      {evidence.query || evidence.document_name || "Regulatory evidence"}
                    </p>
                    <button
                      type="button"
                      onClick={() => showEvidence(index)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye size={14} />
                      View evidence
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
              <span className="text-sm font-semibold tabular-nums text-slate-500">
                {page + 1}/{pageCount}
              </span>
              <div className="flex gap-2">
                {page > 0 && (
                  <button
                    type="button"
                    onClick={() => setPage(page - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>
                )}
                {page < pageCount - 1 && (
                  <button
                    type="button"
                    onClick={() => setPage(page + 1)}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    View more
                  </button>
                )}
              </div>
            </div>
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
