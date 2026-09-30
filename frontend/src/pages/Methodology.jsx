import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  GitBranch,
  History,
  SlidersHorizontal,
} from "lucide-react";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../context/AuthContext";
import { getMethodologyPermissions } from "../utils/rolePermissions";
import { formatShortDate, getRatingBadgeClass } from "../utils/riskDisplay";

const CATEGORY_LABELS = {
  CUSTOMER: "Customer",
  PRODUCT: "Product",
  GEOGRAPHY: "Geography",
  TRANSACTION: "Transaction",
  CHANNEL: "Delivery channel",
  THIRD_PARTY: "Third party",
  FRAUD: "Fraud",
};

const STATUS_STYLES = {
  ACTIVE: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300",
  DRAFT: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  PENDING_APPROVAL: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
  RETIRED: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
  REJECTED: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
};

const STAGE_LABELS = {
  AWAITING_ANALYST: "Awaiting analyst",
  RISK_ASSESSMENT: "Risk assessment",
  ANALYST_REVIEW: "Analyst review",
  COMMITTEE_REVIEW: "Committee review",
};

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.DRAFT}`}>
      {status.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())}
    </span>
  );
}

function Card({ title, subtitle, children, actions }) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function NumberInput({ value, onChange, step = 1, min, max, disabled, label }) {
  return (
    <input
      type="number"
      aria-label={label}
      value={value}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      className="w-24 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-right text-sm tabular-nums disabled:border-transparent disabled:bg-transparent disabled:text-slate-900 dark:disabled:text-slate-100"
    />
  );
}

function setIn(object, path, value) {
  const copy = structuredClone(object);
  let node = copy;
  for (const key of path.slice(0, -1)) node = node[key];
  node[path[path.length - 1]] = value;
  return copy;
}

// ---------------------------------------------------------------------------
// Config view / editor (the same component renders both)
// ---------------------------------------------------------------------------

function ConfigPanel({ config, editable, onChange }) {
  const set = (path) => (value) => onChange(setIn(config, path, value));
  const weightSum = Object.values(config.category_weights).reduce((a, b) => a + Number(b || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card title="Category weights" subtitle="Inherent risk = Σ category score × weight">
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(config.category_weights).map(([category, weight]) => (
              <tr key={category} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2">{CATEGORY_LABELS[category]}</td>
                <td className="py-2 text-right">
                  <NumberInput label={`${category} weight`} value={weight} step={0.01} min={0} max={1} disabled={!editable} onChange={set(["category_weights", category])} />
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-300 dark:border-slate-600 font-semibold">
              <td className="py-2">Total</td>
              <td className={`py-2 pr-2 text-right tabular-nums ${Math.abs(weightSum - 1) > 0.001 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"}`}>
                {weightSum.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Rating bands and residual floors" subtitle="Controls reduce risk but floors stop them eliminating it">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
            <tr><th className="py-1 text-left">Rating</th><th className="py-1 text-right">Upper bound</th></tr>
          </thead>
          <tbody>
            {config.rating_bands.map((band, index) => (
              <tr key={band.rating} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRatingBadgeClass(band.rating)}`}>{band.rating}</span>
                </td>
                <td className="py-2 text-right">
                  <NumberInput label={`${band.rating} upper bound`} value={band.max} disabled={!editable || band.rating === "CRITICAL"} onChange={set(["rating_bands", index, "max"])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="mt-4 w-full text-sm">
          <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
            <tr><th className="py-1 text-left">Inherent score at least</th><th className="py-1 text-right">Residual floor</th></tr>
          </thead>
          <tbody>
            {config.base_residual_floors.map((item, index) => (
              <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2 tabular-nums">{item.min_inherent}</td>
                <td className="py-2 text-right">
                  <NumberInput label="Residual floor" value={item.floor} disabled={!editable} onChange={set(["base_residual_floors", index, "floor"])} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Risk concentration rules" subtitle="Dangerous combinations that hold residual risk up regardless of controls">
        <ul className="space-y-3">
          {config.concentration_rules.map((rule, index) => (
            <li key={rule.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{rule.name}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rule.factors.join(" + ")}</p>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                Floor
                <NumberInput label={`${rule.name} floor`} value={rule.floor} disabled={!editable} onChange={set(["concentration_rules", index, "floor"])} />
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Override escalation policy" subtitle="What happens when an analyst lowers the system rating">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">Committee must acknowledge a downgrade of (bands)</td>
              <td className="py-2 text-right"><NumberInput label="Acknowledge bands" value={config.override_policy.acknowledge_downgrade_bands} min={1} max={3} disabled={!editable} onChange={set(["override_policy", "acknowledge_downgrade_bands"])} /></td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">Escalate a downgrade of (bands)</td>
              <td className="py-2 text-right"><NumberInput label="Escalate bands" value={config.override_policy.escalate_downgrade_bands} min={1} max={3} disabled={!editable} onChange={set(["override_policy", "escalate_downgrade_bands"])} /></td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">Minimum reason length for a downgrade (characters)</td>
              <td className="py-2 text-right"><NumberInput label="Minimum reason" value={config.override_policy.min_reason_chars_downgrade} min={0} disabled={!editable} onChange={set(["override_policy", "min_reason_chars_downgrade"])} /></td>
            </tr>
            {[
              ["escalate_below_concentration_floor", "Escalate ratings below a concentration floor"],
              ["escalated_blocks_unconditional_approval", "Escalated downgrades cannot be approved unconditionally"],
            ].map(([key, label]) => (
              <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2">{label}</td>
                <td className="py-2 text-right">
                  <input type="checkbox" aria-label={label} checked={Boolean(config.override_policy[key])} disabled={!editable} onChange={(e) => set(["override_policy", key])(e.target.checked)} className="h-4 w-4" />
                </td>
              </tr>
            ))}
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">Always escalate downgrades from</td>
              <td className="py-2 text-right text-sm">{(config.override_policy.escalate_downgrade_from || []).join(", ") || "—"}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Workflow SLA" subtitle="Intake-to-decision target and per-stage targets (hours)">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2 font-medium">Submission to committee decision</td>
              <td className="py-2 text-right"><NumberInput label="SLA target hours" value={config.workflow.sla_target_hours} min={1} disabled={!editable} onChange={set(["workflow", "sla_target_hours"])} /></td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">Flag as at risk after (% of SLA)</td>
              <td className="py-2 text-right"><NumberInput label="At risk threshold" value={config.workflow.at_risk_threshold_pct} min={1} max={100} disabled={!editable} onChange={set(["workflow", "at_risk_threshold_pct"])} /></td>
            </tr>
            {Object.entries(config.workflow.stage_targets_hours).map(([stage, hours]) => (
              <tr key={stage} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2 pl-4 text-slate-600 dark:text-slate-400">{STAGE_LABELS[stage] || stage}</td>
                <td className="py-2 text-right"><NumberInput label={`${stage} target`} value={hours} min={0} disabled={!editable} onChange={set(["workflow", "stage_targets_hours", stage])} /></td>
              </tr>
            ))}
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">Default due date for approval conditions (days)</td>
              <td className="py-2 text-right"><NumberInput label="Condition due days" value={config.workflow.condition_default_due_days} min={1} disabled={!editable} onChange={set(["workflow", "condition_default_due_days"])} /></td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Factor thresholds" subtitle="Inputs above these values raise a risk factor">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">High transaction velocity (transactions per period)</td>
              <td className="py-2 text-right"><NumberInput label="Velocity threshold" value={config.thresholds.high_transaction_velocity} min={0} disabled={!editable} onChange={set(["thresholds", "high_transaction_velocity"])} /></td>
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2">Large customer population</td>
              <td className="py-2 text-right"><NumberInput label="Customer population threshold" value={config.thresholds.large_customer_population} min={0} step={1000} disabled={!editable} onChange={set(["thresholds", "large_customer_population"])} /></td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="xl:col-span-2">
        <Card title="Factor catalog" subtitle="Score (0–100) and within-category weight of every factor the engine can raise">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Object.entries(config.factor_catalog).map(([category, factors]) => (
              <div key={category} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{CATEGORY_LABELS[category]}</p>
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
                    <tr><th className="py-1 text-left">Factor</th><th className="py-1 text-right">Score</th><th className="py-1 text-right">Weight</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(factors).map(([name, entry]) => (
                      <tr key={name} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5">{name}</td>
                        <td className="py-1.5 text-right"><NumberInput label={`${name} score`} value={entry.score} min={0} max={100} disabled={!editable} onChange={set(["factor_catalog", category, name, "score"])} /></td>
                        <td className="py-1.5 text-right"><NumberInput label={`${name} weight`} value={entry.weight} step={0.05} min={0} disabled={!editable} onChange={set(["factor_catalog", category, name, "weight"])} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Framework tab
// ---------------------------------------------------------------------------

function RefList({ refs }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {refs.map((ref) => (
        <li key={`${ref.source}-${ref.clause}`} className="text-sm">
          <span className="font-medium text-slate-800 dark:text-slate-200">{ref.source_title}</span>
          <span className="text-slate-500 dark:text-slate-400"> — {ref.clause}</span>
          {ref.in_corpus && (
            <span className="ml-2 rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">in evidence corpus</span>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">{ref.requirement}</p>
        </li>
      ))}
    </ul>
  );
}

function FrameworkTab() {
  const [framework, setFramework] = useState(null);
  useEffect(() => {
    api.get("/methodology/framework").then((r) => setFramework(r.data)).catch(() => setFramework(null));
  }, []);
  if (!framework) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading framework…</p>;

  return (
    <div className="space-y-6">
      <Card
        title={framework.title}
        subtitle={`Framework mapping v${framework.framework_version}`}
        actions={
          framework.coverage_gaps.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={14} /> Every category, factor and rule is mapped
            </span>
          ) : (
            <span className="rounded-full bg-red-50 dark:bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
              {framework.coverage_gaps.length} unmapped item(s)
            </span>
          )
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">{framework.description}</p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {framework.methodology_basis.map((item) => (
            <div key={item.principle} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.principle}</p>
              <RefList refs={item.references} />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {framework.categories.map((category) => (
          <Card key={category.category} title={category.label} subtitle={`${category.definition} Weight ${category.weight}.`}>
            <RefList refs={category.references} />
            <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
              {category.factors.map((factor) => (
                <details key={factor.name} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800 dark:text-slate-200">
                    {factor.name}
                    <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">score {factor.score} · weight {factor.weight}</span>
                  </summary>
                  <RefList refs={factor.references} />
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card title="Concentration rules" subtitle="Why these combinations cannot be averaged away">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {framework.concentration_rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{rule.name} · floor {rule.floor}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{rule.factors.join(" + ")}</p>
              <RefList refs={rule.references} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Version detail (draft editing, impact preview, approval)
// ---------------------------------------------------------------------------

function ImpactPreview({ versionId }) {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true);
    try {
      setImpact((await api.get(`/methodology/versions/${versionId}/impact`)).data);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card
      title="What-if impact on the current portfolio"
      subtitle="Re-scores every assessed request under this version without changing any stored assessment"
      actions={
        <button type="button" onClick={run} disabled={loading} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60">
          {loading ? "Scoring…" : impact ? "Re-run preview" : "Run impact preview"}
        </button>
      }
    >
      {!impact ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Run the preview to see which ratings would change.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-900 dark:text-slate-900">{impact.requests_rescored} requests</span>
            <span className="rounded-full bg-red-50 dark:bg-red-950/40 px-3 py-1 text-red-700 dark:text-red-300">{impact.ratings_up} rating(s) up</span>
            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-emerald-700 dark:text-emerald-300">{impact.ratings_down} rating(s) down</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-900 dark:text-slate-900">{impact.unchanged} unchanged</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="py-2 text-left">Request</th>
                  <th className="py-2 text-right">Current</th>
                  <th className="py-2 text-right">Proposed</th>
                  <th className="py-2 text-right">Δ residual</th>
                </tr>
              </thead>
              <tbody>
                {impact.rows.map((row) => (
                  <tr key={row.change_request_id} className={`border-t border-slate-100 dark:border-slate-800 ${row.rating_changed ? "bg-amber-50 dark:bg-amber-950/40/60 dark:bg-amber-950/30" : ""}`}>
                    <td className="py-2">
                      <span className="font-medium">{row.request_number}</span>
                      <span className="ml-2 text-slate-500 dark:text-slate-400">{row.title}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.current_residual} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getRatingBadgeClass(row.current_rating)}`}>{row.current_rating}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.proposed_residual} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getRatingBadgeClass(row.proposed_rating)}`}>{row.proposed_rating}</span>
                    </td>
                    <td className={`py-2 text-right tabular-nums ${row.delta > 0 ? "text-red-600 dark:text-red-400" : row.delta < 0 ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>
                      {row.delta > 0 ? "+" : ""}{row.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{impact.note}</p>
        </>
      )}
    </Card>
  );
}

