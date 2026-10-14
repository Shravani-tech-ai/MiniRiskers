import { useEffect, useState } from "react";
import { Star } from "lucide-react";

import api from "../../services/api";
import { formatShortDate } from "../../utils/riskDisplay";
import SettingsPanel from "./SettingsPanel";
import { Bars, Panel, Stat } from "./ui";

function StarsText({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}
        />
      ))}
    </span>
  );
}

function FeedbackList({ items, empty }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{empty}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {item.request_number || `CR-${item.change_request_id}`} · {item.title}
            </span>
            <StarsText rating={item.rating} />
          </div>
          {item.comment && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">“{item.comment}”</p>}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {item.tags.join(" · ")}
            {item.tags.length ? " · " : ""}
            {formatShortDate(item.created_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function FeedbackPanel() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get("/admin/feedback-summary")
      .then((r) => setSummary(r.data))
      .catch(() => setError("Unable to load feedback."));

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!summary) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading feedback…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Average rating" value={summary.average_rating != null ? `${summary.average_rating} / 5` : "—"} />
        <Stat label="Responses" value={summary.responses} />
        <Stat
          label="Response rate"
          value={summary.response_rate != null ? `${summary.response_rate}%` : "—"}
          hint={`of ${summary.closed_requests} closed requests`}
        />
        <Stat label="Feedback window" value={`${summary.window_days} days`} hint="After a request closes" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Rating distribution" subtitle="Business Owner ratings, 1 to 5 stars">
          <Bars
            data={[5, 4, 3, 2, 1].map((star) => ({
              label: `${star} star${star > 1 ? "s" : ""}`,
              value: summary.distribution[String(star)],
            }))}
          />
        </Panel>
        <Panel title="What owners mention" subtitle="Quick tags chosen with ratings">
          <Bars data={summary.tags.map((row) => ({ label: row.tag, value: row.count }))} />
        </Panel>
        <Panel title="Average rating by month">
          <Bars
            data={summary.by_month.map((row) => ({
              label: `${row.month} (${row.responses})`,
              value: row.average,
            }))}
            max={5}
          />
        </Panel>
        <Panel title="Low ratings (1–2 stars)" subtitle="Follow up on these first">
          <FeedbackList items={summary.low_ratings} empty="No low ratings." />
        </Panel>
      </div>

      <Panel title="Recent comments">
        <FeedbackList items={summary.recent_comments} empty="No comments yet." />
      </Panel>

      <SettingsPanel
        keys={["feedback_window_days"]}
        title="Feedback settings"
        onSaved={load}
      />
    </div>
  );
}

export default FeedbackPanel;
