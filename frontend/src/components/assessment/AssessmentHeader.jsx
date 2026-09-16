import { ArrowLeft } from "lucide-react";

function AssessmentHeader({ changeRequest, navigate }) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-8 py-6">

        <button
          onClick={() => navigate("/")}
          className="mb-5 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Change Requests
        </button>

        {changeRequest && (
          <>
            <div className="flex items-center gap-3">

              <span className="text-sm font-semibold text-slate-500">
                {changeRequest.request_number}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {changeRequest.status || "DRAFT"}
              </span>

            </div>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {changeRequest.title}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {changeRequest.business_unit}
              {" • "}
              {changeRequest.product_type}
              {" • "}
              {changeRequest.customer_segment}
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
              {changeRequest.description}
            </p>
          </>
        )}

      </div>
    </div>
  );
}

export default AssessmentHeader;