import {
  Briefcase,
  ClipboardCheck,
  Eye,
  Shield,
  UserCog,
} from "lucide-react";

import { ROLES } from "../../utils/rolePermissions";

const ROLE_CARDS = [
  {
    role: ROLES.BUSINESS_OWNER,
    title: "Business Owner",
    icon: Briefcase,
    tone: "border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
    description:
      "Create and manage change requests, provide business inputs, and track requests through the workflow.",
    tags: ["Create requests", "View own requests", "Manage inputs"],
  },
  {
    role: ROLES.RISK_ANALYST,
    title: "Risk Analyst",
    icon: ClipboardCheck,
    tone: "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    description:
      "Perform risk assessments, generate regulatory evidence, and complete analyst reviews.",
    tags: ["Risk assessment", "Generate evidence", "Analyst review"],
  },
  {
    role: ROLES.RISK_COMMITTEE,
    title: "Risk Committee",
    icon: Shield,
    tone: "border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300",
    description:
      "Review assessments, evaluate findings, and make final decisions on change requests.",
    tags: ["View & review", "Committee decision", "Approve / reject"],
  },
  {
    role: ROLES.AUDITOR,
    title: "Auditor",
    icon: Eye,
    tone: "border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    description:
      "Read-only access to records, assessments, evidence, and audit trails.",
    tags: ["View only", "Audit trail", "Compliance view"],
  },
  {
    role: ROLES.ADMIN,
    title: "Admin",
    icon: UserCog,
    tone: "border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300",
    description:
      "Full access to workflow features and oversight across change requests.",
    tags: ["All features", "Oversight", "System access"],
  },
];

function RoleOverviewPanel() {
  return (
    <div className="flex h-full flex-col justify-center px-6 py-6 lg:px-10 xl:px-12">
      <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-slate-100 lg:text-2xl xl:text-3xl">
        Role-based access for every stakeholder
      </h2>

      <div className="mt-6 grid gap-3 lg:grid-cols-2 lg:gap-4">
        {ROLE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.role}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-lg border p-2 ${card.tone}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 lg:text-base">
                    {card.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-slate-400">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RoleOverviewPanel;
