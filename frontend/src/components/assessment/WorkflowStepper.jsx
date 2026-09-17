import {
  CheckCircle2,
  CircleDot,
  FileText,
  Gavel,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";

import {
  WORKFLOW_STAGES,
  buildStageTimestamps,
  formatStageTimestamp,
  getWorkflowStageIndex,
  normalizeWorkflowStage,
} from "./workflowStages";

const stageIcons = {
  REQUEST_CREATED: FileText,
  RISK_ASSESSMENT: SearchCheck,
  ANALYST_REVIEW: ShieldCheck,
  COMMITTEE_REVIEW: Gavel,
  COMPLETED: CheckCircle2,
};

function WorkflowStepper({
  currentStage,
  activeView,
  auditEvents,
  onStageSelect,
}) {
  const normalizedStage = normalizeWorkflowStage(currentStage);
  const currentIndex = getWorkflowStageIndex(normalizedStage);
  const activeIndex = getWorkflowStageIndex(
    activeView || normalizedStage
  );
  const stageTimestamps = buildStageTimestamps(auditEvents);

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            Assessment Workflow
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Current stage:{" "}
            <span className="font-medium text-indigo-600">
              {WORKFLOW_STAGES[currentIndex]?.label || "Request"}
            </span>
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
          Step {currentIndex + 1} of {WORKFLOW_STAGES.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[640px] items-start">
          {WORKFLOW_STAGES.map((stage, index) => {
            const Icon = stageIcons[stage.key] || CircleDot;
            const completed = index < currentIndex;
            const isCurrentStage = index === currentIndex;
            const isActiveView = index === activeIndex;
            const timestamp = formatStageTimestamp(
              stageTimestamps[stage.key]
            );
            const navigable =
              typeof onStageSelect === "function" &&
              index <= currentIndex;

            return (
              <div
                key={stage.key}
                className="flex flex-1 items-start"
              >
                <div className="flex min-w-0 flex-1 flex-col items-center">
                  <button
                    type="button"
                    disabled={!navigable}
                    onClick={() => navigable && onStageSelect(stage.key)}
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                      completed
                        ? "border-green-500 bg-green-50 text-green-600"
                        : isCurrentStage
                        ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 bg-white text-slate-400",
                      navigable
                        ? "cursor-pointer hover:scale-105"
                        : "cursor-default",
                      isActiveView && navigable
                        ? "ring-2 ring-indigo-200 ring-offset-2"
                        : "",
                    ].join(" ")}
                    aria-current={isActiveView ? "step" : undefined}
                    title={
                      navigable
                        ? `View ${stage.label}`
                        : "Complete earlier steps first"
                    }
                  >
                    {completed ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Icon size={18} />
                    )}
                  </button>

                  <span
                    className={[
                      "mt-2 text-center text-xs font-semibold",
                      isActiveView
                        ? "text-indigo-700"
                        : isCurrentStage
                        ? "text-indigo-600"
                        : completed
                        ? "text-green-700"
                        : "text-slate-400",
                    ].join(" ")}
                  >
                    {stage.label}
                  </span>

                  {timestamp ? (
                    <span className="mt-1 max-w-[7.5rem] text-center text-[10px] leading-tight text-slate-500">
                      {timestamp}
                    </span>
                  ) : (
                    <span className="mt-1 text-[10px] text-slate-300">
                      —
                    </span>
                  )}
                </div>

                {index < WORKFLOW_STAGES.length - 1 && (
                  <div
                    className={[
                      "mt-5 h-0.5 flex-1",
                      index < currentIndex
                        ? "bg-green-400"
                        : "bg-slate-200",
                    ].join(" ")}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WorkflowStepper;
