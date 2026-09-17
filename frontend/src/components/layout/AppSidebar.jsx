import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  LayoutGrid,
  Settings,
  Shield,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Requests", icon: LayoutGrid },
  { to: "/", label: "Assessments", icon: ClipboardList, disabled: true },
  { to: "/", label: "Analytics", icon: BarChart3, disabled: true },
  { to: "/", label: "Settings", icon: Settings, disabled: true },
];

function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
          <Shield className="text-white" size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">MiniRiskers</span>
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-500">FCRM Workbench</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.label === "Requests" &&
            (location.pathname === "/" ||
              location.pathname.startsWith("/assessment") ||
              location.pathname === "/new-request");

          if (item.disabled) {
            return (
              <span
                key={item.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
