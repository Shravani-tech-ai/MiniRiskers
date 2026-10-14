import { useState } from "react";
import { CheckCircle2, Download, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

import api from "../../services/api";
import { Panel, buttonPrimary, buttonSecondary, errorText } from "./ui";

function AuditPanel() {
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");

  const verify = async () => {
    try {
      setChecking(true);
      setError("");
      setResult((await api.get("/audit/verify")).data);
    } catch (err) {
      setError(errorText(err, "Verification failed."));
    } finally {
      setChecking(false);
    }
  };

  const download = async (format) => {
    try {
      setExporting(format);
      setError("");
      const response = await api.get("/audit/export", {
        params: { format },
        responseType: "blob",
      });
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "json" ? `audit-export-${stamp}.json` : `audit-trail-${stamp}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorText(err, "Export failed."));
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Audit trail integrity"
        subtitle="Every request's audit events are hash-chained and append-only. Verification recomputes every chain and reports any event that was changed or removed."
        actions={
          <button type="button" onClick={verify} disabled={checking} className={buttonPrimary}>
            {checking ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Verify all requests
          </button>
        }
      >
        {!result ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Run verification to check the whole portfolio.</p>
        ) : result.all_valid ? (
          <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 size={16} />
            All {result.requests_checked} audit chains are intact ({result.events_checked} events).
          </p>
        ) : (
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert size={16} />
              {result.broken.length} of {result.requests_checked} audit chains failed verification.
            </p>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {result.broken.map((item) => (
                <li key={item.change_request_id}>
                  Request {item.request_number || item.change_request_id}:{" "}
                  {(item.problems || []).map((p) => p.issue).join("; ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      <Panel
        title="Examiner export"
        subtitle="Portfolio-wide audit evidence: every request's inputs, system, AI, analyst and committee outputs, methodology version and verified trail."
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => download("csv")} disabled={Boolean(exporting)} className={buttonSecondary}>
            {exporting === "csv" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Audit trail (CSV)
          </button>
          <button type="button" onClick={() => download("json")} disabled={Boolean(exporting)} className={buttonSecondary}>
            {exporting === "json" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Full audit packs (JSON)
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Per-request audit packs (PDF, CSV, JSON) are on each request's Completed view.
        </p>
      </Panel>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default AuditPanel;
