import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

import api from "../../services/api";

export const SLA_STATUS_META = {
  NOT_STARTED: { label: "Not submitted", className: "bg-slate-100 text-slate-600", bar: "bg-slate-300" },
  ON_TRACK: { label: "On track", className: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  AT_RISK: { label: "At risk", className: "bg-amber-50 text-amber-800", bar: "bg-amber-400" },
  PAUSED: { label: "Paused (with owner)", className: "bg-slate-100 text-slate-700", bar: "bg-slate-400" },
  BREACHED: { label: "SLA breached", className: "bg-red-50 text-red-700", bar: "bg-red-500" },
  MET: { label: "SLA met", className: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  MISSED: { label: "SLA missed", className: "bg-red-50 text-red-700", bar: "bg-red-500" },
};

export function formatHours(hours) {
  if (hours === null || hours === undefined) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function CycleTimePanel({ changeRequestId, refreshKey }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get(`/change-requests/${changeRequestId}/cycle-time`)
      .then((response) => setData(response.data))
      .catch(() => setData(null));
  }, [changeRequestId, refreshKey]);

  if (!data) {
    return null;
  }

  const meta = SLA_STATUS_META[data.sla_status] || SLA_STATUS_META.NOT_STARTED;
  const used = Math.min(data.sla_used_pct || 0, 100);

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Timer size={20} className="text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Intake-to-decision SLA · target {formatHours(data.sla_target_hours)}
            </p>
            <p className="text-xs text-slate-500">
              {data.sla_status === "NOT_STARTED"
                ? "The clock starts when the Business Owner submits the request."
                : data.decided_at
                  ? `Decided in ${formatHours(data.sla_hours)} of SLA time`
                  : `${formatHours(data.sla_hours)} elapsed · ${formatHours(Math.max(data.sla_remaining_hours, 0))} remaining`}
              {data.paused_hours > 0 && ` · ${formatHours(data.paused_hours)} paused while with the Business Owner`}
              {data.deferrals > 0 && ` · ${data.deferrals} deferral${data.deferrals > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
      </div>

      {data.sla_status !== "NOT_STARTED" && (
        <>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={Math.round(data.sla_used_pct || 0)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Share of SLA used"
          >
            <div className={`h-full ${meta.bar}`} style={{ width: `${used}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.stages.map((stage) => (
              <div
                key={stage.stage}
                className={`rounded-lg border px-3 py-2 ${
                  stage.in_progress ? "border-indigo-300 bg-indigo-50" : "border-slate-200"
                }`}
              >
                <p className="text-xs text-slate-500">{stage.label}</p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    stage.over_target ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {formatHours(stage.hours)}
                  <span className="font-normal text-slate-400">
                    {stage.target_hours ? ` / ${formatHours(stage.target_hours)}` : ""}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default CycleTimePanel;
