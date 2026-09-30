import {
  BarChart3,
  ClipboardList,
  LayoutGrid,
  Milestone,
  Settings,
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
  { to: "/", label: "Settings", icon: Settings, disabled: true },
];
