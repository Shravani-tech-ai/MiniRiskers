export const ROLES = {
  BUSINESS_OWNER: "BUSINESS_OWNER",
  RISK_ANALYST: "RISK_ANALYST",
  RISK_COMMITTEE: "RISK_COMMITTEE",
  AUDITOR: "AUDITOR",
  ADMIN: "ADMIN",
};

export function getDashboardTitle(role) {
  switch (role) {
    case ROLES.BUSINESS_OWNER:
      return "My Change Requests";
    case ROLES.RISK_ANALYST:
      return "Risk Assessments";
    case ROLES.RISK_COMMITTEE:
      return "Pending Committee Decisions";
    case ROLES.AUDITOR:
      return "Audit & Compliance View";
    case ROLES.ADMIN:
      return "System Overview";
    default:
      return "Dashboard";
  }
}

export function getAssessmentPermissions(role) {
  const readOnly = role === ROLES.AUDITOR;

  return {
    readOnly,
    canEditIntake:
      !readOnly &&
      (role === ROLES.BUSINESS_OWNER || role === ROLES.ADMIN),
    canRunRiskPipeline:
      !readOnly &&
      (role === ROLES.RISK_ANALYST || role === ROLES.ADMIN),
    canAnalystReview:
      !readOnly &&
      (role === ROLES.RISK_ANALYST || role === ROLES.ADMIN),
    canCommitteeDecide:
      !readOnly &&
      (role === ROLES.RISK_COMMITTEE || role === ROLES.ADMIN),
    canCreateRequest:
      role === ROLES.BUSINESS_OWNER || role === ROLES.ADMIN,
  };
}

export function roleLabel(role) {
  switch (role) {
    case ROLES.BUSINESS_OWNER:
      return "Business Owner";
    case ROLES.RISK_ANALYST:
      return "Risk Analyst";
    case ROLES.RISK_COMMITTEE:
      return "Risk Committee";
    case ROLES.AUDITOR:
      return "Auditor";
    case ROLES.ADMIN:
      return "Admin";
    default:
      return role || "User";
  }
}
