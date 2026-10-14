// Shared building blocks for the Admin console.

// Single-series bar colour, matching the Analytics page palette.
export const BAR_COLOR = "#2a78d6";

export function errorText(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail?.validation_errors) return detail.validation_errors.join(" ");
  return fallback;
}

export function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm sm:p-6 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, onClick, tone = "default" }) {
  const toneClass =
    tone === "attention"
      ? "border-amber-300 dark:border-amber-800"
      : "border-slate-200 dark:border-slate-700";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border ${toneClass} bg-white dark:bg-slate-900 p-4 text-left shadow-sm ${
        onClick ? "hover:border-indigo-400 dark:hover:border-indigo-500" : ""
      }`}
    >
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value ?? "—"}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Tag>
  );
}

// Horizontal bars with the value at the tip; hover shows label and value.
export function Bars({ data, max, format = (v) => v, unit = "" }) {
  const scaleMax = max ?? Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
        Not enough data yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const pct = scaleMax ? (d.value / scaleMax) * 100 : 0;
        return (
          <div
            key={d.label}
            title={`${d.label}: ${format(d.value)}${unit}`}
            className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3"
          >
            <span className="truncate text-sm text-slate-600 dark:text-slate-400">{d.label}</span>
            <div className="relative flex h-6 items-center pr-14">
              <span className="absolute inset-y-0 left-0 w-px bg-slate-300 dark:bg-slate-600" />
              <div
                className="h-5 rounded-r"
                style={{
                  width: `${Math.max(pct, d.value > 0 ? 1 : 0)}%`,
                  backgroundColor: BAR_COLOR,
                }}
              />
              <span className="ml-2 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                {format(d.value)}
                {unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const buttonPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60";
export const buttonSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800";
export const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm";
export const labelClass = "text-sm font-medium text-slate-700 dark:text-slate-300";
