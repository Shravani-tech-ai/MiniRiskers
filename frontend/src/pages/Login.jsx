import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, UserRound } from "lucide-react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import AuthShell from "../components/marketing/AuthShell";
import RolePicker from "../components/marketing/RolePicker";
import { authInputClassName } from "../components/marketing/authFormStyles";
import { useAuth } from "../context/AuthContext";
import { ROLES, roleLabel } from "../utils/rolePermissions";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [username, setUsername] = useState(location.state?.username || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  const redirectPath = location.state?.from || "/dashboard";
  const requestedRole = searchParams.get("role");
  const role = Object.values(ROLES).includes(requestedRole) ? requestedRole : null;

  const selectRole = (nextRole) => {
    setError("");
    setSearchParams(nextRole ? { role: nextRole } : {}, {
      state: location.state,
    });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);
      await login(username.trim(), password, role);
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err?.code === "ROLE_MISMATCH") {
        setError(
          `This account is not registered as ${roleLabel(role)}. ` +
            "Change role and try again."
        );
        return;
      }
      setError(
        err?.response?.data?.detail ||
          "Login failed. Check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return <RolePicker onRoleSelect={selectRole} notice={notice} />;
  }

  return (
    <AuthShell
      title={`Sign in as ${roleLabel(role)}`}
      subtitle="Secure access to the FCRM risk assessment workbench."
      mode="login"
      selectedRole={role}
      onRoleSelect={selectRole}
      footer={
        <p className="text-sm text-slate-600 dark:text-slate-400">
          New here?{" "}
          <Link
            to="/signup"
            className="font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <button
          type="button"
          onClick={() => selectRole(null)}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft size={14} />
          Change role
        </button>

        {notice ? (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">
            {notice}
          </p>
        ) : null}

        <div>
          <label
            htmlFor="username"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Username
          </label>
          <div className="relative">
            <UserRound
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              className={`${authInputClassName} pl-10 pr-3`}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
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

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
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
              Signing in...
            </>
          ) : (
            `Sign in as ${roleLabel(role)}`
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
