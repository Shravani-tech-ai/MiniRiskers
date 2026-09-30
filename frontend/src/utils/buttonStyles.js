/** Shared button styles with accessible contrast in light and dark mode. */

export const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";

export const btnPrimary =
  `${btnBase} bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-600 dark:disabled:text-slate-300`;

export const btnPrimarySm = `${btnPrimary} px-4 py-2`;

export const btnPrimaryMd = `${btnPrimary} px-5 py-2.5`;

export const btnDark =
  `${btnBase} bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:disabled:bg-slate-600 dark:disabled:text-slate-300`;

export const btnDarkSm = `${btnDark} px-4 py-2`;

export const btnDarkMd = `${btnDark} px-5 py-2.5`;

export const btnEmerald =
  `${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-600 dark:disabled:text-slate-300`;

export const btnEmeraldMd = `${btnEmerald} px-5 py-2.5`;

export const btnPurple =
  `${btnBase} bg-purple-600 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-slate-600 dark:disabled:text-slate-300`;

export const btnPurpleMd = `${btnPurple} px-5 py-2.5`;

export const btnSecondary =
  `${btnBase} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-500`;

export const btnSecondarySm = `${btnSecondary} px-4 py-2.5`;

/** Segmented control / tab pill when selected */
export const tabSelected =
  "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white";

export const tabUnselected =
  "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800";

/** Filter / section pills (Dashboard, Assessments) */
export const pillSelected =
  "bg-slate-900 text-white shadow-sm dark:bg-indigo-600 dark:text-white";

export const pillUnselected =
  "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800";

export const pillBadgeSelected =
  "rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums text-white";
