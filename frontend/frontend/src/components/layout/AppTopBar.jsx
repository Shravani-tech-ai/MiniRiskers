import { Shield, UserCircle2 } from "lucide-react";

import NotificationBell from "./NotificationBell";
import ThemeToggle from "../ThemeToggle";

function AppTopBar({ compact = false }) {
  if (compact) {
    return (
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
              <Shield className="text-white" size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  MiniRiskers
                </span>
                <span className="rounded bg-violet-100 dark:bg-violet-950/40 px-1 py-0.5 text-[9px] font-bold text-violet-700 dark:text-violet-300">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">FCRM Workbench</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="rounded-lg p-2" />
            <NotificationBell compact />
            <button
              type="button"
              className="rounded-lg p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Profile"
            >
              <UserCircle2 size={22} />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return null;
}

export default AppTopBar;
