import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  LayoutGrid,
  Milestone,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { ROLES } from "../../utils/rolePermissions";

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
    to: "/track-progress",
    label: "Track your Progress",
    icon: Milestone,
    matches: (path) => path.startsWith("/track-progress"),
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    matches: (path) => path === "/analytics",
  },
  {
    to: "/methodology",
    label: "Methodology",
    icon: SlidersHorizontal,
    matches: (path) => path === "/methodology",
    hiddenFor: [ROLES.BUSINESS_OWNER],
  },
  {
    to: "/regulations",
    label: "Regulations",
    icon: BookOpenCheck,
    matches: (path) => path === "/regulations",
    hiddenFor: [ROLES.BUSINESS_OWNER],
  },
  {
    to: "/admin",
    label: "Admin console",
    icon: ShieldCheck,
    matches: (path) => path.startsWith("/admin"),
    visibleFor: [ROLES.ADMIN],
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    matches: (path) => path === "/settings",
  },
];

export function navItemsFor(role) {
  return NAV_ITEMS.filter(
    (item) =>
      !item.hiddenFor?.includes(role) &&
      (!item.visibleFor || item.visibleFor.includes(role))
  );
}
