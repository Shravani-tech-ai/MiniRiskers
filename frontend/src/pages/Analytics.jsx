import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Gauge,
  ShieldAlert,
  Timer,
} from "lucide-react";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../context/AuthContext";
import { ROLES, isSubmitted } from "../utils/rolePermissions";
import { DECISION_LABELS, RATING_ORDER, parseApiDate } from "../utils/riskDisplay";
import {
  SLA_STATUS_META,
  formatHours,
} from "../components/assessment/CycleTimePanel";

// Chart colour roles (validated with the dataviz palette checker).
const SERIES = {
  primary: "#2a78d6", // single-series bars
  inherent: "#eb6834",
  residual: "#2a78d6",
};
// Status colours always ship with a visible text label.
const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};
const RATING_COLORS = {
  LOW: STATUS.good,
  MEDIUM: STATUS.warning,
  HIGH: STATUS.serious,
  CRITICAL: STATUS.critical,
};
const DECISION_COLORS = {
  APPROVE: STATUS.good,
  APPROVE_WITH_CONDITIONS: STATUS.warning,
  DEFER: STATUS.serious,
  REJECT: STATUS.critical,
};
const CATEGORY_LABELS = {
  CUSTOMER: "Customer",
  PRODUCT: "Product",
  GEOGRAPHY: "Geography",
  TRANSACTION: "Transaction",
  CHANNEL: "Channel",
  THIRD_PARTY: "Third party",
  FRAUD: "Fraud",
};

const formatNumber = (value, digits = 0) =>
  value === null || value === undefined || Number.isNaN(value)
    ? "—"
    : Number(value).toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

const average = (values) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

// ---------------------------------------------------------------------------
// Chart primitives
// ---------------------------------------------------------------------------

function useTooltip() {
  const containerRef = useRef(null);
  const [tip, setTip] = useState(null);

  const show = (event, content) => {
    const container = containerRef.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const target = event.currentTarget.getBoundingClientRect();
    const x =
      event.clientX !== undefined && event.type !== "focus"
        ? event.clientX - box.left
        : target.left + target.width / 2 - box.left;
    const y =
      event.clientY !== undefined && event.type !== "focus"
        ? event.clientY - box.top
        : target.top - box.top;
    setTip({ x, y, content, width: box.width });
  };

  const hide = () => setTip(null);

  const node = tip ? (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-lg"
      style={{
        left: Math.min(Math.max(tip.x, 70), tip.width - 70),
        top: tip.y - 12,
        transform: "translate(-50%, -100%)",
      }}
    >
      {tip.content}
    </div>
  ) : null;

  const bind = (content) => ({
    tabIndex: 0,
    onPointerMove: (event) => show(event, content),
    onPointerLeave: hide,
    onFocus: (event) => show(event, content),
    onBlur: hide,
  });

  return { containerRef, node, bind };
}

