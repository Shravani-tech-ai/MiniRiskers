import { useEffect, useState } from "react";
import { FileText, Plus, ArrowRight, Clock3, CheckCircle2, ShieldAlert, } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

function Dashboard() {
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

  const navigate = useNavigate();

  const totalRequests = changeRequests.length;

  const inProgressRequests = changeRequests.filter(
    (request) =>
      request.status === "IN_REVIEW" ||
      request.status === "ANALYST_REVIEW" ||
      request.status === "COMMITTEE_REVIEW"
  ).length;

  const completedRequests = changeRequests.filter(
    (request) =>
      request.status === "APPROVED" ||
      request.status === "REJECTED"
  ).length;

  const highPriorityRequests = changeRequests.filter(
    (request) =>
      request.priority === "HIGH" ||
      request.priority === "CRITICAL"
  ).length;

  useEffect(() => {
    fetchChangeRequests();
  }, []);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);

      const response = await api.get("/change-requests");

      setChangeRequests(response.data);
      const riskResponse = await api.get("/dashboard/risk-summary");
      setRiskSummary(riskResponse.data);
    } catch (error) {
      console.error("Failed to load change requests:", error);
      setError("Unable to load change requests.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700";

      case "IN_REVIEW":
        return "bg-blue-100 text-blue-700";

      case "APPROVED":
        return "bg-green-100 text-green-700";

      case "REJECTED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-8 py-8">

          <div className="flex items-center justify-between">

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Change Requests
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Financial crime risk assessment requests
              </p>
            </div>

            <button
              onClick={() => navigate("/new-request")}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={18} />
              New Request
            </button>

          </div>

        </div>
      </div>


      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-8 py-8">

        {/* Dashboard Summary */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

          {/* Total */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-slate-100 p-2">
                <FileText size={20} className="text-slate-700" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total Requests
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {totalRequests}
                </p>
              </div>

            </div>
          </div>


          {/* In Progress */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-blue-50 p-2">
                <Clock3 size={20} className="text-blue-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  In Progress
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {inProgressRequests}
                </p>
              </div>

            </div>
          </div>


          {/* Completed */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-green-50 p-2">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Completed
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {completedRequests}
                </p>
              </div>

            </div>
          </div>


          {/* High Priority */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-red-50 p-2">
                <ShieldAlert size={20} className="text-red-600" />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  High / Critical Risk
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {riskSummary.high + riskSummary.critical}
                </p>
              </div>

            </div>
          </div>

        </div>

                {/* Risk Overview */}
        <div className="mb-8">

          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Risk Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current risk distribution across assessed change requests
            </p>
          </div>


          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* Critical */}
            <div className="rounded-xl border border-red-200 bg-white p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Critical
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-700">
                    {riskSummary.critical}
                  </p>
                </div>

                <div className="rounded-lg bg-red-50 px-3 py-2">
                  <span className="text-sm font-semibold text-red-700">
                    CRITICAL
                  </span>
                </div>

              </div>

            </div>


            {/* High */}
            <div className="rounded-xl border border-orange-200 bg-white p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    High
                  </p>

                  <p className="mt-2 text-3xl font-bold text-orange-700">
                    {riskSummary.high}
                  </p>
                </div>

                <div className="rounded-lg bg-orange-50 px-3 py-2">
                  <span className="text-sm font-semibold text-orange-700">
                    HIGH
                  </span>
                </div>

              </div>

            </div>


            {/* Medium */}
            <div className="rounded-xl border border-yellow-200 bg-white p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Medium
                  </p>

                  <p className="mt-2 text-3xl font-bold text-yellow-700">
                    {riskSummary.medium}
                  </p>
                </div>

                <div className="rounded-lg bg-yellow-50 px-3 py-2">
                  <span className="text-sm font-semibold text-yellow-700">
                    MEDIUM
                  </span>
                </div>

              </div>

            </div>


            {/* Low */}
            <div className="rounded-xl border border-green-200 bg-white p-5">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Low
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {riskSummary.low}
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 px-3 py-2">
                  <span className="text-sm font-semibold text-green-700">
                    LOW
                  </span>
                </div>

              </div>

            </div>

          </div>

        </div>
        
        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">

            <p className="text-sm text-slate-500">
              Loading change requests...
            </p>

          </div>
        )}


        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">

            <p className="text-sm text-red-700">
              {error}
            </p>

          </div>
        )}


        {/* Empty */}
        {!loading &&
          !error &&
          changeRequests.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">

              <FileText
                size={40}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                No change requests
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                There are currently no change requests to display.
              </p>

            </div>
          )}


        {/* Change Request Cards */}
        {!loading &&
          !error &&
          changeRequests.length > 0 && (

            <div className="space-y-4">

              {changeRequests.map((request) => (

                <div
                  key={request.id}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >

                  {/* Top Row */}
                  <div className="flex items-start justify-between">

                    <div>

                      <div className="flex items-center gap-3">

                        <span className="text-sm font-semibold text-slate-500">
                          {request.request_number}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            request.status
                          )}`}
                        >
                          {request.status || "DRAFT"}
                        </span>

                      </div>

                      <h2 className="mt-2 text-xl font-semibold text-slate-900">
                        {request.title}
                      </h2>

                    </div>

                  </div>


                  {/* Details */}
                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-4">

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Business Unit
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {request.business_unit || "—"}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Product Type
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {request.product_type || "—"}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Customer Segment
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {request.customer_segment || "—"}
                      </p>
                    </div>


                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Priority
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {request.priority || "MEDIUM"}
                      </p>
                    </div>

                  </div>


                  {/* Description */}
                  {request.description && (
                    <p className="mt-5 max-w-4xl text-sm leading-6 text-slate-500">
                      {request.description}
                    </p>
                  )}


                  {/* Bottom */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">

                    <div className="text-xs text-slate-400">
                      Request ID: {request.id}
                    </div>


                    <button
                      onClick={() =>
                        navigate(`/assessment/${request.id}`)
                      }
                      className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open Assessment

                      <ArrowRight size={16} />

                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

      </div>

    </div>
  );
}

export default Dashboard;