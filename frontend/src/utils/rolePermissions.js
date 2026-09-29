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

// RETURNED: the committee deferred the request back to the Business Owner,
// so intake is editable again until they resubmit.
const DRAFT_STATUSES = new Set(["", "DRAFT", "RETURNED"]);
const RISK_STAGES = new Set([
  "RISK_ASSESSMENT",
  "REGULATORY_EVIDENCE",
  "AI_ASSESSMENT",
]);

// Mirrors backend/permissions.py is_submitted(): a request is submitted once
// the Business Owner hands it off, or once it has progressed past intake.
export function isSubmitted(changeRequest) {
  if (!changeRequest) {
    return false;
  }

  const status = (changeRequest.status || "").trim().toUpperCase();
  if (!DRAFT_STATUSES.has(status)) {
    return true;
  }

  const stage = changeRequest.current_stage || "REQUEST_CREATED";
  return stage !== "REQUEST_CREATED";
}

export function getRequestPermissions(role, changeRequest) {
  const base = getAssessmentPermissions(role);
  const submitted = isSubmitted(changeRequest);
  const isAdmin = role === ROLES.ADMIN;

  return {
    ...base,
    submitted,
    // Roles that own intake (and see the submit action), regardless of
    // whether this particular request is still editable.
    ownsIntake: base.canEditIntake,
    canEditIntake: base.canEditIntake && (isAdmin || !submitted),
    canSubmit: base.canEditIntake && !submitted,
    canRunRiskPipeline: base.canRunRiskPipeline && submitted,
    canAnalystReview: base.canAnalystReview && submitted,
    // Business Owners follow their request's progress but do not see the
    // analyst's internal review notes.
    canViewAnalystReview: role !== ROLES.BUSINESS_OWNER,
  };
}

// Workflow stages a role cannot open on the Assessment page.
export function getLockedStages(role) {
  return role === ROLES.BUSINESS_OWNER ? ["ANALYST_REVIEW"] : [];
}

// Stage the Assessment page opens on for a given role.
export function getDefaultView(role, normalizedStage) {
  if (getLockedStages(role).includes(normalizedStage)) {
    return "RISK_ASSESSMENT";
  }

  return normalizedStage;
}

export function getDisplayStatus(changeRequest) {
  if (!changeRequest) {
    return { key: "DRAFT", label: "Draft" };
  }

  const status = (changeRequest.status || "").trim().toUpperCase();
  const stage = changeRequest.current_stage || "REQUEST_CREATED";

  switch (status) {
    case "APPROVE":
    case "APPROVED":
      return { key: "APPROVED", label: "Approved" };
    case "APPROVE_WITH_CONDITIONS":
      return {
        key: "APPROVED_WITH_CONDITIONS",
        label: "Approved — conditions open",
      };
    case "CONDITIONS_MET":
      return {
        key: "APPROVED_WITH_CONDITIONS",
        label: "Approved — conditions met",
      };
    case "RETURNED":
      return { key: "DEFERRED", label: "Returned for rework" };
    case "REASSESSMENT":
      return { key: "DEFERRED", label: "Deferred for reassessment" };
    case "DEFER":
    case "DEFERRED":
      return { key: "DEFERRED", label: "Deferred" };
    case "REJECT":
    case "REJECTED":
      return { key: "REJECTED", label: "Rejected" };
    default:
      break;
  }

  if (stage === "COMMITTEE_REVIEW") {
    return { key: "COMMITTEE_REVIEW", label: "Committee review" };
  }
  if (stage === "ANALYST_REVIEW") {
    return { key: "ANALYST_REVIEW", label: "Analyst review" };
  }
  if (RISK_STAGES.has(stage)) {
    return { key: "RISK_ASSESSMENT", label: "In risk assessment" };
  }
  if (isSubmitted(changeRequest)) {
    return { key: "SUBMITTED", label: "Submitted" };
  }
  return { key: "DRAFT", label: "Draft" };
}

export function isDecided(changeRequest) {
  const { key } = getDisplayStatus(changeRequest);
  return (
    key === "APPROVED" ||
    key === "APPROVED_WITH_CONDITIONS" ||
    key === "REJECTED"
  );
}

// Who may tune the risk methodology: analysts propose, the committee
// approves (maker-checker). Auditors can read everything.
export function getMethodologyPermissions(role) {
  return {
    canView: role !== ROLES.BUSINESS_OWNER,
    canPropose: role === ROLES.RISK_ANALYST || role === ROLES.ADMIN,
    canApprove: role === ROLES.RISK_COMMITTEE || role === ROLES.ADMIN,
  };
}

export function canExportAuditPack(role) {
  return role !== ROLES.BUSINESS_OWNER;
}
