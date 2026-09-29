import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "./navItems";
import { useAuth } from "../../context/AuthContext";

function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-2 py-2 lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {NAV_ITEMS.filter(
          (item) => !item.disabled && !item.hiddenFor?.includes(user?.role)
        ).map((item) => {
          const Icon = item.icon;
          const active = item.matches(location.pathname);

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
