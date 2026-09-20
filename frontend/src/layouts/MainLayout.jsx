import { Bell, LogOut, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AppSidebar from "../components/layout/AppSidebar";
import AppTopBar from "../components/layout/AppTopBar";
import MobileNav from "../components/layout/MobileNav";
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
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppTopBar compact />

      <div className="flex min-h-screen">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="hidden border-b border-slate-200 bg-white px-8 py-4 lg:flex">
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-700">
                FCRM Workbench
              </p>
              <div className="flex items-center gap-3">
              <button
                type="button"
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <UserCircle2 size={20} />
                {user?.full_name || user?.username || "User"}
                <span className="text-xs text-slate-500">
                  ({roleLabel(user?.role)})
                </span>
                <LogOut size={16} className="text-slate-500" />
              </button>
              </div>
            </div>
          </header>

          <main className="flex-1 pb-20 lg:pb-8">{children}</main>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}

export default MainLayout;
