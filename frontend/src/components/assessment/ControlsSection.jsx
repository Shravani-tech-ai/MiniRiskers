import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import api from "../../services/api";

function ControlsSection({
  changeRequestId,
  controls,
  riskAssessment,
  onControlsChanged,
  setError,
}) {
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
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

      await onControlsChanged();
    } catch (err) {
      setError(
        err?.response?.data?.detail || "Failed to save control."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
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
    <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Controls & residual risk
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Document mitigating controls. Residual risk uses average
                control effectiveness vs inherent score.
              </p>
            </div>
          </div>

          {riskAssessment && (
            <div className="text-right text-sm">
              <p className="text-slate-500">Control adjustment</p>
              <p className="font-semibold text-slate-900">
                {riskAssessment.control_adjustment ?? "—"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Control name *
            </label>
            <input
              type="text"
              value={form.control_name}
              onChange={(event) =>
                setForm({ ...form, control_name: event.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
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
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add control"}
          </button>
        </form>

        <div>
          <p className="text-sm font-semibold text-slate-700">
            Registered controls ({controls.length})
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Average effectiveness: {avgEffectiveness.toFixed(1)}%
          </p>

          <div className="mt-4 space-y-3">
            {controls.length === 0 ? (
              <p className="text-sm text-slate-500">
                No controls recorded yet.
              </p>
            ) : (
              controls.map((control) => (
                <div
                  key={control.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="font-medium text-slate-900">
                    {control.control_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {control.control_category} ·{" "}
                    {control.control_type} · Effectiveness{" "}
                    {control.effectiveness_score ?? "—"}%
                  </p>
                </div>
              ))
            )}
          </div>

          {controls.length > 0 && riskAssessment && (
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={recalculating}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              {recalculating && (
                <Loader2 size={14} className="animate-spin" />
              )}
              Recalculate residual risk
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ControlsSection;
