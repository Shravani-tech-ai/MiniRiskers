import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

import ThemeToggle from "../ThemeToggle";

function AuthHeader() {
  return (
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
  );
}

export default AuthHeader;
