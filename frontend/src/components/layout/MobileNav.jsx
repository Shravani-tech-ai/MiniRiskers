import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  ClipboardList,
  LayoutGrid,
  Settings,
} from "lucide-react";

const items = [
  { to: "/dashboard", label: "Requests", icon: LayoutGrid },
  { to: "/", label: "Assessments", icon: ClipboardList },
  { to: "/", label: "Analytics", icon: BarChart3 },
  { to: "/", label: "Settings", icon: Settings },
];

function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.label === "Requests" &&
            (location.pathname === "/dashboard" ||
              location.pathname.startsWith("/assessment") ||
              location.pathname === "/new-request");

          return (
            <Link
              key={item.label}
              to={item.to}
              className={[
                "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-semibold",
                active ? "text-indigo-600" : "text-slate-500",
              ].join(" ")}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
