import { useEffect, useState } from "react";
import { ChevronDown, Download, ExternalLink, FileText, Loader2 } from "lucide-react";

import api from "../../services/api";
import { formatDateTime } from "../../utils/riskDisplay";

const STATUS_LABELS = {
  CURRENT: "Current",
  SUPERSEDED: "Replaced",
  REMOVED: "Removed by owner",
};

const EXTRACTION_LABELS = {
  "ai+rules": "AI + rule-based extraction",
  rules: "Rule-based extraction (AI unavailable)",
  heuristic: "Rule-based extraction (AI unavailable)",
};

// Types the browser can show in a tab; anything else is downloaded.
const VIEWABLE_TYPES = ["application/pdf", "text/plain", "text/markdown"];

export async function fetchIntakeDocument(changeRequestId, document, mode) {
  const response = await api.get(
    `/change-requests/${changeRequestId}/intake/documents/${document.id}/file`,
    { responseType: "blob" }
  );
  const url = URL.createObjectURL(response.data);
  if (mode === "open") {
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const link = window.document.createElement("a");
  link.href = url;
  link.download = document.filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DocumentActions({ changeRequestId, document, setError }) {
  const [busy, setBusy] = useState("");

  const run = async (mode) => {
    try {
      setBusy(mode);
      setError?.("");
      await fetchIntakeDocument(changeRequestId, document, mode);
    } catch (err) {
      let detail = err?.response?.data?.detail;
      if (err?.response?.data instanceof Blob) {
        try {
          detail = JSON.parse(await err.response.data.text()).detail;
        } catch {
          detail = null;
        }
      }
      setError?.(detail || "Could not open the BRD.");
    } finally {
      setBusy("");
    }
  };

  if (!document.file_available) {
    return (
      <span className="text-xs text-amber-700 dark:text-amber-300">
        File not available
      </span>
    );
  }

  const button =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50";

  return (
    <div className="flex shrink-0 gap-2">
      {VIEWABLE_TYPES.includes(document.content_type) && (
        <button type="button" className={button} disabled={Boolean(busy)} onClick={() => run("open")}>
          {busy === "open" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          Open
        </button>
      )}
      <button type="button" className={button} disabled={Boolean(busy)} onClick={() => run("download")}>
        {busy === "download" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        Download
      </button>
    </div>
  );
}

function documentMeta(document) {
  return [
    document.uploaded_by && `Uploaded by ${document.uploaded_by}`,
    document.uploaded_at && formatDateTime(document.uploaded_at),
    document.size_bytes ? `${(document.size_bytes / 1024).toFixed(1)} KB` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function SourceDocumentPanel({ changeRequestId, setError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/change-requests/${changeRequestId}/intake/documents`)
      .then((response) => !cancelled && setData(response.data))
      .catch(() => !cancelled && setData({ current: null, documents: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [changeRequestId]);

  const current = data?.current;
  const history = (data?.documents || []).filter((item) => item.status !== "CURRENT");

  return (
    <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Source BRD</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        The business requirements document the intake inputs below were taken from.
      </p>

      {loading && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      )}

      {!loading && !current && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          No BRD is attached to this request; the inputs were entered manually.
        </p>
      )}

      {current && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:flex-row sm:items-start">
          <FileText size={22} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-semibold text-slate-900 dark:text-slate-100">
              {current.filename}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{documentMeta(current)}</p>
            {current.extraction_method && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {EXTRACTION_LABELS[current.extraction_method] || current.extraction_method}
                {current.extracted_at ? ` · ${formatDateTime(current.extracted_at)}` : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {current.applied_at
                ? `Values applied to the inputs by ${current.applied_by} · ${formatDateTime(current.applied_at)}`
                : "Extracted values were not applied; inputs may have been entered manually."}
            </p>
          </div>
          <DocumentActions changeRequestId={changeRequestId} document={current} setError={setError} />
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowHistory((value) => !value)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
          >
            <ChevronDown size={16} className={showHistory ? "rotate-180 transition" : "transition"} />
            Earlier versions ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-3 space-y-2">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium text-slate-800 dark:text-slate-200">
                      {item.filename}
                      <span className="ml-2 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-normal text-slate-600 dark:text-slate-400">
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{documentMeta(item)}</p>
                  </div>
                  <DocumentActions changeRequestId={changeRequestId} document={item} setError={setError} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default SourceDocumentPanel;
