import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

import ThemeToggle from "../ThemeToggle";
import RoleOverviewPanel from "./RoleOverviewPanel";

function AuthShell({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Shield size={18} />
            </div>
            <div>
              <p className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
                MiniRiskers
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Financial Crime Risk Management Workbench
              </p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 lg:grid-cols-2">
        <div
          className={`flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 ${wide ? "py-4" : "py-6"}`}
        >
          <div className={`w-full ${wide ? "max-w-lg" : "max-w-sm"}`}>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
            <div className={wide ? "mt-4" : "mt-5"}>{children}</div>
            {footer ? <div className="mt-3">{footer}</div> : null}
          </div>
        </div>

        <div className="hidden min-h-0 overflow-hidden border-l border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 dark:from-slate-900 to-blue-50/40 dark:to-slate-800 lg:block">
          <RoleOverviewPanel />
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
