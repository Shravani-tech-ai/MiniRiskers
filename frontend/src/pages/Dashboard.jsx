import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../context/AuthContext";
import {
  getAssessmentPermissions,
  getDashboardTitle,
} from "../utils/rolePermissions";

const FILTER_OPTIONS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "HIGH_PRIORITY", label: "High priority" },
];

const IN_PROGRESS_STATUSES = new Set([
  "IN_REVIEW",
  "ANALYST_REVIEW",
  "COMMITTEE_REVIEW",
]);

function formatStatus(status) {
  if (!status) {
    return "Draft";
  }
  return status.replace(/_/g, " ");
}

function formatChangeType(value) {
  if (!value) {
    return "—";
  }
  return value.replace(/_/g, " ");
}

function getStatusStyle(status) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-700";
    case "IN_REVIEW":
    case "ANALYST_REVIEW":
    case "COMMITTEE_REVIEW":
      return "bg-blue-100 text-blue-700";
    case "APPROVED":
      return "bg-emerald-100 text-emerald-800";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getPriorityStyle(priority) {
  switch (priority) {
    case "CRITICAL":
      return "text-red-700 font-semibold";
    case "HIGH":
      return "text-orange-700 font-semibold";
    case "LOW":
      return "text-emerald-700";
    default:
      return "text-slate-700";
  }
}

function matchesFilter(request, filterId) {
  switch (filterId) {
    case "ALL":
      return true;
    case "DRAFT":
      return request.status === "DRAFT";
    case "IN_PROGRESS":
      return IN_PROGRESS_STATUSES.has(request.status);
    case "APPROVED":
      return request.status === "APPROVED";
    case "REJECTED":
      return request.status === "REJECTED";
    case "HIGH_PRIORITY":
      return (
        request.priority === "HIGH" || request.priority === "CRITICAL"
      );
    default:
      return true;
  }
}

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = getAssessmentPermissions(user?.role);
  const dashboardTitle = getDashboardTitle(user?.role);

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
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);

  const totalRequests = changeRequests.length;

  const inProgressRequests = changeRequests.filter((request) =>
    IN_PROGRESS_STATUSES.has(request.status)
  ).length;

  const completedRequests = changeRequests.filter(
    (request) =>
      request.status === "APPROVED" || request.status === "REJECTED"
  ).length;

  const highPriorityRequests = changeRequests.filter(
    (request) =>
      request.priority === "HIGH" || request.priority === "CRITICAL"
  ).length;

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
      if (!matchesFilter(request, activeFilter)) {
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
        request.status,
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
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
                {dashboardTitle}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
            </div>
            <p className="mt-2 text-base text-slate-600 lg:text-lg">
              Financial crime risk assessment workbench — monitor intake,
              workflow, and residual risk across change requests.
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
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by ID, title, unit, product, or requester…"
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-base text-slate-900 shadow-sm outline-none ring-indigo-100 transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <FileText size={20} className="text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">
                  Total requests
                </p>
                <p className="text-3xl font-bold text-slate-900 lg:text-4xl">
                  {totalRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <Clock3 size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">
                  In progress
                </p>
                <p className="text-3xl font-bold text-slate-900 lg:text-4xl">
                  {inProgressRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">
                  Completed
                </p>
                <p className="text-3xl font-bold text-slate-900 lg:text-4xl">
                  {completedRequests}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2">
                <ShieldAlert size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 sm:text-sm sm:normal-case sm:tracking-normal">
                  High / critical
                </p>
                <p className="text-3xl font-bold text-slate-900 lg:text-4xl">
                  {highPriorityRequests}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Risk overview
              </h2>
              <p className="mt-1 text-base text-slate-600">
                Residual rating distribution across{" "}
                {riskSummary.total_assessments} assessed requests
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600 lg:text-base">
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
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveFilter(option.id)}
                className={[
                  "rounded-full px-5 py-2.5 text-base font-semibold transition",
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">
              Loading change requests…
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && filteredRequests.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <FileText size={40} className="mx-auto text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No matching requests
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Adjust search or filters, or create a new change request.
            </p>
          </div>
        )}

        {!loading && !error && filteredRequests.length > 0 && (
          <>
            <div className="space-y-3 xl:hidden">
              {filteredRequests.map((request) => (
                <article
                  key={request.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {request.request_number}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">
                        {request.title}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                        request.status
                      )}`}
                    >
                      {formatStatus(request.status)}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-400">
                        Unit
                      </dt>
                      <dd className="mt-0.5 text-slate-700">
                        {request.business_unit || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-slate-400">
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

                  <button
                    type="button"
                    onClick={() => openAssessment(request.id)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Open assessment
                    <ArrowRight size={16} />
                  </button>
                </article>
              ))}
            </div>

            <div className="hidden gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_min(420px,36%)]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-base">
                    <thead className="border-b border-slate-200 bg-slate-50 text-sm font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Request</th>
                        <th className="px-5 py-4">Change type</th>
                        <th className="px-5 py-4">Business unit</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Priority</th>
                        <th className="px-5 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.map((request) => {
                        const isSelected = request.id === selectedId;

                        return (
                          <tr
                            key={request.id}
                            onClick={() => setSelectedId(request.id)}
                            className={[
                              "cursor-pointer transition hover:bg-slate-50",
                              isSelected ? "bg-indigo-50/60" : "",
                            ].join(" ")}
                          >
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {request.request_number}
                              </p>
                              <p className="mt-0.5 max-w-xs truncate text-slate-600">
                                {request.title}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {formatChangeType(request.change_type)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {request.business_unit || "—"}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                                  request.status
                                )}`}
                              >
                                {formatStatus(request.status)}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 ${getPriorityStyle(
                                request.priority
                              )}`}
                            >
                              {request.priority || "MEDIUM"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openAssessment(request.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                              >
                                Open
                                <ArrowRight size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="sticky top-6 h-fit rounded-xl border border-slate-200 bg-white shadow-sm">
                {selectedRequest ? (
                  <>
                    <div className="flex items-start justify-between border-b border-slate-200 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          {selectedRequest.request_number}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">
                          {selectedRequest.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Clear selection"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            selectedRequest.status
                          )}`}
                        >
                          {formatStatus(selectedRequest.status)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {formatChangeType(selectedRequest.change_type)}
                        </span>
                      </div>

                      {selectedRequest.description && (
                        <p className="text-sm leading-relaxed text-slate-600">
                          {selectedRequest.description}
                        </p>
                      )}

                      <dl className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                          <dt className="text-slate-500">Product type</dt>
                          <dd className="font-medium text-slate-900">
                            {selectedRequest.product_type || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                          <dt className="text-slate-500">Business unit</dt>
                          <dd className="font-medium text-slate-900">
                            {selectedRequest.business_unit || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                          <dt className="text-slate-500">Customer segment</dt>
                          <dd className="font-medium text-slate-900">
                            {selectedRequest.customer_segment || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                          <dt className="text-slate-500">Requested by</dt>
                          <dd className="font-medium text-slate-900">
                            {selectedRequest.requested_by || "—"}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-slate-500">Priority</dt>
                          <dd
                            className={getPriorityStyle(
                              selectedRequest.priority
                            )}
                          >
                            {selectedRequest.priority || "MEDIUM"}
                          </dd>
                        </div>
                      </dl>

                      <button
                        type="button"
                        onClick={() => openAssessment(selectedRequest.id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Open assessment
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Select a request to view details.
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
    </PageContainer>
  );
}

export default Dashboard;
