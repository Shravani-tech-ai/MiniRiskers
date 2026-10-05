import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import AuthShell from "../components/marketing/AuthShell";
import { authInputClassName } from "../components/marketing/authFormStyles";
import { useAuth } from "../context/AuthContext";
import { ROLES, roleLabel } from "../utils/rolePermissions";

const SIGNUP_ROLES = [
  ROLES.BUSINESS_OWNER,
  ROLES.RISK_ANALYST,
  ROLES.RISK_COMMITTEE,
  ROLES.AUDITOR,
  ROLES.ADMIN,
];

function Signup() {
  const navigate = useNavigate();
  const { register, isAuthenticated, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: ROLES.BUSINESS_OWNER,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await register({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      navigate(`/login?role=${form.role}`, {
        replace: true,
        state: {
          username: form.username.trim(),
          notice: "Account created successfully. Please sign in.",
        },
      });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      wide
      mode="signup"
      selectedRole={form.role}
      onRoleSelect={(role) => setForm((previous) => ({ ...previous, role }))}
      title="Create your account"
      subtitle="Pick your role to access the right workflow."
      footer={
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-blue-700 dark:text-blue-300 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Full name
            </label>
            <div className="relative">
              <UserRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                required
                className={`${authInputClassName} pl-10 pr-3`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Username
            </label>
            <div className="relative">
              <UserRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
                placeholder="letters, numbers, underscore"
                className={`${authInputClassName} pl-10 pr-3`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className={`${authInputClassName} pl-10 pr-3`}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Role
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className={`${authInputClassName} px-3`}
            >
              {SIGNUP_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                className={`${authInputClassName} pl-10 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm password
            </label>
            <input
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className={`${authInputClassName} px-3`}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-1.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default Signup;
