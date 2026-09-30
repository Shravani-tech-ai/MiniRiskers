import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  Gavel,
  Search,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../context/AuthContext";
import { ROLES, isSubmitted } from "../utils/rolePermissions";
import {
  DECISION_LABELS,
  formatShortDate,
  getDecisionBadgeClass,
  getRatingBadgeClass,
} from "../utils/riskDisplay";

const SECTIONS = {
  ALL: { label: "All", match: () => true },
  AWAITING: {
    label: "Awaiting assessment",
    match: (item) => !item.risk_calculated,
  },
  RISK_CALCULATED: {
    label: "Risk calculated",
    match: (item) => item.risk_calculated && !item.analyst_review,
  },
  ANALYST_REVIEWED: {
    label: "Analyst reviewed",
    match: (item) => Boolean(item.analyst_review) && !item.committee_decision,
  },
  DECIDED: {
    label: "Committee decided",
    match: (item) => Boolean(item.committee_decision),
  },
};

const DEFAULT_SECTION = {
  [ROLES.RISK_ANALYST]: "RISK_CALCULATED",
  [ROLES.RISK_COMMITTEE]: "ANALYST_REVIEWED",
};

const SUBTITLES = {
  [ROLES.BUSINESS_OWNER]:
    "Follow each submitted request through risk assessment, analyst review, and the committee decision.",
  [ROLES.RISK_ANALYST]:
    "Your assessment pipeline — calculated risks awaiting your review, and what has moved on to the committee.",
  [ROLES.RISK_COMMITTEE]:
    "Analyst-reviewed requests awaiting a decision, and the decisions already recorded.",
};

function StepCard({ icon: Icon, title, done, children }) {
  return (
    <div
      className={[
        "min-w-0 rounded-lg border p-3.5",
        done ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" : "border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50/60 dark:bg-slate-800/30",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {done ? (
          <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <Circle size={14} />
        )}
        <Icon size={14} />
        {title}
      </div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}

function Pending({ text = "Pending" }) {
  return <p className="text-sm text-slate-400 dark:text-slate-500">{text}</p>;
}

function RiskStep({ item }) {
  if (item.risk) {
    const rating = item.risk.residual_rating;
    return (
      <StepCard icon={SearchCheck} title="Risk assessment" done>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {Number(item.risk.residual_score ?? 0).toFixed(1)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getRatingBadgeClass(
              rating
            )}`}
          >
            {rating}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Residual · inherent {Number(item.risk.inherent_score ?? 0).toFixed(1)} ·{" "}
          {formatShortDate(item.risk.calculated_at)}
        </p>
      </StepCard>
    );
  }

  if (item.risk_calculated) {
    return (
      <StepCard icon={SearchCheck} title="Risk assessment" done>
        <p className="text-sm text-slate-600 dark:text-slate-400">Calculated</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Shared after analyst review
        </p>
      </StepCard>
    );
  }

  return (
    <StepCard icon={SearchCheck} title="Risk assessment">
      <Pending text="Not run yet" />
    </StepCard>
  );
}

function AnalystStep({ review }) {
  if (!review) {
    return (
      <StepCard icon={ShieldCheck} title="Analyst review">
        <Pending />
      </StepCard>
    );
  }

  return (
    <StepCard icon={ShieldCheck} title="Analyst review" done>
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {review.accepted
          ? `Accepted · ${review.analyst_rating}`
          : `Adjusted ${review.system_rating} → ${review.analyst_rating}`}
      </p>
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
        {review.reviewed_by} · {formatShortDate(review.reviewed_at)}
      </p>
    </StepCard>
  );
}

function CommitteeStep({ decision }) {
  if (!decision) {
    return (
      <StepCard icon={Gavel} title="Committee">
        <Pending />
      </StepCard>
    );
  }

  return (
    <StepCard icon={Gavel} title="Committee" done>
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getDecisionBadgeClass(
          decision.decision
        )}`}
      >
        {DECISION_LABELS[decision.decision] || decision.decision}
      </span>
      <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
        {decision.decided_by} · {formatShortDate(decision.decided_at)}
      </p>
    </StepCard>
  );
}

function Assessments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState(DEFAULT_SECTION[user?.role] || "ALL");

  useEffect(() => {
    api
      .get("/assessments/overview")
      .then((response) => setItems(response.data.items || []))
      .catch(() => setError("Unable to load assessments."))
      .finally(() => setLoading(false));
  }, []);

  // Drafts have not entered the assessment workflow yet.
  const workflowItems = useMemo(
    () => items.filter((item) => isSubmitted(item)),
    [items]
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(SECTIONS).map(([key, value]) => [
          key,
          workflowItems.filter(value.match).length,
        ])
      ),
    [workflowItems]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return workflowItems.filter((item) => {
      if (!SECTIONS[section].match(item)) return false;
      if (!needle) return true;
      return [item.request_number, item.title, item.business_unit, item.requested_by]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [workflowItems, section, query]);

  return (
    <PageContainer className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">
          Assessment workflow
        </h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-400 lg:text-lg">
          {SUBTITLES[user?.role] ||
            "Every submitted request, grouped by where it sits in the assessment workflow."}
        </p>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by ID, title, unit, or requester…"
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-11 pr-4 text-base text-slate-900 dark:text-slate-100 shadow-sm outline-none ring-indigo-100 dark:ring-indigo-900/40 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:border-indigo-400 focus:ring-2"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(SECTIONS).map(([key, value]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={[
              "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition",
              section === key
                ? "bg-slate-900 text-white shadow-sm"
                : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            {value.label}
            <span
              className={[
                "rounded-full px-2 py-0.5 text-xs tabular-nums",
                section === key ? "bg-white dark:bg-slate-900/20" : "bg-slate-100 text-slate-500 dark:text-slate-400",
              ].join(" ")}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm">
          Loading assessments…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
          <ClipboardList size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Nothing in this section
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Requests appear here as they move through the workflow.
          </p>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-4">
          {visible.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                    {item.request_number}
                  </p>
                  <h3 className="mt-1 truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {[item.business_unit, item.requested_by, item.priority]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/assessment/${item.id}`)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Open
                  <ArrowRight size={16} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <RiskStep item={item} />
                <AnalystStep review={item.analyst_review} />
                <CommitteeStep decision={item.committee_decision} />
              </div>
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default Assessments;
