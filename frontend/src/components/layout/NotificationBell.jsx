import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "../../context/NotificationContext";
import NotificationToast from "./NotificationToast";

// Two bells are mounted (compact top bar below lg, full header from lg up) and
// one is hidden with CSS. Only the visible one renders pop-ups, so a hidden
// copy's timer cannot close a pop-up the user is hovering.
const DESKTOP_QUERY = "(min-width: 1024px)";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function NotificationBell({ compact = false }) {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
    formatRelativeTime,
    toasts,
    dismissToast,
  } = useNotifications();

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      refresh();
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, refresh]);

  const buttonClass = compact
    ? "relative rounded-lg p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
    : "relative rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800";

  const badgeClass = compact
    ? "absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
    : "absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white";

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const isVisibleBell = compact ? !isDesktop : isDesktop;
  const showToasts = isVisibleBell && !open && toasts.length > 0;

  async function handleNotificationClick(notification) {
    if (!notification.read) {
      await markRead(notification.id);
    }
    setOpen(false);
    dismissToast(notification.id);
    if (notification.link_path) {
      navigate(notification.link_path);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className={`${buttonClass} ${
          showToasts ? "ring-2 ring-violet-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" : ""
        }`}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className={badgeClass} aria-hidden="true">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {showToasts ? (
        <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
          {toasts.map((notification) => (
            <NotificationToast
              key={notification.id}
              notification={notification}
              timeLabel={formatRelativeTime(notification.created_at)}
              onOpen={() => handleNotificationClick(notification)}
              onClose={() => dismissToast(notification.id)}
            />
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          className={`absolute z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 ${
            compact ? "right-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </p>
              {unreadCount > 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadCount} unread
                </p>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                Loading notifications...
              </p>
            ) : null}

            {!loading && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
                No notifications yet.
              </p>
            ) : null}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70 ${
                  notification.read ? "opacity-75" : "bg-violet-50/40 dark:bg-violet-950/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!notification.read ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-600" />
                  ) : (
                    <span className="mt-1.5 h-2 w-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
