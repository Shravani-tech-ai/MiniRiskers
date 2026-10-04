import { useState } from "react";
import { Loader2, Pencil, ShieldCheck } from "lucide-react";

import api from "../../services/api";

function ControlsSection({
  changeRequestId,
  controls,
  riskAssessment,
  onControlsChanged,
  setError,
  readOnly = false,
  reopensRiskStage = false,
}) {
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  // Coming back from analyst review, show the documented controls first and
  // only open the form when the analyst chooses to edit them.
  const [editing, setEditing] = useState(!reopensRiskStage);
  const showForm = !readOnly && editing;
  const [form, setForm] = useState({
    control_name: "",
    control_category: "AML",
    description: "",
    control_type: "PREVENTIVE",
    control_strength: "MEDIUM",
    implemented: true,
    implementation_status: "IMPLEMENTED",
    owner: "FCRM",
    effectiveness_score: 75,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.control_name.trim()) {
      setError("Control name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/control`,
        null,
        { params: form }
      );

      setForm({
        control_name: "",
        control_category: "AML",
        description: "",
        control_type: "PREVENTIVE",
        control_strength: "MEDIUM",
        implemented: true,
        implementation_status: "IMPLEMENTED",
        owner: "FCRM",
        effectiveness_score: 75,
      });

      await recalculateResidual();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to save control."
      );
    } finally {
      setSaving(false);
    }
  };

  const recalculateResidual = async () => {
    try {
      setRecalculating(true);
      setError("");

      await api.post(
        `/change-requests/${changeRequestId}/calculate-risk`
      );

      await onControlsChanged();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to recalculate risk with controls."
      );
    } finally {
      setRecalculating(false);
    }
  };

  const avgEffectiveness =
    controls.length > 0
      ? controls.reduce(
          (sum, control) =>
            sum + Number(control.effectiveness_score || 0),
          0
        ) / controls.length
      : 0;

  return (
    <div className="mt-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/40 p-2">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Controls & residual risk
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {!showForm
                  ? "Mitigating controls documented for this assessment. Residual uses average control effectiveness against the inherent score."
                  : "Document mitigating controls before residual risk can be calculated. Residual uses average control effectiveness against the inherent score."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            {riskAssessment && (
              <div className="text-right text-sm">
                <p className="text-slate-500 dark:text-slate-400">Control adjustment</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {riskAssessment.control_adjustment ?? "—"}
                </p>
              </div>
            )}
            {!readOnly && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/60"
              >
                <Pencil size={15} />
                Edit controls
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`grid gap-6 p-6 ${showForm ? "lg:grid-cols-2" : ""}`}>
        {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {reopensRiskStage && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              Adding a control recalculates residual risk and returns this
              request to the risk step. Continue to analyst review afterwards
              to regenerate the AI assessment.
            </p>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Control name *
            </label>
            <input
              type="text"
              value={form.control_name}
              onChange={(event) =>
                setForm({ ...form, control_name: event.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Category
              </label>
              <input
                type="text"
                value={form.control_category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    control_category: event.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Effectiveness (0–100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.effectiveness_score}
                onChange={(event) =>
                  setForm({
                    ...form,
                    effectiveness_score: Number(event.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-50 border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 dark:hover:bg-green-900/40"
          >
            {saving ? "Saving..." : "Add control"}
          </button>
          {reopensRiskStage && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="ml-3 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
        </form>
        )}

        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Registered controls ({controls.length})
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Average effectiveness: {avgEffectiveness.toFixed(1)}%
          </p>

          <div className="mt-4 space-y-3">
            {controls.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No controls recorded yet.
              </p>
            ) : (
              controls.map((control) => (
                <div
                  key={control.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {control.control_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {control.control_category} ·{" "}
                    {control.control_type} · Effectiveness{" "}
                    {control.effectiveness_score ?? "—"}%
                  </p>
                </div>
              ))
            )}
          </div>

          {controls.length > 0 && riskAssessment && recalculating && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              Recalculating residual risk...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlsSection;
