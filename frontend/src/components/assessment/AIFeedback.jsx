import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/rolePermissions";

const RATERS = [ROLES.RISK_ANALYST, ROLES.RISK_COMMITTEE, ROLES.ADMIN];

// "Was this AI draft helpful?" Feeds the Admin's model performance view.
function AIFeedback({ changeRequestId, draftKey }) {
  const { user } = useAuth();
  const [mine, setMine] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [choosing, setChoosing] = useState(false);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canRate = RATERS.includes(user?.role);

  useEffect(() => {
    if (!canRate) return;
    api
      .get(`/change-requests/${changeRequestId}/ai-feedback`)
      .then((r) => setMine(r.data.mine))
      .catch(() => setMine(null));
    api
      .get("/feedback/options")
      .then((r) => setReasons(r.data.ai_reasons))
      .catch(() => setReasons([]));
  }, [changeRequestId, draftKey, canRate]);

  if (!canRate) return null;

  const send = async (helpful) => {
    if (!helpful && !reason) {
      setChoosing(true);
      return;
    }
    try {
      setSaving(true);
      setError("");
      const response = await api.post(`/change-requests/${changeRequestId}/ai-feedback`, {
        helpful,
        reason: helpful ? null : reason,
        comment,
      });
      setMine(response.data);
      setChoosing(false);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save feedback.");
    } finally {
      setSaving(false);
    }
  };

  const buttonClass = (active) =>
    `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
      active
        ? "border-indigo-400 bg-indigo-100 text-indigo-800 dark:border-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-200"
        : "border-indigo-200 bg-white text-slate-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-slate-300"
    }`;

  return (
    <div className="mt-4 rounded-lg border border-indigo-100 bg-white/70 p-3 dark:border-indigo-900/60 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <span>Was this AI draft helpful?</span>
        <button type="button" disabled={saving} onClick={() => send(true)} className={buttonClass(mine?.helpful === true)}>
          <ThumbsUp size={14} /> Yes
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => setChoosing(true)}
          className={buttonClass(mine?.helpful === false)}
        >
          <ThumbsDown size={14} /> No
        </button>
        {mine && !choosing && (
          <span className="text-xs text-slate-500 dark:text-slate-400">Thanks, your feedback is recorded.</span>
        )}
      </div>
      {choosing && (
        <div className="mt-3 space-y-2">
          <select
            aria-label="Why was the draft not helpful"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 sm:w-80"
          >
            <option value="">What was wrong?</option>
            {reasons.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional detail…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving || !reason}
              onClick={() => send(false)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Send feedback
            </button>
            <button type="button" onClick={() => setChoosing(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default AIFeedback;
