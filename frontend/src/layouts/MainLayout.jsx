import { LogOut, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopBar from "../components/layout/AppTopBar";
import NotificationBell from "../components/layout/NotificationBell";
import MobileNav from "../components/layout/MobileNav";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../utils/rolePermissions";

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#f4f6f9] dark:bg-slate-950">
      <AppTopBar compact />

      <div className="flex min-h-0 flex-1">
        <AppSidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="hidden shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-4 lg:flex">
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                FCRM Workbench
              </p>
              <div className="flex items-center gap-3">
              <ThemeToggle />
              <NotificationBell />
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <UserCircle2 size={20} />
                {user?.full_name || user?.username || "User"}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({roleLabel(user?.role)})
                </span>
                <LogOut size={16} className="text-slate-500 dark:text-slate-400" />
              </button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto pb-20 lg:pb-8">{children}</main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}

export default MainLayout;
