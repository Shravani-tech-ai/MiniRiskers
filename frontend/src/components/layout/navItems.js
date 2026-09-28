import { BarChart3, ClipboardList, LayoutGrid, Settings } from "lucide-react";

export const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Requests",
    icon: LayoutGrid,
    matches: (path) =>
      path === "/dashboard" ||
      path.startsWith("/assessment/") ||
      path === "/new-request",
  },
  {
    to: "/assessments",
    label: "Assessments",
    icon: ClipboardList,
    matches: (path) => path === "/assessments",
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    matches: (path) => path === "/analytics",
  },
  { to: "/", label: "Settings", icon: Settings, disabled: true },
];
