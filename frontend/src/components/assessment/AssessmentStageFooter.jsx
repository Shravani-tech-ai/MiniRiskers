import { Children } from "react";

function AssessmentStageFooter({ hint, children }) {
  const hasActions = Children.toArray(children).some(Boolean);

  return (
    <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm lg:p-6">
      {hint && (
        <p
          className={`text-base leading-7 text-slate-600 dark:text-slate-400 ${
            hasActions ? "mb-4" : ""
          }`}
        >
          {hint}
        </p>
      )}
      {hasActions && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}

export default AssessmentStageFooter;
