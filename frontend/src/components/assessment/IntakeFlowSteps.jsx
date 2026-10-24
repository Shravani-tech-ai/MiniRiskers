import { CheckCircle2, Lock } from "lucide-react";

const STEPS = [
  { id: "intake", title: "Intake", subtitle: "Upload a BRD or choose manual entry" },
  { id: "inputs", title: "Assessment inputs", subtitle: "Complete and save each section" },
  { id: "review", title: "Review & submit", subtitle: "Check everything, then submit" },
];

// Three-step flow for the request intake: choose the intake method, fill the
// assessment sections, then review and submit.
function IntakeFlowSteps({ currentStep, isStepEnabled, isStepComplete, onStepChange }) {
  return (
    <ol className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
      {STEPS.map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isComplete = !isCurrent && isStepComplete(step.id);
        const enabled = isCurrent || isStepEnabled(step.id);

        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => enabled && !isCurrent && onStepChange(step.id)}
              disabled={!enabled}
              aria-current={isCurrent ? "step" : undefined}
              title={enabled ? undefined : "Save every section first"}
              className={[
                "flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-left transition sm:px-4",
                isCurrent
                  ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40"
                  : isComplete
                  ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-800"
                  : enabled
                  ? "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                  : "cursor-not-allowed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isCurrent
                    ? "bg-indigo-600 text-white"
                    : isComplete
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                ].join(" ")}
              >
                {isComplete ? (
                  <CheckCircle2 size={14} />
                ) : !enabled ? (
                  <Lock size={12} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-900 dark:text-slate-100 sm:text-sm">
                  {step.title}
                </span>
                <span className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                  {step.subtitle}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default IntakeFlowSteps;
