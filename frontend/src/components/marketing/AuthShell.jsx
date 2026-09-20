import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

import RoleOverviewPanel from "./RoleOverviewPanel";

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">MiniRiskers</p>
              <p className="text-xs text-slate-500">
                Financial Crime Risk Management Workbench
              </p>
            </div>
          </Link>
          <p className="hidden text-xs font-medium text-slate-500 sm:block">
            Secure · Compliant · Trusted
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl lg:min-h-[calc(100vh-73px)] lg:grid-cols-2">
        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>

        <div className="hidden border-l border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 lg:block">
          <RoleOverviewPanel />
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
