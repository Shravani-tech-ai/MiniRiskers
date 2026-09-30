import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";

import PageContainer from "../components/layout/PageContainer";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { roleLabel } from "../utils/rolePermissions";

const INPUT_CLASS =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:ring-indigo-900/40";

const NOTIFICATION_LABELS = {
  workflow: {
    title: "Workflow updates",
    description: "Request created, submitted, analyst review, and deferrals.",
  },
  committee: {
    title: "Committee decisions",
    description: "Approvals, rejections, deferrals, and reassessments.",
  },
  conditions: {
    title: "Approval conditions",
    description: "New conditions, evidence submitted, verified, or overdue.",
  },
  sla: {
    title: "SLA reminders",
    description: "Stage deadlines and intake-to-decision SLA warnings.",
  },
  methodology: {
    title: "Methodology changes",
    description: "Pending methodology versions awaiting review.",
  },
};

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function SettingsCard({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Settings() {
  const { user, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [notificationPrefs, setNotificationPrefs] = useState(null);
  const [notificationLoading, setNotificationLoading] = useState(true);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        setNotificationLoading(true);
        setNotificationError("");
        const response = await api.get("/auth/preferences");
        if (!cancelled) {
          setNotificationPrefs(response.data.notifications || {});
        }
      } catch (err) {
        if (!cancelled) {
          setNotificationError(
            err?.response?.data?.detail || "Unable to load notification preferences."
          );
        }
      } finally {
        if (!cancelled) {
          setNotificationLoading(false);
        }
      }
    }

    loadPreferences();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

    if (!profileForm.full_name.trim() || !profileForm.email.trim()) {
      setProfileError("Full name and email are required.");
      return;
    }

    try {
      setProfileLoading(true);
      await api.patch("/auth/me", {
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
      });
      await refreshUser();
      setProfileMessage("Profile updated successfully.");
    } catch (err) {
      setProfileError(
        err?.response?.data?.detail || "Unable to update profile."
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (
      !passwordForm.current_password ||
      !passwordForm.new_password ||
      !passwordForm.confirm_password
    ) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      await api.post("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      setPasswordMessage("Password changed successfully.");
    } catch (err) {
      setPasswordError(
        err?.response?.data?.detail || "Unable to change password."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationToggle = async (key) => {
    if (!notificationPrefs) {
      return;
    }

    const nextValue = !notificationPrefs[key];
    const previous = notificationPrefs;
    setNotificationPrefs((current) => ({
      ...current,
      [key]: nextValue,
    }));
    setNotificationError("");
    setNotificationMessage("");

    try {
      setNotificationSaving(true);
      await api.patch("/auth/preferences", { [key]: nextValue });
      setNotificationMessage("Notification preferences saved.");
    } catch (err) {
      setNotificationPrefs(previous);
      setNotificationError(
        err?.response?.data?.detail || "Unable to save notification preferences."
      );
    } finally {
      setNotificationSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Manage your account, appearance, and notification preferences.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCard
          title="Account"
          description="Your profile details used across the workbench."
          icon={UserRound}
        >
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Username
              </label>
              <input
                type="text"
                value={user?.username || ""}
                disabled
                className={`${INPUT_CLASS} cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400`}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Role
              </label>
              <input
                type="text"
                value={roleLabel(user?.role)}
                disabled
                className={`${INPUT_CLASS} cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400`}
              />
            </div>

            <div>
              <label
                htmlFor="full_name"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                value={profileForm.full_name}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
              />
            </div>

            {profileError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {profileError}
              </p>
            ) : null}
            {profileMessage ? (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 size={16} />
                {profileMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={profileLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {profileLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Save profile
            </button>
          </form>
        </SettingsCard>

        <SettingsCard
          title="Password"
          description="Update your sign-in password."
          icon={Lock}
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="current_password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Current password
              </label>
              <div className="relative">
                <input
                  id="current_password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current_password}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      current_password: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="new_password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      new_password: event.target.value,
                    }))
                  }
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Confirm new password
              </label>
              <input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirm_password: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
              />
            </div>

            {passwordError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {passwordError}
              </p>
            ) : null}
            {passwordMessage ? (
              <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 size={16} />
                {passwordMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={passwordLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Change password
            </button>
          </form>
        </SettingsCard>

        <SettingsCard
          title="Appearance"
          description="Choose how MiniRiskers looks on your device."
          icon={Sun}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  <Icon size={18} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </SettingsCard>

        <SettingsCard
          title="Notifications"
          description="Choose which in-app notification categories you receive."
          icon={Bell}
        >
          {notificationLoading ? (
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading preferences...
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(NOTIFICATION_LABELS).map(([key, meta]) => {
                const enabled = notificationPrefs?.[key] ?? true;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {meta.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {meta.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      disabled={notificationSaving}
                      onClick={() => handleNotificationToggle(key)}
                      className={[
                        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
                        enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-600",
                        notificationSaving ? "cursor-not-allowed opacity-60" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-block h-5 w-5 transform rounded-full bg-white transition",
                          enabled ? "translate-x-6" : "translate-x-1",
                        ].join(" ")}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {notificationError ? (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {notificationError}
            </p>
          ) : null}
          {notificationMessage ? (
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 size={16} />
              {notificationMessage}
            </p>
          ) : null}
        </SettingsCard>
      </div>
    </PageContainer>
  );
}

export default Settings;
