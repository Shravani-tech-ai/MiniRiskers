import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../utils/rolePermissions";
import { formatShortDate } from "../utils/riskDisplay";

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  SUPERSEDED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  WITHDRAWN: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

const INDEX_LABELS = {
  INDEXED: "Searchable",
  SCHEDULED: "Searchable from effective date",
  INDEXING: "Indexing…",
  NOT_INDEXED: "Not indexed",
  FAILED: "Indexing failed",
  SKIPPED: "Indexing skipped",
};

const FILTERS = [
  ["CURRENT", "In use"],
  ["PENDING_APPROVAL", "Awaiting approval"],
  ["HISTORY", "Superseded / withdrawn"],
  ["ALL", "All"],
];

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";

function errorText(err, fallback) {
  const detail = err?.response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

function StatusBadge({ status }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.SUPERSEDED}`}>
      {status.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}
    </span>
  );
}

function UploadForm({ sources, isAdmin, onUploaded }) {
  const empty = {
    title: "",
    authority: "RBI",
    document_type: "",
    reference_number: "",
    effective_from: "",
    supersedes_id: "",
    description: "",
  };
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inputKey, setInputKey] = useState(0);

  const activeSources = sources.filter((s) => s.status === "ACTIVE");

  const submit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF or text file to upload.");
      return;
    }
    const data = new FormData();
    data.append("file", file);
    Object.entries(form).forEach(([key, value]) => {
      if (value !== "") data.append(key, value);
    });
    try {
      setSaving(true);
      setError("");
      await api.post("/regulatory-sources", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm(empty);
      setFile(null);
      setInputKey((key) => key + 1);
      await onUploaded(
        isAdmin
          ? "Uploaded and approved. It becomes searchable once indexing finishes."
          : "Uploaded. An Admin must approve it before it is used as evidence."
      );
    } catch (err) {
      setError(errorText(err, "Upload failed."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Upload a regulation</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isAdmin
          ? "Admin uploads are approved straight away."
          : "Your upload goes to an Admin for approval before analysts can cite it."}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="reg-file">Document (PDF or .txt, up to 25 MB) *</label>
          <input
            key={inputKey}
            id="reg-file"
            type="file"
            accept=".pdf,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 dark:text-slate-400 dark:file:bg-indigo-950/50 dark:file:text-indigo-300"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="reg-title">Title *</label>
          <input id="reg-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Master Direction on KYC (Amendment) 2026" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="reg-authority">Issuing authority *</label>
          <input id="reg-authority" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="reg-type">Document type</label>
          <input id="reg-type" value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} placeholder="Master Direction, Circular…" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="reg-ref">Reference / circular number</label>
          <input id="reg-ref" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="reg-effective">Effective from</label>
          <input id="reg-effective" type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="reg-supersedes">Replaces an existing document</label>
          <select id="reg-supersedes" value={form.supersedes_id} onChange={(e) => setForm({ ...form, supersedes_id: e.target.value })} className={inputClass}>
            <option value="">No, this is a new document</option>
            {activeSources.map((source) => (
              <option key={source.id} value={source.id}>{source.authority} · {source.title}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Once approved, the old version stops being cited and open requests that relied on it are flagged for re-checking.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="reg-description">What changed</label>
          <textarea id="reg-description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
        {saving ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}

function SourceRow({ source, sources, isAdmin, userId, onChanged, setNotice }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const replaces = sources.find((s) => s.id === source.supersedes_id);
  const replacedBy = sources.find((s) => s.id === source.superseded_by_id);
  const isPending = source.status === "PENDING_APPROVAL";
  const ownUpload = source.uploaded_by_user_id === userId;

  const toggle = async () => {
    setOpen((value) => !value);
    if (!detail) {
      try {
        setDetail((await api.get(`/regulatory-sources/${source.id}`)).data);
      } catch {
        setDetail(null);
      }
    }
  };

  const act = async (path, body, message) => {
    try {
      setBusy(true);
      setError("");
      await api.post(`/regulatory-sources/${source.id}/${path}`, body);
      setNote("");
      setNotice(message);
      await onChanged();
    } catch (err) {
      setError(errorText(err, "Action failed."));
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const response = await api.get(`/regulatory-sources/${source.id}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = source.title;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={toggle} className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{source.title}</p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {source.authority}
            {source.document_type ? ` · ${source.document_type}` : ""}
            {source.reference_number ? ` · ${source.reference_number}` : ""}
            {source.effective_from ? ` · effective ${formatShortDate(source.effective_from)}` : ""}
          </p>
          {replaces && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Replaces: {replaces.title}</p>}
          {replacedBy && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Replaced by: {replacedBy.title}</p>}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={source.status} />
          {source.status === "ACTIVE" && (
            <span className={`text-xs ${source.index_status === "FAILED" ? "font-semibold text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
              {INDEX_LABELS[source.index_status] || source.index_status}
            </span>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
          {source.description && <p className="text-slate-600 dark:text-slate-400">{source.description}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Uploaded by {source.uploaded_by || "—"} on {formatShortDate(source.created_at)}
            {source.approved_by ? ` · approved by ${source.approved_by}` : ""}
            {source.chunk_count ? ` · ${source.page_count} pages, ${source.chunk_count} passages indexed` : ""}
          </p>
          {source.review_note && <p className="text-xs text-slate-600 dark:text-slate-400"><b>Note:</b> {source.review_note}</p>}
          {source.index_error && <p className="text-xs text-red-600 dark:text-red-400">{source.index_error}</p>}
          {detail?.impacted_requests?.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <p className="font-semibold">Open requests citing this document</p>
              <ul className="mt-1 list-disc pl-4">
                {detail.impacted_requests.map((cr) => (
                  <li key={cr.id}>{cr.request_number || `CR-${cr.id}`} · {cr.title}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {source.has_file && (
              <button type="button" onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                <Download size={14} /> Download
              </button>
            )}
            {isAdmin && source.status === "ACTIVE" && source.index_status === "FAILED" && (
              <button type="button" disabled={busy} onClick={() => act("reindex", undefined, "Re-indexing started.")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300">
                <RefreshCw size={14} /> Retry indexing
              </button>
            )}
          </div>

          {isAdmin && (isPending || source.status === "ACTIVE") && (
            <div className="space-y-2">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={isPending ? "Note (required to reject)…" : "Reason for withdrawal (required)…"}
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                {isPending && (
                  <>
                    <button
                      type="button"
                      disabled={busy || ownUpload}
                      onClick={() => act("approve", { note }, "Approved. Indexing has started.")}
                      title={ownUpload ? "You cannot approve your own upload" : undefined}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button type="button" disabled={busy || !note.trim()} onClick={() => act("reject", { note }, "Rejected.")} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300">
                      <X size={14} /> Reject
                    </button>
                  </>
                )}
                {source.status === "ACTIVE" && (
                  <button type="button" disabled={busy || !note.trim()} onClick={() => act("withdraw", { note }, "Withdrawn. Affected open requests were flagged.")} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300">
                    <AlertTriangle size={14} /> Withdraw
                  </button>
                )}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </li>
  );
}

function Regulations() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;
  const canUpload = isAdmin || user?.role === ROLES.RISK_COMMITTEE;
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState(isAdmin ? "PENDING_APPROVAL" : "CURRENT");

  const load = async () => {
    try {
      setError("");
      setSources((await api.get("/regulatory-sources")).data.sources);
    } catch {
      setError("Unable to load the regulatory library.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingCount = sources.filter((s) => s.status === "PENDING_APPROVAL").length;

  // Default the Admin to pending items only when there are some.
  useEffect(() => {
    if (!loading && isAdmin && filter === "PENDING_APPROVAL" && pendingCount === 0) {
      setFilter("CURRENT");
    }
  }, [loading]);

  const visible = useMemo(() => {
    switch (filter) {
      case "CURRENT":
        return sources.filter((s) => s.status === "ACTIVE");
      case "PENDING_APPROVAL":
        return sources.filter((s) => s.status === "PENDING_APPROVAL");
      case "HISTORY":
        return sources.filter((s) => ["SUPERSEDED", "WITHDRAWN", "REJECTED"].includes(s.status));
      default:
        return sources;
    }
  }, [sources, filter]);

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">Regulatory library</h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400 lg:text-lg">
          The regulations the system searches when it gathers evidence. Only documents that are approved and in effect are cited;
          older versions stay here for audit.
        </p>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

      <div className={`grid gap-6 ${canUpload ? "xl:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  filter === key
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
                }`}
              >
                {label}
                {key === "PENDING_APPROVAL" && pendingCount > 0 ? ` (${pendingCount})` : ""}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Nothing here.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  sources={sources}
                  isAdmin={isAdmin}
                  userId={user?.id}
                  onChanged={load}
                  setNotice={setNotice}
                />
              ))}
            </ul>
          )}
        </div>

        {canUpload && (
          <div>
            <UploadForm
              sources={sources}
              isAdmin={isAdmin}
              onUploaded={async (message) => {
                setNotice(message);
                await load();
              }}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default Regulations;
