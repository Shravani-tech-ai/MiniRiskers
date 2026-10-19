import { useEffect, useState } from "react";
import { MessageSquareHeart, Star, X } from "lucide-react";

import api from "../../services/api";
import { formatShortDate } from "../../utils/riskDisplay";

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const labels = ["Very poor", "Poor", "Okay", "Good", "Excellent"];
  return (
    <div>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="rounded p-0.5"
          >
            <Star
              size={30}
              className={n <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}
            />
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm text-slate-500 dark:text-slate-400">{shown ? labels[shown - 1] : ""}</p>
    </div>
  );
}

// The rating form itself, used in the dialog and inline on the request page.
export function FeedbackForm({ changeRequestId, onSubmitted, onCancel }) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState([]);
  const [options, setOptions] = useState([]);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/feedback/options")
      .then((r) => setOptions(r.data.tags))
      .catch(() => setOptions([]));
  }, []);

  const toggle = (tag) =>
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );

  const submit = async () => {
    if (!rating) {
      setError("Choose a star rating.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const response = await api.post(`/change-requests/${changeRequestId}/feedback`, {
        rating,
        tags,
        comment,
      });
      onSubmitted?.(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not send your feedback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <StarInput value={rating} onChange={setRating} />
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={tags.includes(tag)}
            onClick={() => toggle(tag)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              tags.includes(tag)
                ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300"
                : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Anything we should improve? (optional)"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Sending…" : "Send feedback"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            Later
          </button>
        )}
      </div>
    </div>
  );
}

function FeedbackDialog({ request, onClose, onSubmitted }) {
  useEffect(() => {
    const handleKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="feedback-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              How did the review of {request.request_number || `CR-${request.id}`} go?
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{request.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <FeedbackForm changeRequestId={request.id} onSubmitted={onSubmitted} onCancel={onClose} />
      </div>
    </div>
  );
}

// Dashboard banner listing the owner's closed requests still waiting for a rating.
export function PendingFeedbackBanner() {
  const [pending, setPending] = useState([]);
  const [rating, setRating] = useState(null);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    api
      .get("/feedback/pending")
      .then((r) => setPending(r.data.requests))
      .catch(() => setPending([]));
  }, []);

  if (pending.length === 0 && !thanks) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
      {pending.length > 0 ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
            <MessageSquareHeart size={18} />
            Rate your experience ({pending.length} request{pending.length > 1 ? "s" : ""} closed)
          </p>
          <ul className="mt-2 space-y-1.5">
            {pending.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900 dark:text-amber-200">
                <span>
                  {item.request_number || `CR-${item.id}`} · {item.title}
                  <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">open until {formatShortDate(item.closes_at)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRating(item)}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
                >
                  Rate
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Thanks for your feedback.</p>
      )}
      {rating && (
        <FeedbackDialog
          request={rating}
          onClose={() => setRating(null)}
          onSubmitted={() => {
            setPending((list) => list.filter((item) => item.id !== rating.id));
            setRating(null);
            setThanks(true);
          }}
        />
      )}
    </div>
  );
}

// Card on the request page for its owner.
export function RequestFeedbackCard({ changeRequestId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api
      .get(`/change-requests/${changeRequestId}/feedback`)
      .then((r) => setStatus(r.data))
      .catch(() => setStatus(null));
  }, [changeRequestId]);

  if (!status || (!status.eligible && !status.submitted)) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/20">
      {status.submitted ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <MessageSquareHeart size={18} className="text-amber-600" />
          You rated this request
          <span className="inline-flex">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={15} className={n <= status.submitted.rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"} />
            ))}
          </span>
          — thank you.
        </p>
      ) : (
        <>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <MessageSquareHeart size={20} className="text-amber-600" />
            How did this request go?
          </h2>
          <p className="mb-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
            Your rating helps improve the system. Open until {formatShortDate(status.closes_at)}.
          </p>
          <FeedbackForm
            changeRequestId={changeRequestId}
            onSubmitted={(feedback) => setStatus({ ...status, eligible: false, submitted: feedback })}
          />
        </>
      )}
    </section>
  );
}
