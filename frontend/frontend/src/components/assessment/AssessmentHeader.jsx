import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAssessmentWorkflow } from "../../context/AssessmentWorkflowContext";
import { useAuth } from "../../context/AuthContext";
import {
  ROLES,
  getDisplayStatus,
} from "../../utils/rolePermissions";

export function getDefaultBackPath(role) {
  if (
    role === ROLES.RISK_ANALYST ||
    role === ROLES.RISK_COMMITTEE ||
    role === ROLES.AUDITOR
  ) {
    return "/assessments";
  }

  return "/dashboard";
}

function AssessmentHeader({ changeRequest }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearWorkflow } = useAssessmentWorkflow();
  const backPath = location.state?.from || getDefaultBackPath(user?.role);

  const handleBack = () => {
    clearWorkflow();
    navigate(backPath, { replace: true });
  };

  return (
    <div className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8 xl:px-12">
        <button
          type="button"
          onClick={handleBack}
          className="relative z-10 mb-5 inline-flex items-center gap-2 text-base font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft size={18} />
          Back to Change Requests
        </button>

        {changeRequest ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                {changeRequest.request_number}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {getDisplayStatus(changeRequest).label}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">
              {changeRequest.title}
            </h1>

            <p className="mt-3 text-base text-slate-600 dark:text-slate-400 lg:text-lg">
              {changeRequest.business_unit}
              {" · "}
              {changeRequest.product_type}
              {" · "}
              {changeRequest.customer_segment}
            </p>

            {changeRequest.description ? (
              <p className="mt-4 max-w-4xl text-base leading-relaxed text-slate-600 dark:text-slate-400 lg:text-[17px]">
                {changeRequest.description}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default AssessmentHeader;
