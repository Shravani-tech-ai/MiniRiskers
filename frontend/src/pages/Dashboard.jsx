import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  FilePen,
  FileText,
  Gavel,
  Inbox,
  Plus,
  Search,
  Send,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import RequestPreviewModal from "../components/assessment/RequestPreviewModal";
import { useAuth } from "../context/AuthContext";
import { pillSelected, pillUnselected } from "../utils/buttonStyles";
import {
  ROLES,
  getAssessmentPermissions,
  getDashboardTitle,
  getDisplayStatus,
  isDecided,
} from "../utils/rolePermissions";

const IN_REVIEW_KEYS = new Set([
  "RISK_ASSESSMENT",
  "ANALYST_REVIEW",
  "COMMITTEE_REVIEW",
  // Deferred by the committee and being reworked.
  "DEFERRED",
]);
const IN_ASSESSMENT_KEYS = new Set(["RISK_ASSESSMENT", "ANALYST_REVIEW"]);

const statusKey = (request) => getDisplayStatus(request).key;
const isHighPriority = (request) =>
  request.priority === "HIGH" || request.priority === "CRITICAL";
const isApproved = (request) =>
  statusKey(request) === "APPROVED" ||
  statusKey(request) === "APPROVED_WITH_CONDITIONS";
const isAwaitingReview = (request) =>
  statusKey(request) === "SUBMITTED" || IN_REVIEW_KEYS.has(statusKey(request));

const FILTERS = {
  ALL: { label: "All", match: () => true },
  DRAFT: { label: "Draft", match: (r) => statusKey(r) === "DRAFT" },
  SUBMITTED: { label: "Submitted", match: (r) => statusKey(r) === "SUBMITTED" },
  IN_REVIEW: {
    label: "In review",
    match: (r) => IN_REVIEW_KEYS.has(statusKey(r)),
  },
  NEW: {
    label: "New (not yet assessed)",
    match: (r) => statusKey(r) === "SUBMITTED",
  },
  IN_ASSESSMENT: {
    label: "In assessment",
    match: (r) => IN_ASSESSMENT_KEYS.has(statusKey(r)),
  },
  SENT_TO_COMMITTEE: {
    label: "Sent to committee",
    match: (r) => statusKey(r) === "COMMITTEE_REVIEW",
  },
  PENDING_DECISION: {
    label: "Pending decision",
    match: (r) => statusKey(r) === "COMMITTEE_REVIEW",
  },
  DECIDED: { label: "Decided", match: isDecided },
  HIGH_PRIORITY: { label: "High priority", match: isHighPriority },
};

const DEFAULT_DASHBOARD_CONFIG = {
  subtitle:
    "Financial crime risk assessment workbench — monitor intake, workflow, and residual risk across change requests.",
  filters: ["ALL", "DRAFT", "SUBMITTED", "IN_REVIEW", "DECIDED", "HIGH_PRIORITY"],
  defaultFilter: "ALL",
  stats: [
    { label: "Total requests", icon: FileText, tone: "slate", match: () => true },
    { label: "In progress", icon: Clock3, tone: "blue", match: isAwaitingReview },
    { label: "Completed", icon: CheckCircle2, tone: "emerald", match: isDecided },
    { label: "High / critical", icon: ShieldAlert, tone: "red", match: isHighPriority },
  ],
  emptyText: "No change requests have been created yet.",
  actionLabel: () => "Open assessment",
};

