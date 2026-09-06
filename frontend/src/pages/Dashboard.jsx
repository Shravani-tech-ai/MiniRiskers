import { useEffect, useState } from "react";
import { FileText, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";

function Dashboard() {
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    fetchChangeRequests();
  }, []);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);

      const response = await api.get("/change-requests");

      setChangeRequests(response.data);
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
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus size={18} />

              New Request
            </button>

          </div>

        </div>
      </div>


      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-8 py-8">

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-5">

            <div className="flex items-center gap-3">

              <div className="rounded-lg bg-slate-100 p-2">
                <FileText
                  size={20}
                  className="text-slate-700"
                />
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Total Requests
                </p>

                <p className="text-2xl font-bold text-slate-900">
                  {changeRequests.length}
                </p>
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