import { useEffect, useState } from "react";
import { Download, ShieldAlert, ShieldCheck } from "lucide-react";

import api from "../../services/api";

const EXPORTS = [
  { format: "pdf", label: "Examiner pack (PDF)", type: "application/pdf" },
  { format: "json", label: "JSON", type: "application/json" },
  { format: "csv", label: "CSV", type: "text/csv" },
];

function formatTimestamp(value) {
  if (!value) return "";
  return new Date(`${value}Z`).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function AuditTrail({ changeRequestId, requestNumber, auditEvents, canExport }) {
  const [verification, setVerification] = useState(null);
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    api
      .get(`/change-requests/${changeRequestId}/audit-events/verify`)
      .then((response) => setVerification(response.data))
      .catch(() => setVerification(null));
  }, [changeRequestId, auditEvents.length]);

  const download = async ({ format, type }) => {
    try {
      setExporting(format);
      setExportError("");
      const response = await api.get(`/change-requests/${changeRequestId}/audit-export`, {
        params: { format },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${requestNumber || changeRequestId}-audit-pack.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setExportError("Export failed.");
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Audit Trail</h2>
          <p className="mt-1 text-sm text-slate-500">
            Append-only, hash-chained record of every assessment and decision activity
          </p>
          {verification && (
            <p
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                verification.valid
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {verification.valid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {verification.valid
                ? `Chain verified · ${verification.event_count} events`
                : `Chain broken · ${verification.problems.length} problem(s)`}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {canExport && (
            <div className="flex flex-wrap justify-end gap-2">
              {EXPORTS.map((item) => (
                <button
                  key={item.format}
                  type="button"
                  onClick={() => download(item)}
                  disabled={Boolean(exporting)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Download size={15} />
                  {exporting === item.format ? "Preparing…" : item.label}
                </button>
              ))}
            </div>
          )}
          {exportError && <p className="text-sm text-red-600">{exportError}</p>}
          <span className="text-sm text-slate-500">
            {auditEvents.length} event{auditEvents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {verification && !verification.valid && (
        <ul className="mb-4 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {verification.problems.map((problem) => (
            <li key={`${problem.event_id}-${problem.issue}`}>
              Event #{problem.event_id}: {problem.issue}
            </li>
          ))}
        </ul>
      )}

      {auditEvents.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500">No audit events recorded yet.</div>
      ) : (
        <div className="space-y-4">
          {auditEvents.map((event, index) => (
            <div key={event.id || index} className="flex gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col items-center">
                <div className="mt-1 h-3 w-3 rounded-full bg-slate-700" />
                {index !== auditEvents.length - 1 && <div className="mt-2 w-px flex-1 bg-slate-300" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{event.action}</p>
                    <p className="mt-1 text-sm text-slate-600">Actor: {event.actor || "System"}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {formatTimestamp(event.created_at)}
                  </span>
                </div>

                {event.entity_type && (
                  <p className="mt-2 text-xs text-slate-500">
                    Entity: {event.entity_type}
                    {event.entity_id ? ` #${event.entity_id}` : ""}
                  </p>
                )}
                {event.old_value && (
                  <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">Previous:</span> {event.old_value}
                  </p>
                )}
                {event.new_value && (
                  <p className="mt-1 text-sm text-slate-700">
                    <span className="font-medium">New:</span> {event.new_value}
                  </p>
                )}
                {event.reason && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium">Reason:</span> {event.reason}
                  </p>
                )}
                {event.evidence && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium">Evidence:</span> {event.evidence}
                  </p>
                )}
                {event.model_version && (
                  <p className="mt-2 text-xs text-slate-500">Model: {event.model_version}</p>
                )}
                {event.policy_version && (
                  <p className="mt-1 text-xs text-slate-500">Methodology: v{event.policy_version}</p>
                )}
                {event.event_hash && (
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-400" title={event.event_hash}>
                    sha256 {event.event_hash.slice(0, 16)}…
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditTrail;
