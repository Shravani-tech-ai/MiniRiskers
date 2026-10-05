import { ArrowRight, Check } from "lucide-react";

import { ROLE_CARDS } from "./roleCards";

function RoleOverviewPanel({
  mode = "login",
  selectedRole = null,
  onRoleSelect,
  disabledRoles = [],
}) {
  const actionVerb = mode === "signup" ? "Sign up as" : "Login as";

  return (
    <div className="flex h-full flex-col justify-center px-6 py-6 lg:px-10 xl:px-12">
      <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-slate-100 lg:text-2xl xl:text-3xl">
        Role-based access for every stakeholder
      </h2>

      <div className="mt-6 grid gap-3 lg:grid-cols-2 lg:gap-4">
        {ROLE_CARDS.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedRole === card.role;
          const isDisabled = disabledRoles.includes(card.role);

          return (
            <button
              key={card.role}
              type="button"
              disabled={isDisabled || !onRoleSelect}
              aria-pressed={isSelected}
              onClick={() => onRoleSelect?.(card.role)}
              className={`group rounded-xl border bg-white p-4 text-left shadow-sm transition dark:bg-slate-900 ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500/40 dark:border-blue-400"
                  : "border-slate-200 dark:border-slate-700"
              } ${
                isDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-blue-400 hover:shadow-md dark:hover:border-blue-500"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-lg border p-2 ${card.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 lg:text-base">
                    {card.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-400">
                    {card.description}
                  </p>
                  <p
                    className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                      isSelected
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-slate-500 group-hover:text-blue-700 dark:text-slate-400 dark:group-hover:text-blue-300"
                    }`}
                  >
                    {isDisabled ? (
                      "Provisioned by administrators"
                    ) : isSelected ? (
                      <>
                        <Check size={14} />
                        {actionVerb} {card.title}
                      </>
                    ) : (
                      <>
                        {actionVerb} {card.title}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RoleOverviewPanel;
