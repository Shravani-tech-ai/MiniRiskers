import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Pencil, ShieldCheck, Trash2 } from "lucide-react";

import api from "../../services/api";

const CATEGORY_LABELS = {
  CUSTOMER: "Customer",
  PRODUCT: "Product",
  GEOGRAPHY: "Geography",
  TRANSACTION: "Transaction",
  CHANNEL: "Channel",
  THIRD_PARTY: "Third party",
  FRAUD: "Fraud",
};

const RATING_LABELS = {
  EFFECTIVE: "Effective",
  PARTIALLY_EFFECTIVE: "Partially effective",
  INEFFECTIVE: "Ineffective",
  NOT_TESTED: "Not tested",
};

const DEFAULT_SCALE = {
  EFFECTIVE: 90,
  PARTIALLY_EFFECTIVE: 50,
  INEFFECTIVE: 0,
  NOT_TESTED: 30,
};

const titleCase = (value) =>
  (value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());

const EMPTY_CUSTOM = {
  control_name: "",
  description: "",
  risk_categories: [],
  control_type: "PREVENTIVE",
  control_nature: "MANUAL",
  frequency: "PER_EVENT",
  is_key_control: false,
  owner: "",
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm";
const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";

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
  const [removingId, setRemovingId] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  // Coming back from analyst review, show the documented controls first and
  // only open the form when the analyst chooses to edit them.
  const [editing, setEditing] = useState(!reopensRiskStage);
  const showForm = !readOnly && editing;

  const [library, setLibrary] = useState([]);
  const [options, setOptions] = useState(null);
  const [controlsConfig, setControlsConfig] = useState({
    residual_method: "AVERAGE",
    effectiveness_scale: DEFAULT_SCALE,
  });
  const [mode, setMode] = useState("library");
  const [libraryId, setLibraryId] = useState("");
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const [design, setDesign] = useState("EFFECTIVE");
  const [operating, setOperating] = useState("NOT_TESTED");

  useEffect(() => {
    if (readOnly) return;
    api
      .get("/control-library")
      .then((response) => {
        setLibrary(response.data.controls);
        setOptions(response.data.options);
      })
      .catch(() => setLibrary([]));
    api
      .get("/methodology/active")
      .then((response) => {
        const stored = response.data?.config?.controls;
        if (stored) {
          setControlsConfig({
            residual_method: stored.residual_method || "AVERAGE",
            effectiveness_scale: { ...DEFAULT_SCALE, ...stored.effectiveness_scale },
          });
        }
      })
      .catch(() => {});
  }, [readOnly]);

  const selected = useMemo(
    () => library.find((item) => String(item.id) === String(libraryId)) || null,
    [library, libraryId]
  );

  const pickLibraryControl = (id) => {
    setLibraryId(id);
    const item = library.find((entry) => String(entry.id) === String(id));
    if (item) {
      setDesign(item.default_design_rating || "EFFECTIVE");
      setOperating(item.default_operating_rating || "NOT_TESTED");
    }
  };

  const scale = controlsConfig.effectiveness_scale;
  const previewScore = Math.min(scale[design] ?? 0, scale[operating] ?? 0);

  const recalculateResidual = async () => {
    try {
      setRecalculating(true);
      setError("");
      await api.post(`/change-requests/${changeRequestId}/calculate-risk`);
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (mode === "library" && !selected) {
      setError("Choose a control from the library.");
      return;
    }
    if (mode === "custom" && !custom.control_name.trim()) {
      setError("Name the custom control.");
      return;
    }

    const payload =
      mode === "library"
        ? { library_control_id: selected.id }
        : { ...custom };

    try {
      setSaving(true);
      setError("");
      await api.post(`/change-requests/${changeRequestId}/controls`, {
        ...payload,
        design_effectiveness_rating: design,
        operating_effectiveness_rating: operating,
      });
      setLibraryId("");
      setCustom(EMPTY_CUSTOM);
      setDesign("EFFECTIVE");
      setOperating("NOT_TESTED");
      await recalculateResidual();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to save control.");
    } finally {
      setSaving(false);
    }
  };

  const removeControl = async (control) => {
    try {
      setRemovingId(control.id);
      setError("");
      await api.delete(
        `/change-requests/${changeRequestId}/controls/${control.id}`
      );
      await recalculateResidual();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to remove control.");
    } finally {
      setRemovingId(null);
    }
  };

  const toggleCategory = (category) =>
    setCustom((current) => ({
      ...current,
      risk_categories: current.risk_categories.includes(category)
        ? current.risk_categories.filter((c) => c !== category)
        : [...current.risk_categories, category],
    }));

  const usedLibraryIds = new Set(
    controls.map((control) => control.library_control_id).filter(Boolean)
  );

  const avgEffectiveness =
    controls.length > 0
      ? controls.reduce(
          (sum, control) => sum + Number(control.effectiveness_score || 0),
          0
        ) / controls.length
      : 0;

  const methodText =
    controlsConfig.residual_method === "PER_CATEGORY"
      ? "Residual reduces each risk category only by the controls mapped to it."
      : "Residual uses the average effectiveness of all controls against the inherent score.";

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
                {showForm
                  ? "Pick mitigating controls from the control library and record their tested design and operating effectiveness. "
                  : "Mitigating controls documented for this assessment. "}
                {methodText}
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
                Changing controls recalculates residual risk and returns this
                request to the risk step. Continue to analyst review afterwards
                to regenerate the AI assessment.
              </p>
            )}

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 text-sm">
              {[
                ["library", "From control library"],
                ["custom", "Custom control"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`rounded-md px-3 py-1.5 font-semibold ${
                    mode === key
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "library" ? (
              <div>
                <label className={labelClass} htmlFor="library-control">
                  Library control *
                </label>
                <select
                  id="library-control"
                  value={libraryId}
                  onChange={(event) => pickLibraryControl(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a control…</option>
                  {library.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={usedLibraryIds.has(item.id)}
                    >
                      {item.code} · {item.name}
                      {usedLibraryIds.has(item.id) ? " (added)" : ""}
                    </option>
                  ))}
                </select>
                {selected && (
                  <div className="mt-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs leading-5 text-slate-600 dark:text-slate-400">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {selected.description}
                    </p>
                    <p className="mt-2">
                      {titleCase(selected.control_type)} ·{" "}
                      {titleCase(selected.control_nature)} ·{" "}
                      {titleCase(selected.frequency)}
                      {selected.is_key_control ? " · Key control" : ""}
                      {selected.owner ? ` · Owner: ${selected.owner}` : ""}
                    </p>
                    <p>
                      Mitigates:{" "}
                      {selected.risk_categories.length
                        ? selected.risk_categories
                            .map((c) => CATEGORY_LABELS[c])
                            .join(", ")
                        : "All categories"}
                    </p>
                    {selected.regulatory_references && (
                      <p>Regulation: {selected.regulatory_references}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={labelClass} htmlFor="custom-name">
                    Control name *
                  </label>
                  <input
                    id="custom-name"
                    type="text"
                    value={custom.control_name}
                    onChange={(event) =>
                      setCustom({ ...custom, control_name: event.target.value })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className={labelClass}>Mitigates risk categories</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                      const on = custom.risk_categories.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleCategory(key)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            on
                              ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
                              : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Leave all unselected if it mitigates every category.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["control_type", "Type", options?.control_types],
                    ["control_nature", "Nature", options?.control_natures],
                    ["frequency", "Frequency", options?.frequencies],
                  ].map(([key, label, values]) => (
                    <div key={key}>
                      <label className={labelClass} htmlFor={`custom-${key}`}>
                        {label}
                      </label>
                      <select
                        id={`custom-${key}`}
                        value={custom[key]}
                        onChange={(event) =>
                          setCustom({ ...custom, [key]: event.target.value })
                        }
                        className={inputClass}
                      >
                        {(values || [custom[key]]).map((value) => (
                          <option key={value} value={value}>
                            {titleCase(value)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={custom.is_key_control}
                    onChange={(event) =>
                      setCustom({ ...custom, is_key_control: event.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Key control
                </label>
                <div>
                  <label className={labelClass} htmlFor="custom-description">
                    Description
                  </label>
                  <textarea
                    id="custom-description"
                    value={custom.description}
                    onChange={(event) =>
                      setCustom({ ...custom, description: event.target.value })
                    }
                    rows={2}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                ["design", "Design effectiveness", design, setDesign],
                ["operating", "Operating effectiveness", operating, setOperating],
              ].map(([key, label, value, setter]) => (
                <div key={key}>
                  <label className={labelClass} htmlFor={`rating-${key}`}>
                    {label}
                  </label>
                  <select
                    id={`rating-${key}`}
                    value={value}
                    onChange={(event) => setter(event.target.value)}
                    className={inputClass}
                  >
                    {Object.entries(RATING_LABELS).map(([rating, text]) => (
                      <option key={rating} value={rating}>
                        {text}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Effectiveness credited:{" "}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {previewScore}%
              </span>{" "}
              (the weaker of design and operating, under the active methodology).
            </p>

            <div className="flex flex-wrap gap-3">
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
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>
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
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                      {control.control_name}
                      {control.is_key_control && (
                        <KeyRound
                          size={14}
                          className="text-amber-600 dark:text-amber-400"
                          aria-label="Key control"
                        />
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {control.mapped_categories?.length
                        ? control.mapped_categories
                            .map((c) => CATEGORY_LABELS[c])
                            .join(", ")
                        : control.control_category || "All categories"}{" "}
                      · {titleCase(control.control_type)}
                      {control.library_control_id ? " · Library" : " · Custom"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {control.design_effectiveness_rating
                        ? `Design ${RATING_LABELS[control.design_effectiveness_rating]} · Operating ${RATING_LABELS[control.operating_effectiveness_rating]} · `
                        : ""}
                      Effectiveness {control.effectiveness_score ?? "—"}%
                    </p>
                  </div>
                  {showForm && (
                    <button
                      type="button"
                      onClick={() => removeControl(control)}
                      disabled={removingId === control.id}
                      aria-label={`Remove ${control.control_name}`}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                    >
                      {removingId === control.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  )}
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
