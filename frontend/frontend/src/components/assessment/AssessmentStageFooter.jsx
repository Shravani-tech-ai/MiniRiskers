function AssessmentStageFooter({ hint, children }) {
  return (
    <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm lg:p-6">
      {hint && (
        <p className="mb-4 text-base text-slate-600 dark:text-slate-400">{hint}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {children}
      </div>
    </div>
  );
}

export default AssessmentStageFooter;
