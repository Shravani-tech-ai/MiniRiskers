import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Globe2,
  Layers,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import ThemeToggle from "../components/ThemeToggle";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const METRIC_DEFS = [
  {
    key: "change_requests",
    label: "Change Requests",
    icon: Layers,
    accent:
      "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900",
    format: (value) => value.toLocaleString(),
  },
  {
    key: "approval_rate",
    label: "Committee Approval Rate",
    icon: ShieldCheck,
    accent:
      "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900",
    format: (value) => `${value}%`,
  },
  {
    key: "evidence_items",
    label: "Evidence Items",
    icon: Globe2,
    accent:
      "text-violet-600 bg-violet-50 border-violet-100 dark:text-violet-300 dark:bg-violet-950/40 dark:border-violet-900",
    format: (value) => value.toLocaleString(),
  },
  {
    key: "ai_assessments",
    label: "AI Assessments",
    icon: Sparkles,
    accent:
      "text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900",
    format: (value) => value.toLocaleString(),
  },
  {
    key: "high_risk_alerts",
    label: "High-Risk Alerts",
    icon: TrendingDown,
    accent:
      "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900",
    format: (value) => value.toLocaleString(),
  },
];

function MetricsPanel({ metrics, metricsError }) {
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:p-6">
      <div className="shrink-0">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
          Key Impact Metrics
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {metricsError
            ? "Live operational indicators are temporarily unavailable."
            : "Live operational indicators from active assessment workflows."}
        </p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center gap-3">
        {METRIC_DEFS.map((metricDef) => {
          const Icon = metricDef.icon;
          const metric = metrics?.[metricDef.key];
          const hasValue =
            metric && metric.value !== null && metric.value !== undefined;
          const changePct = metric?.change_pct ?? 0;
          const isUp = changePct >= 0;
          const TrendIcon = isUp ? TrendingUp : TrendingDown;

          return (
            <div
              key={metricDef.key}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className={`shrink-0 rounded-lg border p-2.5 ${metricDef.accent}`}>
                <Icon size={18} />
              </div>
              <div className="flex min-w-[5rem] shrink-0 items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums leading-none text-slate-900 dark:text-slate-100 lg:text-4xl">
                  {hasValue ? metricDef.format(metric.value) : "—"}
                </p>
                {hasValue ? (
                  <TrendIcon
                    size={18}
                    className={isUp ? "text-emerald-600" : "text-red-500"}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 lg:text-base">
                  {metricDef.label}
                </p>
                <p
                  className={`mt-0.5 text-xs lg:text-sm ${
                    hasValue
                      ? isUp
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {hasValue
                    ? `${changePct > 0 ? "+" : ""}${changePct}% vs last 30 days`
                    : "No data yet"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Landing() {
  const { isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/dashboard/landing-metrics")
      .then((response) => {
        if (!cancelled) {
          setMetrics(response.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load landing metrics:", error);
        if (!cancelled) {
          setMetricsError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Shield size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">MiniRiskers</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Financial Crime Risk Management Workbench
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open workbench
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create account
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden px-4 pt-[4.75rem] sm:px-6 lg:px-8">
        <section className="grid min-h-0 flex-1 gap-8 py-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-8">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                AI-Powered
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                Compliance Focused
              </span>
            </div>

            <h1 className="mt-4 max-w-xl text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
              Smarter Financial Crime Risk Assessment
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-400">
              An AI-assisted workbench to assess, monitor, and mitigate
              financial crime risk across products, customers, channels, and
              third parties.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? "/dashboard" : "/signup"}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {isAuthenticated ? "Go to dashboard" : "Get started"}
                <ArrowRight size={16} />
              </Link>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center lg:max-h-full">
            <MetricsPanel metrics={metrics} metricsError={metricsError} />
          </div>
        </section>
      </main>
    </div>
  );
}

export default Landing;
