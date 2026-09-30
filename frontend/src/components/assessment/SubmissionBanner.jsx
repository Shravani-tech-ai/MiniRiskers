import { CheckCircle2, Lock } from "lucide-react";

function formatSubmittedAt(timestamp) {
  if (!timestamp) {
    return null;
  }

  const date = new Date(`${timestamp}Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SubmissionBanner({
  changeRequest,
  auditEvents,
  ownsIntake,
  readOnly = true,
}) {
  const submittedEvent = Array.isArray(auditEvents)
    ? auditEvents.find((event) => event.action === "CHANGE_REQUEST_SUBMITTED")
    : null;
  const submittedAt = formatSubmittedAt(submittedEvent?.created_at);
  const submittedBy = submittedEvent?.actor || changeRequest?.requested_by;

  if (ownsIntake) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-4 text-base text-emerald-900">
        <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p>
          <span className="font-semibold">
            Submitted for Risk Analyst review
            {submittedAt ? ` on ${submittedAt}` : ""}.
          </span>{" "}
          Inputs are now locked. You can follow the request's progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-5 py-4 text-base text-indigo-900">
      <Lock size={20} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
      <p>
        <span className="font-semibold">
          Submitted by {submittedBy || "the Business Owner"}
          {submittedAt ? ` on ${submittedAt}` : ""}.
        </span>
        {readOnly ? " Intake inputs are read-only." : ""}
      </p>
    </div>
  );
}

export default SubmissionBanner;
