import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Box,
  Globe2,
  Layers,
  Lock,
  Network,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const METRIC_DEFS = [
  {
    key: "change_requests",
    label: "Change Requests",
    icon: Layers,
    border: "border-blue-200",
    format: (value) => value.toLocaleString(),
  },
  {
    key: "approval_rate",
    label: "Committee Approval Rate",
    icon: ShieldCheck,
    border: "border-emerald-200",
    format: (value) => `${value}%`,
  },
  {
    key: "evidence_items",
    label: "Evidence Items",
    icon: Globe2,
    border: "border-violet-200",
    format: (value) => value.toLocaleString(),
  },
  {
    key: "ai_assessments",
    label: "AI Assessments",
    icon: Sparkles,
    border: "border-indigo-200",
    format: (value) => value.toLocaleString(),
  },
  {
    key: "high_risk_alerts",
    label: "High-Risk Alerts",
    icon: TrendingDown,
    border: "border-amber-200",
    format: (value) => value.toLocaleString(),
  },
];

const PILLARS = [
  {
    title: "AI-Powered",
    text: "Intelligent risk recommendations",
    icon: Sparkles,
  },
  {
    title: "Regulatory Compliant",
    text: "AML and KYC workflows",
    icon: Shield,
  },
  {
    title: "End-to-End Workflow",
    text: "Request to committee decision",
    icon: Layers,
  },
  {
    title: "Data Driven",
    text: "Real-time risk visibility",
    icon: TrendingUp,
  },
];

const INPUTS = [
  { label: "Customers", icon: Users },
  { label: "Products", icon: Box },
  { label: "Geography", icon: Globe2 },
  { label: "Channels", icon: Network },
  { label: "Vendors", icon: Network },
  { label: "Transactions", icon: Layers },
];

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
    <div className="flex min-h-screen flex-col bg-[#f4f7fb] text-slate-900">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Shield size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">MiniRiskers</p>
              <p className="truncate text-[11px] text-slate-500">
                Financial Crime Risk Management Workbench
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:px-4"
              >
                Open workbench
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:px-3"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:px-4"
                >
                  Create account
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                AI-Powered
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Compliance Focused
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
              Smarter Financial Crime Risk Assessment
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              MiniRiskers is an AI-assisted workbench that helps financial
              institutions assess, monitor, and mitigate financial crime risk
              across products, customers, channels, and third parties.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={isAuthenticated ? "/dashboard" : "/signup"}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {isAuthenticated ? "Go to dashboard" : "Get started"}
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-5 shadow-lg sm:p-6 lg:max-w-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md sm:h-20 sm:w-20">
                <Lock size={30} className="sm:hidden" />
                <Lock size={34} className="hidden sm:block" />
              </div>
              <p className="mt-4 text-center text-xs font-medium text-slate-600">
                Connected risk inputs across the change lifecycle
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INPUTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-3 text-center shadow-sm"
                    >
                      <Icon size={16} className="mx-auto text-blue-600" />
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-700">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 shrink-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                Key Impact Metrics
              </h2>
              <p className="text-xs text-slate-500 sm:text-sm">
                {metricsError
                  ? "Live operational indicators are temporarily unavailable."
                  : "Live operational indicators for assessment workflows"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
            {METRIC_DEFS.map((metricDef) => {
              const Icon = metricDef.icon;
              const metric = metrics?.[metricDef.key];
              const hasValue = metric && metric.value !== null && metric.value !== undefined;
              const changePct = metric?.change_pct ?? 0;
              const isUp = changePct >= 0;
              const TrendIcon = isUp ? TrendingUp : TrendingDown;

              return (
                <div
                  key={metricDef.key}
                  className={`rounded-xl border bg-white p-3 shadow-sm sm:p-4 ${metricDef.border}`}
                >
                  <div className="flex items-center justify-between">
                    <Icon size={16} className="text-slate-500" />
                    {hasValue && (
                      <TrendIcon
                        size={14}
                        className={isUp ? "text-emerald-600" : "text-red-500"}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                    {hasValue ? metricDef.format(metric.value) : "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug text-slate-700 sm:text-xs">
                    {metricDef.label}
                  </p>
                  <p
                    className={`mt-1 text-[10px] sm:text-xs ${
                      hasValue
                        ? isUp
                          ? "text-emerald-700"
                          : "text-red-600"
                        : "text-slate-400"
                    }`}
                  >
                    {hasValue
                      ? `${changePct > 0 ? "+" : ""}${changePct}% vs last 30 days`
                      : "No data yet"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <div className="rounded-md bg-blue-50 p-1.5 text-blue-700">
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">
                    {item.title}
                  </p>
                  <p className="truncate text-[10px] text-slate-500">
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default Landing;
