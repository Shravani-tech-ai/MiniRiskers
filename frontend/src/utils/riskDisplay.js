export const RATING_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function getRatingBadgeClass(rating) {
  switch (rating) {
    case "CRITICAL":
      return "bg-red-100 text-red-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800";
    case "LOW":
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export const DECISION_LABELS = {
  APPROVE: "Approved",
  APPROVE_WITH_CONDITIONS: "Approved with conditions",
  DEFER: "Deferred",
  REJECT: "Rejected",
};

export function getDecisionBadgeClass(decision) {
  switch (decision) {
    case "APPROVE":
      return "bg-emerald-100 text-emerald-800";
    case "APPROVE_WITH_CONDITIONS":
      return "bg-teal-100 text-teal-800";
    case "DEFER":
      return "bg-orange-100 text-orange-800";
    case "REJECT":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

// Backend timestamps are naive UTC.
export function parseApiDate(value) {
  if (!value) return null;
  const text = String(value);
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShortDate(value) {
  const date = parseApiDate(value);
  return date
    ? date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
}

export function formatDateTime(value, locale) {
  const date = parseApiDate(value);
  if (!date) return "";

  const options = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  return locale
    ? date.toLocaleString(locale, options)
    : date.toLocaleString(undefined, options);
}
