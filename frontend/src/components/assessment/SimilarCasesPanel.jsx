import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GitCompare, Loader2, RefreshCw } from "lucide-react";

import api from "../../services/api";
import {
  DECISION_LABELS,
  getDecisionBadgeClass,
  getRatingBadgeClass,
} from "../../utils/riskDisplay";

function SimilarCaseCard({ item }) {
  return (
    <Link
      to={`/assessment/${item.change_request_id}`}
      className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 transition hover:border-blue-300 hover:bg-blue-50/60 dark:hover:border-blue-800 dark:hover:bg-blue-950/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {item.request_number}
          </p>
          <p className="mt-1 truncate font-medium text-slate-900 dark:text-slate-100">
            {item.title}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {[item.product_type, item.business_unit].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
          {item.similarity}% match
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {item.system_rating && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${getRatingBadgeClass(item.system_rating)}`}>
            System {item.system_rating}
          </span>
        )}
        {item.analyst_rating && item.analyst_rating !== item.system_rating && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${getRatingBadgeClass(item.analyst_rating)}`}>
            Analyst {item.analyst_rating}
          </span>
        )}
        {item.committee_decision && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${getDecisionBadgeClass(item.committee_decision)}`}>
            {DECISION_LABELS[item.committee_decision] || item.committee_decision}
          </span>
        )}
      </div>
    </Link>
  );
}

function SimilarCasesPanel({ changeRequestId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!changeRequestId) {
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    // The backend saves matches on the first visit; refresh recalculates them.
    api
      .get(`/change-requests/${changeRequestId}/similar-cases`, {
        params: { limit: 3, refresh: refreshKey > 0 },
      })
      .then((response) => {
        if (!cancelled) {
          setData(response.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load similar cases.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [changeRequestId, refreshKey]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/40 p-2">
            <GitCompare size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Similar past cases
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Learning from prior assessments to improve consistency across analysts
            </p>
          </div>
        </div>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            title="Recalculate similar cases"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Finding similar assessments…
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && !error && data?.message && !data.cases?.length && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.message}</p>
        )}

        {!loading && !error && data?.cases?.length > 0 && (
          <div className="space-y-3">
            {data.cases.map((item) => (
              <SimilarCaseCard key={item.change_request_id} item={item} />
            ))}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Matched using {data.similarity_method === "embedding" ? "semantic embeddings" : "intake text overlap"}.
              Compare ratings before overriding the system score.
              {data.calculated_at && (
                <>
                  {" "}Calculated{" "}
                  {new Date(data.calculated_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  .
                </>
              )}
            </p>
          </div>
        )}

        {!loading && !error && data && !data.message && data.cases?.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No comparable assessments in your portfolio yet. Similar cases appear once other
            requests have been risk-scored.
          </p>
        )}
      </div>
    </div>
  );
}

export default SimilarCasesPanel;