const DASHBOARD_CONFIG = {
  [ROLES.BUSINESS_OWNER]: {
    subtitle:
      "Capture your change requests, then preview and submit them for Risk Analyst review.",
    filters: ["ALL", "DRAFT", "SUBMITTED", "IN_REVIEW", "DECIDED"],
    defaultFilter: "ALL",
    stats: [
      { label: "Total requests", icon: FileText, tone: "slate", match: () => true },
      {
        label: "Drafts",
        icon: FilePen,
        tone: "amber",
        match: (r) => statusKey(r) === "DRAFT",
      },
      { label: "Awaiting review", icon: Clock3, tone: "blue", match: isAwaitingReview },
      { label: "Decided", icon: CheckCircle2, tone: "emerald", match: isDecided },
    ],
    emptyText: "Create a new change request to get started.",
    actionLabel: (r) =>
      statusKey(r) === "DRAFT" ? "Continue editing" : "View status",
  },
  [ROLES.RISK_ANALYST]: {
    subtitle:
      "Requests submitted by Business Owners, ready for risk assessment and analyst review.",
    filters: [
      "ALL",
      "NEW",
      "IN_ASSESSMENT",
      "SENT_TO_COMMITTEE",
      "DECIDED",
      "HIGH_PRIORITY",
    ],
    defaultFilter: "ALL",
    stats: [
      { label: "Queue total", icon: FileText, tone: "slate", match: () => true },
      {
        label: "New",
        icon: Inbox,
        tone: "amber",
        match: (r) => statusKey(r) === "SUBMITTED",
      },
      {
        label: "In assessment",
        icon: Clock3,
        tone: "blue",
        match: (r) => IN_ASSESSMENT_KEYS.has(statusKey(r)),
      },
      {
        label: "Sent to committee",
        icon: Send,
        tone: "emerald",
        match: (r) => statusKey(r) === "COMMITTEE_REVIEW",
      },
    ],
    emptyText: "No requests have been submitted by Business Owners yet.",
    actionLabel: (r) => {
      const key = statusKey(r);
      if (key === "SUBMITTED") return "Start risk assessment";
      if (IN_ASSESSMENT_KEYS.has(key)) return "Continue assessment";
      return "View";
    },
  },
  [ROLES.RISK_COMMITTEE]: {
    subtitle:
      "Requests reviewed by Risk Analysts and awaiting a committee decision.",
    filters: ["PENDING_DECISION", "DECIDED", "ALL"],
    defaultFilter: "PENDING_DECISION",
    stats: [
      {
        label: "Pending decision",
        icon: Gavel,
        tone: "blue",
        match: (r) => statusKey(r) === "COMMITTEE_REVIEW",
      },
      { label: "Approved", icon: CheckCircle2, tone: "emerald", match: isApproved },
      {
        label: "Rejected / deferred",
        icon: XCircle,
        tone: "red",
        match: (r) =>
          statusKey(r) === "REJECTED" || statusKey(r) === "DEFERRED",
      },
      { label: "Total", icon: FileText, tone: "slate", match: () => true },
    ],
    emptyText: "No requests have been sent to the committee yet.",
    actionLabel: (r) =>
      statusKey(r) === "COMMITTEE_REVIEW" ? "Review & decide" : "View",
  },
};

const STAT_TONES = {
  slate: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  blue: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  emerald: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
  amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
};

function formatChangeType(value) {
  if (!value) {
    return "—";
  }
  return value.replace(/_/g, " ");
}

function getStatusStyle(key) {
  switch (key) {
    case "DRAFT":
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    case "SUBMITTED":
      return "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300";
    case "RISK_ASSESSMENT":
    case "ANALYST_REVIEW":
    case "COMMITTEE_REVIEW":
      return "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300";
    case "APPROVED":
    case "APPROVED_WITH_CONDITIONS":
      return "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300";
    case "DEFERRED":
      return "bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300";
    case "REJECTED":
      return "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
  }
}

