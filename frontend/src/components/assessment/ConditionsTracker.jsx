import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, ClipboardCheck, FileClock } from "lucide-react";

import api from "../../services/api";
import { ROLES } from "../../utils/rolePermissions";
import { formatShortDate } from "../../utils/riskDisplay";

const STATUS_META = {
  OPEN: { label: "Open", className: "bg-slate-100 text-slate-700", Icon: CircleDashed },
  EVIDENCE_SUBMITTED: { label: "Evidence submitted", className: "bg-blue-100 text-blue-700", Icon: FileClock },
  VERIFIED: { label: "Verified", className: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
};

function ConditionRow({ condition, role, onChanged }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const meta = STATUS_META[condition.status] || STATUS_META.OPEN;
  const canEvidence =
    (role === ROLES.BUSINESS_OWNER || role === ROLES.ADMIN) && condition.status === "OPEN";
  const canVerify =
    (role === ROLES.RISK_ANALYST || role === ROLES.ADMIN) &&
    condition.status === "EVIDENCE_SUBMITTED";

  const run = async (request) => {
    try {
      setBusy(true);
      setError("");
      await request();
      setNote("");
      await onChanged();
    } catch (err) {
      setError(err?.response?.data?.detail || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex-1 text-sm font-medium text-slate-900">{condition.description}</p>
        <div className="flex items-center gap-2">
          {condition.overdue && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">Overdue</span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
            <meta.Icon size={13} />
            {meta.label}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Due {formatShortDate(condition.due_date) || "—"}
      </p>
      {condition.evidence_note && (
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium">Evidence</span>
          {condition.evidence_submitted_by ? ` (${condition.evidence_submitted_by})` : ""}: {condition.evidence_note}
        </p>
      )}
      {condition.verification_note && (
        <p className="mt-1 text-sm text-slate-600">
          <span className="font-medium">
            {condition.status === "VERIFIED" ? `Verified by ${condition.verified_by}` : "Analyst feedback"}:
          </span>{" "}
          {condition.verification_note}
        </p>
      )}

      {(canEvidence || canVerify) && (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={
              canEvidence
                ? "Describe the evidence that this condition is met..."
                : "Verification note (required if the evidence is not sufficient)..."
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="flex flex-wrap gap-2">
            {canEvidence && (
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={() =>
                  run(() =>
                    api.post(`/conditions/${condition.id}/evidence`, { evidence_note: note })
                  )
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Submit evidence
              </button>
            )}
            {canVerify && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      api.post(`/conditions/${condition.id}/verify`, { accepted: true, note })
                    )
                  }
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  type="button"
                  disabled={busy || !note.trim()}
                  onClick={() =>
                    run(() =>
                      api.post(`/conditions/${condition.id}/verify`, { accepted: false, note })
                    )
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Send back
                </button>
              </>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </li>
  );
}

function ConditionsTracker({ changeRequestId, role, onChanged }) {
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      const response = await api.get(`/change-requests/${changeRequestId}/conditions`);
      setData(response.data);
    } catch {
      setData(null);
    }
  };

  useEffect(() => {
    load();
  }, [changeRequestId]);

  if (!data || data.conditions.length === 0) {
    return null;
  }

  const verified = data.conditions.length - data.open_count;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Approval conditions</h3>
            <p className="text-sm text-slate-500">
              The Business Owner evidences each condition; the Risk Analyst verifies it.
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-700">
          {verified} of {data.conditions.length} verified
          {data.overdue_count > 0 && (
            <span className="ml-2 text-red-600">· {data.overdue_count} overdue</span>
          )}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {data.conditions.map((condition) => (
          <ConditionRow
            key={condition.id}
            condition={condition}
            role={role}
            onChanged={async () => {
              await load();
              if (onChanged) await onChanged();
            }}
          />
        ))}
      </ul>
    </div>
  );
}

export default ConditionsTracker;
