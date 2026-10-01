import { Link, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";

import { NAV_ITEMS } from "./navItems";
import { useAuth } from "../../context/AuthContext";

function AppSidebar() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="hidden h-full w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 xl:w-72 lg:flex lg:flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
          <Shield className="text-white" size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">MiniRiskers</span>
            <span className="rounded-md bg-violet-100 dark:bg-violet-950/40 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
              PRO
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">FCRM Workbench</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {NAV_ITEMS.filter((item) => !item.hiddenFor?.includes(user?.role)).map((item) => {
          const Icon = item.icon;
          const active = !item.disabled && item.matches(location.pathname);

          if (item.disabled) {
            return (
              <span
                key={item.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 dark:text-slate-500"
              >
                <Icon size={18} />
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold transition",
                active
                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
              ].join(" ")}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default AppSidebar;
