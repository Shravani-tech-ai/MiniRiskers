import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, Send } from "lucide-react";

import api from "../../services/api";
import { formatShortDate } from "../../utils/riskDisplay";
import SettingsPanel from "./SettingsPanel";
import { Bars, Panel, Stat, buttonPrimary, buttonSecondary, errorText } from "./ui";

const CATEGORY_LABELS = {
  CUSTOMER: "Customer",
  PRODUCT: "Product",
  GEOGRAPHY: "Geography",
  TRANSACTION: "Transaction",
  CHANNEL: "Channel",
  THIRD_PARTY: "Third party",
  FRAUD: "Fraud",
};

const TRAINING_KEYS = [
  "training_min_cases",
  "training_max_cases",
  "training_lookback_days",
  "ai_learning_enabled",
  "ai_learning_examples",
];

function RunCard({ run, onShare, sharing }) {
  const metrics = run.metrics;
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Run #{run.id}{" "}
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              run.status === "COMPLETED"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            }`}>
              {run.status === "COMPLETED" ? "Completed" : "Not enough data"}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatShortDate(run.created_at)} by {run.created_by} · methodology v{run.methodology_version} · {run.cases_used} cases
          </p>
        </div>
        {run.status === "COMPLETED" &&
          (run.shared_at ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Shared with the Risk Committee {formatShortDate(run.shared_at)}
              {run.adopted_methodology_version_id ? " · draft started" : ""}
            </span>
          ) : (
            <button type="button" onClick={() => onShare(run)} disabled={sharing} className={buttonSecondary}>
              <Send size={15} /> Share with Risk Committee
            </button>
          ))}
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{run.message}</p>

      {run.status === "COMPLETED" && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
              <tr>
                <th className="py-1 text-left">Category weight</th>
                <th className="py-1 text-right">Current</th>
                <th className="py-1 text-right">Suggested</th>
                <th className="py-1 text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(run.current_weights).map((category) => {
                const delta = metrics.weight_changes[category];
                return (
                  <tr key={category} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5">{CATEGORY_LABELS[category]}</td>
                    <td className="py-1.5 text-right tabular-nums">{run.current_weights[category].toFixed(3)}</td>
                    <td className="py-1.5 text-right font-semibold tabular-nums">{run.suggested_weights[category].toFixed(3)}</td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      {delta > 0 ? "+" : ""}{delta.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Exact agreement with final ratings: {metrics.agreement_current.exact}% now → {metrics.agreement_suggested.exact}% suggested
            (within one band: {metrics.agreement_current.within_one_band}% → {metrics.agreement_suggested.within_one_band}%). {metrics.note}
          </p>
        </div>
      )}
    </div>
  );
}

function TrainingPanel() {
  const [runs, setRuns] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [running, setRunning] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [runsResponse, performanceResponse] = await Promise.all([
        api.get("/training-runs"),
        api.get("/admin/model-performance"),
      ]);
      setRuns(runsResponse.data.runs);
      setPerformance(performanceResponse.data);
    } catch {
      setError("Unable to load training data.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const train = async () => {
    try {
      setRunning(true);
      setError("");
      await api.post("/training-runs");
      await load();
    } catch (err) {
      setError(errorText(err, "Training failed."));
    } finally {
      setRunning(false);
    }
  };

  const share = async (run) => {
    try {
      setSharing(true);
      await api.post(`/training-runs/${run.id}/share`);
      await load();
    } catch (err) {
      setError(errorText(err, "Could not share the run."));
    } finally {
      setSharing(false);
    }
  };

  const directions = performance?.override_directions || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Decided cases" value={performance?.decided_cases} hint="Available to learn from" />
        <Stat
          label="System matches final rating"
          value={performance?.system_vs_final_agreement != null ? `${performance.system_vs_final_agreement}%` : "—"}
          hint="Residual rating vs analyst's final rating"
        />
        <Stat label="Analyst upgrades" value={directions.UPGRADE ?? 0} hint="Rated higher than the system" />
        <Stat label="Analyst downgrades" value={directions.DOWNGRADE ?? 0} hint="Rated lower than the system" />
      </div>

      <Panel
        title="Calibrate methodology weights"
        subtitle="Fits the category weights to how analysts actually rated decided cases. The result is a suggestion: share it with the Risk Committee, who can turn it into a methodology draft for your approval."
        actions={
          <button type="button" onClick={train} disabled={running} className={buttonPrimary}>
            {running ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
            {running ? "Training…" : "Run training"}
          </button>
        }
      >
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No training runs yet.</p>
        ) : (
          <div className="space-y-4">
            {runs.slice(0, 5).map((run) => (
              <RunCard key={run.id} run={run} onShare={share} sharing={sharing} />
            ))}
          </div>
        )}
      </Panel>

      <SettingsPanel
        keys={TRAINING_KEYS}
        title="Training data and AI learning"
        subtitle="How much past data training uses, and whether the AI sees similar decided cases."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Agreement by month" subtitle="% of decided cases where the system's residual rating matched the final rating">
          <Bars
            data={(performance?.agreement_by_month || []).map((row) => ({
              label: `${row.month} (${row.cases})`,
              value: row.agreement,
            }))}
            max={100}
            unit="%"
          />
        </Panel>
        <Panel title="Why analysts override" subtitle="Structured reasons recorded with analyst overrides">
          <Bars
            data={(performance?.override_reason_codes || []).map((row) => ({
              label: row.label,
              value: row.count,
            }))}
          />
        </Panel>
        <Panel title="AI draft feedback" subtitle="Analyst and committee ratings of AI assessment drafts">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {performance?.ai_feedback.total
              ? `${performance.ai_feedback.helpful_rate}% helpful (${performance.ai_feedback.helpful} of ${performance.ai_feedback.total}).`
              : "No feedback on AI drafts yet."}
          </p>
          <div className="mt-3">
            <Bars
              data={Object.entries(performance?.ai_feedback.not_helpful_reasons || {}).map(([label, value]) => ({
                label: label.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()),
                value,
              }))}
            />
          </div>
        </Panel>
        <Panel title="AI models used" subtitle="Model that produced each AI draft">
          <Bars
            data={Object.entries(performance?.ai_models_used || {}).map(([label, value]) => ({ label, value }))}
          />
        </Panel>
      </div>
    </div>
  );
}

export default TrainingPanel;
