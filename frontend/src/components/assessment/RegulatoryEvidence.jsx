import { FileText } from "lucide-react";

function RegulatoryEvidence({ regulatoryEvidence }) {
  return (
    <div className="mt-8 xl:mt-0">
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

                {/* Top Row */}
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
                      {evidence.document_name || "Regulatory Document"}
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
                        {Number(evidence.relevance_score).toFixed(4)}
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

                {/* Evidence Text */}
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

                {/* Source Reference */}
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
    </div>
  );
}

export default RegulatoryEvidence;