function StatusBadge({ request, className = "" }) {
  const { key, label } = getDisplayStatus(request);
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
        key
      )} ${className}`}
    >
      {label}
    </span>
  );
}

function getPriorityStyle(priority) {
  switch (priority) {
    case "CRITICAL":
      return "text-red-700 dark:text-red-300 font-semibold";
    case "HIGH":
      return "text-orange-700 font-semibold";
    case "LOW":
      return "text-emerald-700 dark:text-emerald-300";
    default:
      return "text-slate-700 dark:text-slate-300";
  }
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = getAssessmentPermissions(user?.role);
  const dashboardTitle = getDashboardTitle(user?.role);
  const config = DASHBOARD_CONFIG[user?.role] || DEFAULT_DASHBOARD_CONFIG;

  const [changeRequests, setChangeRequests] = useState([]);
  const [riskSummary, setRiskSummary] = useState({
    total_assessments: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState(config.defaultFilter);
  const [selectedId, setSelectedId] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  const statCounts = config.stats.map(
    (stat) => changeRequests.filter(stat.match).length
  );

  const riskTotal =
    riskSummary.critical +
    riskSummary.high +
    riskSummary.medium +
    riskSummary.low;

  const riskSegments = useMemo(() => {
    if (riskTotal === 0) {
      return [
        { key: "empty", label: "No assessments", pct: 100, color: "bg-slate-200" },
      ];
    }
    return [
      {
        key: "critical",
        label: "Critical",
        count: riskSummary.critical,
        pct: (riskSummary.critical / riskTotal) * 100,
        color: "bg-red-500",
      },
      {
        key: "high",
        label: "High",
        count: riskSummary.high,
        pct: (riskSummary.high / riskTotal) * 100,
        color: "bg-orange-500",
      },
      {
        key: "medium",
        label: "Medium",
        count: riskSummary.medium,
        pct: (riskSummary.medium / riskTotal) * 100,
        color: "bg-amber-400",
      },
      {
        key: "low",
        label: "Low",
        count: riskSummary.low,
        pct: (riskSummary.low / riskTotal) * 100,
        color: "bg-emerald-500",
      },
    ].filter((segment) => segment.count > 0);
  }, [riskSummary, riskTotal]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return changeRequests.filter((request) => {
      if (!(FILTERS[activeFilter] || FILTERS.ALL).match(request)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        request.request_number,
        request.title,
        request.description,
        request.business_unit,
        request.product_type,
        request.customer_segment,
        request.requested_by,
        request.change_type,
        getDisplayStatus(request).label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [changeRequests, searchQuery, activeFilter]);

  const selectedRequest = useMemo(
    () =>
      changeRequests.find((request) => request.id === selectedId) ??
      null,
    [changeRequests, selectedId]
  );

  useEffect(() => {
    fetchChangeRequests();
  }, []);

  useEffect(() => {
    if (filteredRequests.length === 0) {
      setSelectedId(null);
      return;
    }

    const stillVisible = filteredRequests.some(
      (request) => request.id === selectedId
    );

    if (!stillVisible) {
      setSelectedId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedId]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const [requestsResponse, riskResponse] = await Promise.all([
        api.get("/change-requests"),
        api.get("/dashboard/risk-summary"),
      ]);

      setChangeRequests(requestsResponse.data);
      setRiskSummary(riskResponse.data);

      if (requestsResponse.data.length > 0) {
        setSelectedId(requestsResponse.data[0].id);
      }
    } catch (fetchError) {
      console.error("Failed to load change requests:", fetchError);
      setError("Unable to load change requests.");
    } finally {
      setLoading(false);
    }
  };

  const openAssessment = (id) => {
    navigate(`/assessment/${id}`);
  };

  return (
    <PageContainer className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">
                {dashboardTitle}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400 lg:text-lg">
              {config.subtitle}
            </p>
          </div>

          {permissions.canCreateRequest ? (
            <button
              type="button"
              onClick={() => navigate("/new-request")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={18} />
              New request
            </button>
          ) : null}
        </div>

        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by ID, title, unit, product, or requester…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3.5 pl-11 pr-4 text-base text-slate-900 dark:text-slate-100 shadow-sm outline-none ring-indigo-100 dark:ring-indigo-900/40 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-400 focus:border-indigo-400 focus:ring-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {config.stats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${STAT_TONES[stat.tone]}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-sm sm:normal-case sm:tracking-normal">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 lg:text-4xl">
                      {statCounts[index]}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Risk overview
              </h2>
              <p className="mt-1 text-base text-slate-600 dark:text-slate-400">
                Residual rating distribution across{" "}
                {riskSummary.total_assessments} assessed requests
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600 dark:text-slate-400 lg:text-base">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
                Critical {riskSummary.critical}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
                High {riskSummary.high}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                Medium {riskSummary.medium}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Low {riskSummary.low}
              </span>
            </div>
          </div>

          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {riskSegments.map((segment) => (
              <div
                key={segment.key}
                className={`${segment.color} transition-all`}
                style={{ width: `${segment.pct}%` }}
                title={
                  segment.key === "empty"
                    ? segment.label
                    : `${segment.label}: ${segment.count}`
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.filters.map((filterId) => {
            const option = { id: filterId, ...FILTERS[filterId] };
            const isActive = activeFilter === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveFilter(option.id)}
                className={[
                  "rounded-full px-5 py-2.5 text-base font-semibold transition",
                  isActive ? pillSelected : pillUnselected,
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading change requests…
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && filteredRequests.length === 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
            <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-600" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {changeRequests.length === 0
                ? "No requests yet"
                : "No matching requests"}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {changeRequests.length === 0
                ? config.emptyText
                : "Adjust search or filters to find a request."}
            </p>
          </div>
        )}

        {!loading && !error && filteredRequests.length > 0 && (
          <>
            <div className="space-y-3 xl:hidden">
              {filteredRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {request.request_number}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                        {request.title}
                      </h3>
                    </div>
                    <StatusBadge request={request} className="shrink-0" />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">
                        Unit
                      </dt>
                      <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
                        {request.business_unit || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500">
                        Priority
                      </dt>
                      <dd
                        className={`mt-0.5 ${getPriorityStyle(
                          request.priority
                        )}`}
                      >
                        {request.priority || "MEDIUM"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewId(request.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Eye size={16} />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => openAssessment(request.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {config.actionLabel(request)}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_min(420px,36%)]">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-base">
                    <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-5 py-4">Request</th>
                        <th className="px-5 py-4">Change type</th>
                        <th className="px-5 py-4">Business unit</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Priority</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRequests.map((request) => {
                        const isSelected = request.id === selectedId;

                        return (
                          <tr
                            key={request.id}
                            onClick={() => setSelectedId(request.id)}
                            className={[
                              "cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800",
                              isSelected ? "bg-indigo-50 dark:bg-indigo-950/40/60 dark:bg-indigo-950/30" : "",
                            ].join(" ")}
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {request.request_number}
                              </p>
                              <p className="mt-0.5 max-w-xs truncate text-slate-600 dark:text-slate-400">
                                {request.title}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {formatChangeType(request.change_type)}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                              {request.business_unit || "—"}
                            </td>
                            <td className="px-5 py-4">
                              <StatusBadge request={request} className="inline-flex" />
                            </td>
                            <td
                              className={`px-4 py-3 ${getPriorityStyle(
                                request.priority
                              )}`}
                            >
                              {request.priority || "MEDIUM"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPreviewId(request.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                                >
                                  <Eye size={14} />
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openAssessment(request.id);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900"
                                >
                                  {config.actionLabel(request)}
                                  <ArrowRight size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="sticky top-6 h-fit rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                {selectedRequest ? (
                  <>
                    <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                          {selectedRequest.request_number}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {selectedRequest.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-400"
                        aria-label="Clear selection"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge request={selectedRequest} />
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900 dark:text-slate-900">
                          {formatChangeType(selectedRequest.change_type)}
                        </span>
                      </div>

                      {selectedRequest.description && (
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                          {selectedRequest.description}
                        </p>
                      )}

                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <dt className="text-slate-500 dark:text-slate-400">Product type</dt>
                          <dd className="font-medium text-slate-900 dark:text-slate-100">
                            {selectedRequest.product_type || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <dt className="text-slate-500 dark:text-slate-400">Business unit</dt>
                          <dd className="font-medium text-slate-900 dark:text-slate-100">
                            {selectedRequest.business_unit || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <dt className="text-slate-500 dark:text-slate-400">Customer segment</dt>
                          <dd className="font-medium text-slate-900 dark:text-slate-100">
                            {selectedRequest.customer_segment || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <dt className="text-slate-500 dark:text-slate-400">Requested by</dt>
                          <dd className="font-medium text-slate-900 dark:text-slate-100">
                            {selectedRequest.requested_by || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500 dark:text-slate-400">Priority</dt>
                          <dd
                            className={getPriorityStyle(
                              selectedRequest.priority
                            )}
                          >
                            {selectedRequest.priority || "MEDIUM"}
                          </dd>
                        </div>
                      </dl>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewId(selectedRequest.id)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Eye size={16} />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => openAssessment(selectedRequest.id)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          {config.actionLabel(selectedRequest)}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Select a request to view details.
                  </div>
                )}
              </aside>
            </div>
          </>
        )}

        {previewId && (
          <RequestPreviewModal
            requestId={previewId}
            onClose={() => setPreviewId(null)}
          />
        )}
    </PageContainer>
  );
}

export default Dashboard;
