import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "../services/api";
import { formatDateTime, parseApiDate } from "../utils/riskDisplay";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 30_000;

// Pop-ups shown next to the bell for newly arrived notifications.
export const TOAST_DURATION_MS = 10_000;
const MAX_TOASTS = 3;

function poppedStorageKey(user) {
  return `notifications:popped:${user?.id ?? user?.username ?? "anon"}`;
}

// IDs already popped up in this browser session, so a reload or the next poll
// does not show the same notification again.
function loadPopped(user) {
  try {
    const raw = sessionStorage.getItem(poppedStorageKey(user));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function savePopped(user, ids) {
  try {
    sessionStorage.setItem(
      poppedStorageKey(user),
      JSON.stringify([...ids].slice(-200))
    );
  } catch {
    // Storage unavailable: pop-ups may repeat after a reload.
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const date = parseApiDate(isoString);
  if (!date) return "";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(isoString);
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const pollRef = useRef(null);
  const poppedRef = useRef(null);

  useEffect(() => {
    poppedRef.current = user ? loadPopped(user) : null;
    setToasts([]);
  }, [user]);

  const queueToasts = useCallback(
    (items) => {
      if (!user || !poppedRef.current) {
        return;
      }
      const fresh = items.filter(
        (item) => !item.read && !poppedRef.current.has(item.id)
      );
      if (fresh.length === 0) {
        return;
      }
      fresh.forEach((item) => poppedRef.current.add(item.id));
      savePopped(user, poppedRef.current);
      setToasts((current) =>
        [...fresh, ...current.filter((toast) => !fresh.some((item) => item.id === toast.id))]
          .slice(0, MAX_TOASTS)
      );
    },
    [user]
  );

  const dismissToast = useCallback((notificationId) => {
    setToasts((current) =>
      current.filter((toast) => toast.id !== notificationId)
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get("/notifications", { params: { limit: 30 } });
      const items = response.data.notifications || [];
      setNotifications(items);
      setUnreadCount(response.data.unread_count || 0);
      queueToasts(items);
    } catch {
      // Keep existing state on transient errors.
    } finally {
      setLoading(false);
    }
  }, [user, queueToasts]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }

    // Poll the list (not just the count) so new notifications can pop up.
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user, refresh]);

  const markRead = useCallback(async (notificationId) => {
    await api.patch(`/notifications/${notificationId}/read`);
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? { ...item, read: true, read_at: new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((count) => Math.max(count - 1, 0));
    dismissToast(notificationId);
  }, [dismissToast]);

  const markAllRead = useCallback(async () => {
    await api.post("/notifications/read-all");
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
        read_at: item.read_at || new Date().toISOString(),
      }))
    );
    setUnreadCount(0);
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      formatRelativeTime,
      toasts,
      dismissToast,
    }),
    [
      notifications,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      toasts,
      dismissToast,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
