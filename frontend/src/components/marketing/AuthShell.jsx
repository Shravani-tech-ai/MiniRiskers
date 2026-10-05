import AuthHeader from "./AuthHeader";
import RoleOverviewPanel from "./RoleOverviewPanel";

function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  mode = "login",
  selectedRole = null,
  onRoleSelect,
  disabledRoles = [],
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      <AuthHeader />

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
          <RoleOverviewPanel
            mode={mode}
            selectedRole={selectedRole}
            onRoleSelect={onRoleSelect}
            disabledRoles={disabledRoles}
          />
        </div>
      </div>
    </div>
  );
}

export default AuthShell;
