function AssessmentStageFooter({ hint, children }) {
  return (
    <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
      {hint && (
        <p className="mb-4 text-base text-slate-600">{hint}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        {children}
      </div>
    </div>
  );
}

export default AssessmentStageFooter;
