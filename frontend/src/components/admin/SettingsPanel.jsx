import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import api from "../../services/api";
import { formatShortDate } from "../../utils/riskDisplay";
import { Panel, buttonPrimary, errorText } from "./ui";

// Renders the settings the backend describes, optionally only some keys.
function SettingsPanel({ keys = null, title = "System settings", subtitle, onSaved }) {
  const [settings, setSettings] = useState([]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const apply = (list) => {
    setSettings(list);
    setValues(Object.fromEntries(list.map((s) => [s.key, s.value])));
  };

  useEffect(() => {
    api
      .get("/admin/settings")
      .then((r) => apply(r.data.settings))
      .catch(() => setError("Unable to load settings."));
  }, []);

  const shown = keys ? settings.filter((s) => keys.includes(s.key)) : settings;
  const changed = shown.filter((s) => values[s.key] !== s.value);

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = Object.fromEntries(changed.map((s) => [s.key, values[s.key]]));
      const response = await api.put("/admin/settings", payload);
      apply(response.data.settings);
      setMessage("Saved.");
      onSaved?.();
    } catch (err) {
      setError(errorText(err, "Could not save settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      actions={
        <button type="button" onClick={save} disabled={saving || changed.length === 0} className={buttonPrimary}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save
        </button>
      }
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {shown.map((setting) => (
          <div key={setting.key} className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div className="min-w-0 max-w-xl">
              <label htmlFor={`setting-${setting.key}`} className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {setting.label}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {setting.help} Default: {String(setting.default)}.
                {setting.updated_by ? ` Last changed by ${setting.updated_by} on ${formatShortDate(setting.updated_at)}.` : ""}
              </p>
            </div>
            {setting.type === "boolean" ? (
              <input
                id={`setting-${setting.key}`}
                type="checkbox"
                checked={Boolean(values[setting.key])}
                onChange={(e) => setValues({ ...values, [setting.key]: e.target.checked })}
                className="h-5 w-5"
              />
            ) : (
              <input
                id={`setting-${setting.key}`}
                type="number"
                min={setting.min}
                max={setting.max}
                value={values[setting.key] ?? ""}
                onChange={(e) =>
                  setValues({
                    ...values,
                    [setting.key]: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right text-sm tabular-nums dark:border-slate-600 dark:bg-slate-900"
              />
            )}
          </div>
        ))}
      </div>
      {message && <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </Panel>
  );
}

export default SettingsPanel;