function VersionDetail({ versionId, user, permissions, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [draftConfig, setDraftConfig] = useState(null);
  const [summary, setSummary] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await api.get(`/methodology/versions/${versionId}`);
    setDetail(response.data);
    setDraftConfig(response.data.config);
    setSummary(response.data.change_summary || "");
  };

  useEffect(() => {
    load();
  }, [versionId]);

  if (!detail) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading version…</p>;

  const isDraft = detail.status === "DRAFT";
  const isPending = detail.status === "PENDING_APPROVAL";
  const isProposer = detail.created_by_user_id === user?.id;
  const canEdit = isDraft && permissions.canPropose;
  const canReview = isPending && permissions.canApprove && !isProposer;

  const act = async (request) => {
    try {
      setBusy(true);
      setError("");
      await request();
      await load();
      await onChanged();
    } catch (err) {
      const detailError = err?.response?.data?.detail;
      setError(
        detailError?.validation_errors?.join(" ") ||
          (typeof detailError === "string" ? detailError : "Action failed.")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title={`Version ${detail.version}`}
        subtitle={`Proposed by ${detail.created_by || "—"} on ${formatShortDate(detail.created_at)}${detail.based_on_version ? ` · based on v${detail.based_on_version}` : ""}`}
        actions={<StatusBadge status={detail.status} />}
      >
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">What changed and why</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={!canEdit}
          rows={3}
          placeholder="e.g. Raise fraud weight after the mule-account typology review (ref. FIU-IND advisory)…"
          className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 disabled:border-slate-200 dark:disabled:border-slate-700 disabled:bg-slate-50 dark:disabled:bg-slate-800/50"
        />

        {detail.changes_from_base.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Changes from v{detail.based_on_version}</p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
              {detail.changes_from_base.map((change) => (
                <li key={change.path}>
                  {change.path}: {JSON.stringify(change.from)} → <span className="font-semibold text-slate-900 dark:text-slate-100">{JSON.stringify(change.to)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.validation_errors.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">
            {detail.validation_errors.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}
        {detail.review_note && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400"><span className="font-medium">Reviewer note:</span> {detail.review_note}</p>
        )}
        {detail.approved_by && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Approved by {detail.approved_by} on {formatShortDate(detail.approved_at)}.</p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
          {canEdit && (
            <>
              <button type="button" disabled={busy} onClick={() => act(() => api.put(`/methodology/versions/${versionId}`, { config: draftConfig, change_summary: summary }))} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60">
                Save draft
              </button>
              <button type="button" disabled={busy} onClick={() => act(async () => {
                await api.put(`/methodology/versions/${versionId}`, { config: draftConfig, change_summary: summary });
                await api.post(`/methodology/versions/${versionId}/submit`);
              })} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                Submit for approval
              </button>
            </>
          )}
          {isPending && isProposer && permissions.canApprove && (
            <p className="text-sm text-amber-700">Maker-checker: a different approver must review a change you proposed.</p>
          )}
          {canReview && (
            <div className="flex w-full flex-col gap-2">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Approval note (required to reject)…" className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => act(() => api.post(`/methodology/versions/${versionId}/approve`, { note }))} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  Approve and publish
                </button>
                <button type="button" disabled={busy || !note.trim()} onClick={() => act(() => api.post(`/methodology/versions/${versionId}/reject`, { note }))} className="rounded-lg border border-red-300 dark:border-red-800 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 disabled:opacity-60">
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </Card>

      {(isDraft || isPending) && <ImpactPreview versionId={versionId} />}

      <ConfigPanel config={draftConfig} editable={canEdit} onChange={setDraftConfig} />

      {detail.history.length > 0 && (
        <Card title="Lifecycle" subtitle="Append-only history of this version">
          <ul className="space-y-2 text-sm">
            {detail.history.map((event, index) => (
              <li key={index} className="flex flex-wrap gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">{event.action.replaceAll("_", " ").toLowerCase()}</span>
                <span className="text-slate-500 dark:text-slate-400">by {event.actor} · {formatShortDate(event.created_at)}</span>
                {event.note && <span className="text-slate-600 dark:text-slate-400">— {event.note}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function Methodology() {
  const { user } = useAuth();
  const permissions = getMethodologyPermissions(user?.role);
  const [tab, setTab] = useState("methodology");
  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");

  const loadVersions = async () => {
    try {
      const response = await api.get("/methodology/versions");
      setVersions(response.data.versions);
      setSelectedId((current) => current ?? response.data.versions.find((v) => v.status === "ACTIVE")?.id ?? null);
    } catch {
      setError("Unable to load methodology versions.");
    }
  };

  useEffect(() => {
    loadVersions();
  }, []);

  const active = useMemo(() => versions.find((v) => v.status === "ACTIVE"), [versions]);
  const openDraft = versions.find((v) => v.status === "DRAFT" || v.status === "PENDING_APPROVAL");

  const createDraft = async () => {
    try {
      setError("");
      const response = await api.post("/methodology/versions", { change_summary: "" });
      await loadVersions();
      setSelectedId(response.data.id);
      setTab("methodology");
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not create a draft.");
    }
  };

  const tabs = [
    { key: "methodology", label: "Methodology", Icon: SlidersHorizontal },
    { key: "framework", label: "Framework basis", Icon: BookOpen },
    { key: "versions", label: "Versions", Icon: History },
  ];

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">Risk methodology</h1>
          <p className="mt-2 text-base text-slate-600 dark:text-slate-400 lg:text-lg">
            Versioned scoring parameters and workflow rules. Analysts propose changes, the committee approves them, and
            every assessment records the version it was scored under.
          </p>
          {active && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Active: <b>v{active.version}</b>
              {active.approved_by ? ` · approved by ${active.approved_by}` : ""} · since {formatShortDate(active.effective_from)}
            </p>
          )}
        </div>
        {permissions.canPropose && !openDraft && (
          <button type="button" onClick={createDraft} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            <GitBranch size={16} />
            Propose a change
          </button>
        )}
        {openDraft && (
          <button type="button" onClick={() => { setSelectedId(openDraft.id); setTab("methodology"); }} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-5 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle size={16} />
            v{openDraft.version} is {openDraft.status === "DRAFT" ? "in draft" : "awaiting approval"}
          </button>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
        {tabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
              tab === key ? "border-indigo-600 text-indigo-700 dark:text-indigo-300" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "methodology" && selectedId && (
        <VersionDetail key={selectedId} versionId={selectedId} user={user} permissions={permissions} onChanged={loadVersions} />
      )}

      {tab === "framework" && <FrameworkTab />}

      {tab === "versions" && (
        <Card title="Methodology versions" subtitle="Published versions are immutable">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="py-2 text-left">Version</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Change</th>
                  <th className="py-2 text-left">Proposed</th>
                  <th className="py-2 text-left">Approved</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id} className="cursor-pointer border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => { setSelectedId(version.id); setTab("methodology"); }}>
                    <td className="py-2 font-semibold">v{version.version}</td>
                    <td className="py-2"><StatusBadge status={version.status} /></td>
                    <td className="max-w-md py-2 text-slate-600 dark:text-slate-400">{version.change_summary || "—"}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{version.created_by} · {formatShortDate(version.created_at)}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{version.approved_by ? `${version.approved_by} · ${formatShortDate(version.approved_at)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}

export default Methodology;
