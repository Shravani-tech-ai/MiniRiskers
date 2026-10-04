import { CheckCircle2, Clock, Landmark } from "lucide-react";

import {
  buildStageTimestamps,
  formatStageTimestamp,
  normalizeWorkflowStage,
} from "./workflowStages";

// What roles outside the Risk Committee see for the committee step: where the
// request stands, without the committee's deliberation workspace.
function CommitteeStatusPanel({ changeRequest, auditEvents, onViewOutcome }) {
  const stage = normalizeWorkflowStage(changeRequest?.current_stage);
  const pending = stage === "COMMITTEE_REVIEW";
  const submittedAt = formatStageTimestamp(
    buildStageTimestamps(auditEvents).COMMITTEE_REVIEW
  );

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-200 p-6 dark:border-slate-700">
        <div className="rounded-lg bg-purple-50 p-2.5 dark:bg-purple-950/40">
          <Landmark size={20} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Risk Committee review
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            The final decision is made by the Risk Committee.
          </p>
        </div>
      </div>

      <div className="p-6">
        {pending ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <Clock
              size={20}
              className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Awaiting committee decision
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-300">
                This request is with the Risk Committee
                {submittedAt ? ` (since ${submittedAt})` : ""}. Committee
                deliberations are visible to committee members only; the
                decision and any conditions will appear here once recorded.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-green-900 dark:bg-green-950/40">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-green-600 dark:text-green-400"
              />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-200">
                  Committee decision recorded
                </p>
                <p className="mt-1 text-sm leading-6 text-green-800 dark:text-green-300">
                  See the outcome for the decision and any conditions.
                </p>
              </div>
            </div>
            {onViewOutcome && (
              <button
                type="button"
                onClick={onViewOutcome}
                className="shrink-0 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-slate-900 dark:text-green-400 dark:hover:bg-green-950/60"
              >
                View outcome →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommitteeStatusPanel;
