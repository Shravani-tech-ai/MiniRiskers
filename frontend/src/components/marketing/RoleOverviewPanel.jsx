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
    tone: "border-sky-200 bg-sky-50 text-sky-700",
    description:
      "Create and manage change requests, provide business inputs, and track requests through the workflow.",
    tags: ["Create requests", "View own requests", "Manage inputs"],
  },
  {
    role: ROLES.RISK_ANALYST,
    title: "Risk Analyst",
    icon: ClipboardCheck,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    description:
      "Perform risk assessments, generate regulatory evidence, and complete analyst reviews.",
    tags: ["Risk assessment", "Generate evidence", "Analyst review"],
  },
  {
    role: ROLES.RISK_COMMITTEE,
    title: "Risk Committee",
    icon: Shield,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
    description:
      "Review assessments, evaluate findings, and make final decisions on change requests.",
    tags: ["View & review", "Committee decision", "Approve / reject"],
  },
  {
    role: ROLES.AUDITOR,
    title: "Auditor",
    icon: Eye,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    description:
      "Read-only access to records, assessments, evidence, and audit trails.",
    tags: ["View only", "Audit trail", "Compliance view"],
  },
  {
    role: ROLES.ADMIN,
    title: "Admin",
    icon: UserCog,
    tone: "border-teal-200 bg-teal-50 text-teal-700",
    description:
      "Full access to workflow features and oversight across change requests.",
    tags: ["All features", "Oversight", "System access"],
  },
];

function RoleOverviewPanel() {
  return (
    <div className="flex h-full flex-col justify-center px-6 py-10 lg:px-10 xl:px-14">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        One platform. Different roles.
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 xl:text-3xl">
        Role-based access for every stakeholder
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
        After sign-in, MiniRiskers shows the workflow steps and actions allowed
        for your assigned role. Permissions are enforced on the server, not
        only in the UI.
      </p>

      <div className="mt-8 space-y-4">
        {ROLE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.role}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-lg border p-2 ${card.tone}`}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900">{card.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {card.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Secure · Compliant · Trusted
      </p>
    </div>
  );
}

export default RoleOverviewPanel;
