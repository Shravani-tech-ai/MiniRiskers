import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";

import { TOAST_DURATION_MS } from "../../context/NotificationContext";

// One pop-up for a newly arrived notification. Closes itself after
// TOAST_DURATION_MS (paused while hovered) or via the close button.
function NotificationToast({ notification, onOpen, onClose, timeLabel }) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(TOAST_DURATION_MS);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (paused) {
      return undefined;
    }
    startedAtRef.current = Date.now();
    const timer = setTimeout(onClose, remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAtRef.current;
    };
  }, [paused, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="notification-toast pointer-events-auto relative overflow-hidden rounded-xl border border-violet-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-violet-800 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-950/60">
          <Bell size={16} className="text-violet-700 dark:text-violet-300" />
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {notification.title}
          </p>
          {notification.body ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {notification.body}
            </p>
          ) : null}
          {timeLabel ? (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              {timeLabel}
            </p>
          ) : null}
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X size={16} />
      </button>

      {/* Time remaining before the pop-up closes on its own. */}
      <div
        className="notification-toast-progress absolute bottom-0 left-0 h-1 bg-violet-500 dark:bg-violet-400"
        style={{
          animationDuration: `${TOAST_DURATION_MS}ms`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
}

export default NotificationToast;