function TipBody({ value, label, color }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      {color && (
        <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</span>
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer select-none text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
        View data
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500 dark:text-slate-400">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={`py-1.5 font-semibold ${index > 0 ? "text-right" : ""}`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-300">
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-slate-100 dark:border-slate-800">
                {row.map((cell, index) => (
                  <td
                    key={index}
                    className={`py-1.5 ${index > 0 ? "text-right tabular-nums" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm lg:p-6 ${className}`}
    >
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyChart({ text = "Not enough data yet." }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-400 dark:text-slate-500">
      {text}
    </div>
  );
}

// Horizontal bars: label column, bar from a shared baseline, value at the tip.
function HBarChart({ data, max, format = (v) => formatNumber(v), unit = "", ticks }) {
  const { containerRef, node, bind } = useTooltip();
  const scaleMax = max ?? Math.max(1, ...data.map((d) => d.value));

  return (
    <div ref={containerRef} className="relative">
      <div className="space-y-2.5">
        {data.map((d) => {
          const pct = scaleMax ? (d.value / scaleMax) * 100 : 0;
          return (
            <div
              key={d.label}
              className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 outline-none sm:grid-cols-[9rem_minmax(0,1fr)]"
              {...bind(
                <TipBody
                  value={`${format(d.value)}${unit}`}
                  label={d.label}
                  color={d.color || SERIES.primary}
                />
              )}
            >
              <span className="truncate text-sm text-slate-600 dark:text-slate-400">{d.label}</span>
              <div className="pr-12">
              <div className="relative flex h-6 items-center">
                {ticks?.map((tick) => (
                  <span
                    key={tick}
                    className="absolute inset-y-0 w-px bg-slate-100 dark:bg-slate-800"
                    style={{ left: `${(tick / scaleMax) * 100}%` }}
                  />
                ))}
                <span className="absolute inset-y-0 left-0 w-px bg-slate-300" />
                <div
                  className="relative h-5 rounded-r-sm transition-[width] hover:brightness-110"
                  style={{
                    width: `${Math.max(pct, d.value > 0 ? 1 : 0)}%`,
                    backgroundColor: d.color || SERIES.primary,
                  }}
                />
                <span className="relative ml-2 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  {format(d.value)}
                  {unit}
                </span>
              </div>
              </div>
            </div>
          );
        })}
      </div>
      {ticks && (
        <div className="mt-1 grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <span />
          <div className="pr-12">
          <div className="relative h-4 text-[11px] text-slate-400 dark:text-slate-500">
            {[0, ...ticks].map((tick) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${(tick / scaleMax) * 100}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
          </div>
        </div>
      )}
      {node}
    </div>
  );
}

// Vertical columns with value on the cap.
function ColumnChart({ data, height = 180 }) {
  const { containerRef, node, bind } = useTooltip();
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.max(4, Math.ceil(max / 4) * 4);
  const ticks = [0, niceMax / 4, niceMax / 2, (niceMax * 3) / 4, niceMax];

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div
          className="relative w-6 shrink-0 text-right text-[11px] tabular-nums text-slate-400 dark:text-slate-500"
          style={{ height }}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(tick / niceMax) * 100}%` }}
            >
              {formatNumber(tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1" style={{ height }}>
          {ticks.map((tick) => (
            <span
              key={tick}
              className={`absolute inset-x-0 h-px ${tick === 0 ? "bg-slate-300" : "bg-slate-100 dark:bg-slate-800"}`}
              style={{ bottom: `${(tick / niceMax) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-1">
            {data.map((d) => (
              <div
                key={d.label}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end outline-none"
                {...bind(
                  <TipBody
                    value={formatNumber(d.value)}
                    label={d.label}
                    color={d.color || SERIES.primary}
                  />
                )}
              >
                <span className="mb-1 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                  {d.value > 0 ? formatNumber(d.value) : ""}
                </span>
                <div
                  className="w-full max-w-6 rounded-t-sm hover:brightness-110"
                  style={{
                    height: `${(d.value / niceMax) * 100}%`,
                    backgroundColor: d.color || SERIES.primary,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-around gap-1">
        {data.map((d) => (
          <span
            key={d.label}
            className="min-w-0 flex-1 truncate text-center text-xs text-slate-500 dark:text-slate-400"
          >
            {d.label}
          </span>
        ))}
      </div>
      {node}
    </div>
  );
}

// Inherent → residual per request on a shared 0–100 scale.
function DumbbellChart({ rows }) {
  const { containerRef, node, bind } = useTooltip();
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES.inherent }} />
          Inherent (before controls)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES.residual }} />
          Residual (after controls)
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((row) => {
          const low = Math.min(row.inherent, row.residual);
          const high = Math.max(row.inherent, row.residual);
          return (
            <div
              key={row.label}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1 outline-none hover:bg-slate-50 dark:hover:bg-slate-800 sm:grid-cols-[8rem_minmax(0,1fr)]"
              {...bind(
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{row.label}</p>
                  <TipBody value={formatNumber(row.inherent, 1)} label="Inherent" color={SERIES.inherent} />
                  <TipBody value={formatNumber(row.residual, 1)} label="Residual" color={SERIES.residual} />
                </div>
              )}
            >
              <span className="truncate text-sm text-slate-600 dark:text-slate-400">{row.label}</span>
              <div className="relative h-6">
                {ticks.map((tick) => (
                  <span
                    key={tick}
                    className={`absolute inset-y-0 w-px ${tick === 0 ? "bg-slate-300" : "bg-slate-100 dark:bg-slate-800"}`}
                    style={{ left: `${tick}%` }}
                  />
                ))}
                <span
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-300"
                  style={{ left: `${low}%`, width: `${high - low}%` }}
                />
                {[
                  ["inherent", row.inherent],
                  ["residual", row.residual],
                ].map(([key, value]) => (
                  // Inherent is drawn larger underneath so equal scores stay visible.
                  <span
                    key={key}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                      key === "inherent" ? "h-4 w-4" : "h-2.5 w-2.5"
                    }`}
                    style={{ left: `${value}%`, backgroundColor: SERIES[key] }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <span />
        <div className="relative h-4 text-[11px] text-slate-400 dark:text-slate-500">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 tabular-nums"
              style={{ left: `${tick}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
      {node}
    </div>
  );
}

function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Icon size={16} className="text-slate-400 dark:text-slate-500" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function buildAnalytics(items) {
  const withRisk = items.filter((item) => item.risk);
  const decided = items.filter((item) => item.committee_decision);
  const reviewed = items.filter((item) => item.analyst_review);

  const ratingOf = (item) => item.risk.final_rating || item.risk.residual_rating;

  const ratingCounts = RATING_ORDER.map((rating) => ({
    label: rating.charAt(0) + rating.slice(1).toLowerCase(),
    value: withRisk.filter((item) => ratingOf(item) === rating).length,
    color: RATING_COLORS[rating],
  }));

  const pipeline = [
    { label: "Draft", match: (i) => !isSubmitted(i) },
    { label: "Awaiting assessment", match: (i) => isSubmitted(i) && !i.risk_calculated },
    { label: "Risk calculated", match: (i) => i.risk_calculated && !i.analyst_review },
    { label: "Analyst reviewed", match: (i) => i.analyst_review && !i.committee_decision },
    { label: "Committee decided", match: (i) => Boolean(i.committee_decision) },
  ].map((stage) => ({ label: stage.label, value: items.filter(stage.match).length }));

  const categories = Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
    label,
    value:
      average(withRisk.map((item) => Number(item.risk.category_scores?.[key] || 0))) ?? 0,
  }));

  const decisions = Object.keys(DECISION_LABELS).map((key) => ({
    label: DECISION_LABELS[key],
    value: decided.filter((item) => item.committee_decision.decision === key).length,
    color: DECISION_COLORS[key],
  }));

  const rank = (rating) => RATING_ORDER.indexOf(rating);
  const outcomes = [
    { label: "Accepted", match: (r) => r.accepted },
    { label: "Rating raised", match: (r) => !r.accepted && rank(r.analyst_rating) > rank(r.system_rating) },
    { label: "Rating lowered", match: (r) => !r.accepted && rank(r.analyst_rating) < rank(r.system_rating) },
  ].map((o) => ({
    label: o.label,
    value: reviewed.filter((item) => o.match(item.analyst_review)).length,
  }));

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString(undefined, { month: "short" }),
      value: 0,
    };
  });
  for (const item of items) {
    const created = parseApiDate(item.created_at);
    if (!created) continue;
    const bucket = months.find(
      (m) => m.key === `${created.getFullYear()}-${created.getMonth()}`
    );
    if (bucket) bucket.value += 1;
  }

  const decisionDays = decided
    .map((item) => {
      const start = parseApiDate(item.created_at);
      const end = parseApiDate(item.committee_decision.decided_at);
      return start && end ? (end - start) / 86400000 : null;
    })
    .filter((days) => days !== null && days >= 0);

  const approved = decided.filter((item) =>
    ["APPROVE", "APPROVE_WITH_CONDITIONS"].includes(item.committee_decision.decision)
  ).length;

  const highRisk = withRisk.filter((item) =>
    ["HIGH", "CRITICAL"].includes(ratingOf(item))
  ).length;

  const dumbbell = withRisk.slice(0, 12).map((item) => ({
    label: item.request_number,
    inherent: Number(item.risk.inherent_score || 0),
    residual: Number(item.risk.residual_score || 0),
  }));

  return {
    total: items.length,
    assessed: withRisk.length,
    avgResidual: average(withRisk.map((item) => Number(item.risk.residual_score || 0))),
    highRiskShare: withRisk.length ? (highRisk / withRisk.length) * 100 : null,
    approvalRate: decided.length ? (approved / decided.length) * 100 : null,
    avgDecisionDays: average(decisionDays),
    ratingCounts,
    pipeline,
    categories,
    decisions,
    outcomes,
    months,
    dumbbell,
  };
}

function SlaSection({ cycle }) {
  if (!cycle) {
    return null;
  }
  const { summary, items, overrides } = cycle;
  const target = summary.sla_target_hours;
  const open = items
    .filter((item) => item.submitted_at && !item.decided_at)
    .sort((a, b) => (b.sla_used_pct || 0) - (a.sla_used_pct || 0));
  const stageData = summary.stage_averages
    .filter((stage) => stage.avg_hours !== null)
    .map((stage) => ({
      label: stage.label,
      value: stage.avg_hours,
      color:
        stage.target_hours && stage.avg_hours > stage.target_hours
          ? STATUS.critical
          : SERIES.primary,
    }));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Intake-to-decision SLA</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Target {formatHours(target)} from Business Owner submission to committee decision (brief: ~2 days vs a
          15–20 business-day baseline). Time a request spends back with the Business Owner after a deferral is excluded.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile
          icon={Timer}
          label="Median time to decision"
          value={formatHours(summary.median_hours)}
          hint={`target ${formatHours(target)} · p90 ${formatHours(summary.p90_hours)}`}
        />
        <StatTile
          icon={CheckCircle2}
          label="Decided within SLA"
          value={summary.within_sla_pct === null ? "—" : `${formatNumber(summary.within_sla_pct)}%`}
          hint={`of ${summary.decided_count} decided`}
        />
        <StatTile
          icon={Clock3}
          label="Open, at risk"
          value={formatNumber(summary.open_by_status.AT_RISK)}
          hint={`${summary.open_by_status.ON_TRACK} on track · ${summary.open_by_status.PAUSED} paused`}
        />
        <StatTile
          icon={ShieldAlert}
          label="Open, breached"
          value={formatNumber(summary.open_by_status.BREACHED)}
          hint={`${summary.requests_with_deferrals} request(s) deferred at least once`}
        />
        <StatTile
          icon={Gauge}
          label="Escalated overrides"
          value={formatNumber(overrides.escalated)}
          hint={`${overrides.downgrades} downgrade(s), ${overrides.upgrades} upgrade(s) of ${overrides.reviews} reviews`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Average time per stage"
          subtitle="Decided requests; red bars exceed the stage target"
        >
          {stageData.length ? (
            <>
              <HBarChart data={stageData} format={(v) => formatHours(v)} />
              <DataTable
                columns={["Stage", "Average", "Target"]}
                rows={summary.stage_averages.map((stage) => [
                  stage.label,
                  formatHours(stage.avg_hours),
                  formatHours(stage.target_hours),
                ])}
              />
            </>
          ) : (
            <EmptyChart text="No decided requests yet." />
          )}
        </ChartCard>

        <ChartCard title="Open requests against SLA" subtitle="Most SLA time used first">
          {open.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
                  <tr>
                    <th className="py-2 text-left">Request</th>
                    <th className="py-2 text-left">Stage</th>
                    <th className="py-2 text-right">Elapsed</th>
                    <th className="py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {open.slice(0, 10).map((item) => {
                    const meta = SLA_STATUS_META[item.sla_status] || SLA_STATUS_META.NOT_STARTED;
                    return (
                      <tr key={item.change_request_id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-2 font-medium">{item.request_number}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">{item.current_stage_label || "—"}</td>
                        <td className="py-2 text-right tabular-nums">{formatHours(item.sla_hours)}</td>
                        <td className="py-2 text-right">
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyChart text="No open requests." />
          )}
        </ChartCard>
      </div>
    </section>
  );
}

function Analytics() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/assessments/overview"),
      api.get("/analytics/cycle-time").catch(() => null),
    ])
      .then(([overview, cycleTime]) => {
        setItems(overview.data.items || []);
        setCycle(cycleTime?.data || null);
      })
      .catch(() => setError("Unable to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(() => buildAnalytics(items), [items]);

  return (
    <PageContainer className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">
          Analytics
        </h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400 lg:text-lg">
          Risk profile, workflow throughput, and decision outcomes across the
          requests you can access.
          {user?.role === ROLES.BUSINESS_OWNER &&
            " Risk figures include only requests the Risk Analyst has reviewed."}
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm">
          Loading analytics…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatTile icon={FileText} label="Requests" value={formatNumber(data.total)} />
            <StatTile
              icon={BarChart3}
              label="Risk assessed"
              value={formatNumber(data.assessed)}
            />
            <StatTile
              icon={Gauge}
              label="Avg residual score"
              value={formatNumber(data.avgResidual, 1)}
              hint="0–100 scale"
            />
            <StatTile
              icon={ShieldAlert}
              label="High / critical"
              value={data.highRiskShare === null ? "—" : `${formatNumber(data.highRiskShare)}%`}
              hint="of assessed requests"
            />
            <StatTile
              icon={CheckCircle2}
              label="Approval rate"
              value={data.approvalRate === null ? "—" : `${formatNumber(data.approvalRate)}%`}
              hint={
                data.avgDecisionDays === null
                  ? "of committee decisions"
                  : `avg ${formatNumber(data.avgDecisionDays, 1)} days to decision`
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard
              title="Risk rating distribution"
              subtitle="Final (or residual) rating of each assessed request"
            >
              {data.assessed ? (
                <>
                  <ColumnChart data={data.ratingCounts} />
                  <DataTable
                    columns={["Rating", "Requests"]}
                    rows={data.ratingCounts.map((d) => [d.label, d.value])}
                  />
                </>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard
              title="Workflow pipeline"
              subtitle="Where each request currently sits"
            >
              {data.total ? (
                <>
                  <HBarChart data={data.pipeline} />
                  <DataTable
                    columns={["Stage", "Requests"]}
                    rows={data.pipeline.map((d) => [d.label, d.value])}
                  />
                </>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard
              title="Average risk by category"
              subtitle="Mean category score (0–100) across assessed requests"
            >
              {data.assessed ? (
                <>
                  <HBarChart
                    data={data.categories}
                    max={100}
                    ticks={[25, 50, 75, 100]}
                    format={(v) => formatNumber(v, 1)}
                  />
                  <DataTable
                    columns={["Category", "Average score"]}
                    rows={data.categories.map((d) => [d.label, formatNumber(d.value, 1)])}
                  />
                </>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard
              title="Requests created per month"
              subtitle="Last six months"
            >
              {data.total ? (
                <>
                  <ColumnChart data={data.months} />
                  <DataTable
                    columns={["Month", "Requests"]}
                    rows={data.months.map((d) => [d.label, d.value])}
                  />
                </>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard
              title="Analyst review outcomes"
              subtitle="How analysts responded to the system-calculated rating"
            >
              {data.outcomes.some((d) => d.value) ? (
                <>
                  <HBarChart data={data.outcomes} />
                  <DataTable
                    columns={["Outcome", "Requests"]}
                    rows={data.outcomes.map((d) => [d.label, d.value])}
                  />
                </>
              ) : (
                <EmptyChart text="No analyst reviews yet." />
              )}
            </ChartCard>

            <ChartCard
              title="Committee decisions"
              subtitle="Outcome of every recorded decision"
            >
              {data.decisions.some((d) => d.value) ? (
                <>
                  <HBarChart data={data.decisions} />
                  <DataTable
                    columns={["Decision", "Requests"]}
                    rows={data.decisions.map((d) => [d.label, d.value])}
                  />
                </>
              ) : (
                <EmptyChart text="No committee decisions yet." />
              )}
            </ChartCard>

            <ChartCard
              className="xl:col-span-2"
              title="Inherent vs residual risk"
              subtitle="How much controls and floors moved each request's score (most recent 12)"
            >
              {data.dumbbell.length ? (
                <>
                  <DumbbellChart rows={data.dumbbell} />
                  <DataTable
                    columns={["Request", "Inherent", "Residual"]}
                    rows={data.dumbbell.map((d) => [
                      d.label,
                      formatNumber(d.inherent, 1),
                      formatNumber(d.residual, 1),
                    ])}
                  />
                </>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>

          <SlaSection cycle={cycle} />

          <p className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Clock3 size={14} />
            Figures are computed live from the latest assessment of each request.
          </p>
        </>
      )}
    </PageContainer>
  );
}

export default Analytics;
