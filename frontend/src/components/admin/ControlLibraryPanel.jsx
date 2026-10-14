import { useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, X } from "lucide-react";

import api from "../../services/api";
import {
  Panel,
  buttonPrimary,
  buttonSecondary,
  errorText,
  inputClass,
  labelClass,
} from "./ui";

const CATEGORY_LABELS = {
  CUSTOMER: "Customer",
  PRODUCT: "Product",
  GEOGRAPHY: "Geography",
  TRANSACTION: "Transaction",
  CHANNEL: "Channel",
  THIRD_PARTY: "Third party",
  FRAUD: "Fraud",
};

const titleCase = (value) =>
  (value || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());

const EMPTY = {
  code: "",
  name: "",
  description: "",
  risk_categories: [],
  control_type: "PREVENTIVE",
  control_nature: "MANUAL",
  frequency: "PER_EVENT",
  is_key_control: false,
  owner: "",
  regulatory_references: "",
  default_design_rating: "EFFECTIVE",
  default_operating_rating: "NOT_TESTED",
  active: true,
};

function ControlForm({ initial, options, onCancel, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editingId = initial.id;

  const toggleCategory = (category) =>
    setForm((current) => ({
      ...current,
      risk_categories: current.risk_categories.includes(category)
        ? current.risk_categories.filter((c) => c !== category)
        : [...current.risk_categories, category],
    }));

  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form };
    delete payload.id;
    try {
      setSaving(true);
      setError("");
      if (editingId) {
        await api.put(`/control-library/${editingId}`, payload);
      } else {
        await api.post("/control-library", payload);
      }
      await onSaved();
    } catch (err) {
      setError(errorText(err, "Could not save the control."));
    } finally {
      setSaving(false);
    }
  };

  const select = (key, label, values) => (
    <div>
      <label className={labelClass} htmlFor={`lib-${key}`}>{label}</label>
      <select
        id={`lib-${key}`}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputClass}
      >
        {values.map((value) => (
          <option key={value} value={value}>{titleCase(value)}</option>
        ))}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <div>
          <label className={labelClass} htmlFor="lib-code">Code *</label>
          <input id="lib-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="TM-02" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="lib-name">Name *</label>
          <input id="lib-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor="lib-description">Description</label>
        <textarea id="lib-description" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
      </div>
      <div>
        <span className={labelClass}>Mitigates risk categories</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.categories.map((category) => {
            const on = form.risk_categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(category)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  on
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {select("control_type", "Type", options.control_types)}
        {select("control_nature", "Nature", options.control_natures)}
        {select("frequency", "Frequency", options.frequencies)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {select("default_design_rating", "Default design rating", options.ratings)}
        {select("default_operating_rating", "Default operating rating", options.ratings)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="lib-owner">Owner</label>
          <input id="lib-owner" value={form.owner || ""} onChange={(e) => setForm({ ...form, owner: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="lib-refs">Regulatory references</label>
          <input id="lib-refs" value={form.regulatory_references || ""} onChange={(e) => setForm({ ...form, regulatory_references: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_key_control} onChange={(e) => setForm({ ...form, is_key_control: e.target.checked })} className="h-4 w-4" />
          Key control
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4" />
          Available to analysts
        </label>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={buttonPrimary}>
          {saving ? "Saving…" : editingId ? "Save changes" : "Add to library"}
        </button>
        <button type="button" onClick={onCancel} className={buttonSecondary}>Cancel</button>
      </div>
    </form>
  );
}

function ControlLibraryPanel() {
  const [controls, setControls] = useState([]);
  const [options, setOptions] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const response = await api.get("/control-library", { params: { include_inactive: true } });
      setControls(response.data.controls);
      setOptions(response.data.options);
    } catch {
      setError("Unable to load the control library.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Panel
      title="Control library"
      subtitle="The standard controls analysts pick from. Each control is mapped to the risk categories it mitigates, so residual risk can be reduced only where a control actually applies."
      actions={
        options && !editing && (
          <button type="button" onClick={() => setEditing({ ...EMPTY })} className={buttonPrimary}>
            <Plus size={16} /> Add control
          </button>
        )
      }
    >
      {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {editing && options && (
        <div className="mb-4">
          <ControlForm
            key={editing.id || "new"}
            initial={editing}
            options={options}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-xs uppercase text-slate-400 dark:text-slate-500">
            <tr>
              <th className="py-2 text-left">Control</th>
              <th className="py-2 text-left">Mitigates</th>
              <th className="py-2 text-left">Type · nature · frequency</th>
              <th className="py-2 text-left">Owner</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {controls.map((control) => (
              <tr key={control.id} className={`border-t border-slate-100 align-top dark:border-slate-800 ${control.active ? "" : "opacity-50"}`}>
                <td className="py-2 pr-3">
                  <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{control.code}</span>
                    {control.name}
                    {control.is_key_control && <KeyRound size={13} className="text-amber-600 dark:text-amber-400" aria-label="Key control" />}
                  </p>
                  {control.regulatory_references && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{control.regulatory_references}</p>
                  )}
                  {!control.active && <p className="text-xs font-semibold text-slate-500">Inactive</p>}
                </td>
                <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                  {control.risk_categories.length
                    ? control.risk_categories.map((c) => CATEGORY_LABELS[c]).join(", ")
                    : "All"}
                </td>
                <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                  {titleCase(control.control_type)} · {titleCase(control.control_nature)} · {titleCase(control.frequency)}
                </td>
                <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">{control.owner || "—"}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...control })}
                    aria-label={`Edit ${control.name}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    {editing?.id === control.id ? <X size={15} /> : <Pencil size={15} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default ControlLibraryPanel;
