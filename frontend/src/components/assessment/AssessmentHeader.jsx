import { ArrowLeft } from "lucide-react";

function AssessmentHeader({ changeRequest, navigate }) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8 xl:px-12">
        <button
          onClick={() => navigate("/")}
          className="mb-5 flex items-center gap-2 text-base font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back to Change Requests
        </button>

        {changeRequest && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base font-bold text-slate-600">
                {changeRequest.request_number}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {changeRequest.status || "DRAFT"}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">
              {changeRequest.title}
            </h1>

            <p className="mt-3 text-base text-slate-600 lg:text-lg">
              {changeRequest.business_unit}
              {" · "}
              {changeRequest.product_type}
              {" · "}
              {changeRequest.customer_segment}
            </p>

            {changeRequest.description && (
              <p className="mt-4 max-w-4xl text-base leading-relaxed text-slate-600 lg:text-[17px]">
                {changeRequest.description}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AssessmentHeader;
