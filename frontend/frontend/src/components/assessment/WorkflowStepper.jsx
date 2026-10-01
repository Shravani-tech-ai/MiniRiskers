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

function StepButton({
  stage,
  index,
  currentIndex,
  activeIndex,
  timestamp,
  locked,
  onStageSelect,
  variant,
}) {
  const Icon = stageIcons[stage.key] || CircleDot;
  const completed = index < currentIndex;
  const isCurrentStage = index === currentIndex;
  const isActiveView = index === activeIndex;
  const navigable =
    typeof onStageSelect === "function" &&
    index <= currentIndex &&
    !locked;

  const circleClass = [
    "flex shrink-0 items-center justify-center rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
    variant === "sidebar" ? "h-9 w-9" : "h-12 w-12 lg:h-14 lg:w-14",
    completed
      ? "border-green-500 bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400"
      : isCurrentStage
      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500",
    navigable ? "cursor-pointer hover:scale-105" : "cursor-default",
    isActiveView && navigable ? "ring-2 ring-indigo-200 ring-offset-2 dark:ring-indigo-800" : "",
  ].join(" ");

  const labelClass = [
    variant === "sidebar" ? "text-sm font-semibold" : "text-center text-sm font-bold lg:text-base",
    isActiveView
      ? "text-indigo-700 dark:text-indigo-300"
      : isCurrentStage
      ? "text-indigo-600 dark:text-indigo-400"
      : completed
      ? "text-green-700 dark:text-green-300"
      : "text-slate-400 dark:text-slate-500",
  ].join(" ");

  return (
    <button
      type="button"
      disabled={!navigable}
      onClick={() => navigable && onStageSelect(stage.key)}
      className={[
        variant === "sidebar"
          ? "flex w-full items-start gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          : "flex min-w-0 flex-1 flex-col items-center",
        navigable ? "" : "hover:bg-transparent dark:hover:bg-transparent",
      ].join(" ")}
      aria-current={isActiveView ? "step" : undefined}
      title={
        navigable
          ? `View ${stage.label}`
          : locked
          ? "Not available for your role"
          : "Complete earlier steps first"
      }
    >
      <span className={circleClass}>
        {completed ? <CheckCircle2 size={16} /> : <Icon size={16} />}
      </span>

      <span className={variant === "sidebar" ? "min-w-0 flex-1 pt-0.5" : "mt-3"}>
        <span className={["block", labelClass].join(" ")}>{stage.label}</span>
        {timestamp ? (
          <span
            className={[
              "mt-0.5 block text-xs leading-tight text-slate-500 dark:text-slate-400",
              variant === "sidebar" ? "" : "max-w-[9rem] text-center lg:text-sm",
            ].join(" ")}
          >
            {timestamp}
          </span>
        ) : (
          <span className="mt-0.5 block text-xs text-slate-300 dark:text-slate-600">
            —
          </span>
        )}
      </span>
    </button>
  );
}

function WorkflowStepper({
  currentStage,
  activeView,
  auditEvents,
  onStageSelect,
  lockedStages = [],
  variant = "horizontal",
  title = "Assessment Workflow",
}) {
  const normalizedStage = normalizeWorkflowStage(currentStage);
  const currentIndex = getWorkflowStageIndex(normalizedStage);
  const activeIndex = getWorkflowStageIndex(activeView || normalizedStage);
  const stageTimestamps = buildStageTimestamps(auditEvents);
  const currentLabel = WORKFLOW_STAGES[currentIndex]?.label || "Request";

  if (variant === "sidebar") {
    return (
      <div>
        <div className="mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Track your Progress
          </h3>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Step {currentIndex + 1} of {WORKFLOW_STAGES.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Current:{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {currentLabel}
            </span>
          </p>
        </div>

        <div className="space-y-1">
          {WORKFLOW_STAGES.map((stage, index) => {
            const locked = lockedStages.includes(stage.key);
            const timestamp = formatStageTimestamp(stageTimestamps[stage.key]);
            const completed = index < currentIndex;

            return (
              <div key={stage.key} className="relative">
                {index < WORKFLOW_STAGES.length - 1 ? (
                  <span
                    className={[
                      "absolute left-[1.125rem] top-9 bottom-0 w-px -translate-x-1/2",
                      completed ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                ) : null}

                <StepButton
                  stage={stage}
                  index={index}
                  currentIndex={currentIndex}
                  activeIndex={activeIndex}
                  timestamp={timestamp}
                  locked={locked}
                  onStageSelect={onStageSelect}
                  variant="sidebar"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 lg:text-2xl">
            {title}
          </h3>

          <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
            Current stage:{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {currentLabel}
            </span>
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-300">
          Step {currentIndex + 1} of {WORKFLOW_STAGES.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-[720px] items-start">
          {WORKFLOW_STAGES.map((stage, index) => {
            const locked = lockedStages.includes(stage.key);
            const timestamp = formatStageTimestamp(stageTimestamps[stage.key]);

            return (
              <div key={stage.key} className="flex flex-1 items-start">
                <StepButton
                  stage={stage}
                  index={index}
                  currentIndex={currentIndex}
                  activeIndex={activeIndex}
                  timestamp={timestamp}
                  locked={locked}
                  onStageSelect={onStageSelect}
                  variant="horizontal"
                />

                {index < WORKFLOW_STAGES.length - 1 && (
                  <div
                    className={[
                      "mt-5 h-0.5 flex-1",
                      index < currentIndex
                        ? "bg-green-400"
                        : "bg-slate-200 dark:bg-slate-700",
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
