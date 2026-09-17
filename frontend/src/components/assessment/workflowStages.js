export const WORKFLOW_STAGES = [
  {
    key: "REQUEST_CREATED",
    label: "Request",
  },
  {
    key: "RISK_ASSESSMENT",
    label: "Risk",
  },
  {
    key: "ANALYST_REVIEW",
    label: "Analyst",
  },
  {
    key: "COMMITTEE_REVIEW",
    label: "Committee",
  },
  {
    key: "COMPLETED",
    label: "Done",
  },
];

export function normalizeWorkflowStage(rawStage) {
  if (!rawStage || rawStage === "DRAFT") {
    return "REQUEST_CREATED";
  }

  if (
    rawStage === "REGULATORY_EVIDENCE" ||
    rawStage === "AI_ASSESSMENT"
  ) {
    return "RISK_ASSESSMENT";
  }

  return rawStage;
}

export function getWorkflowStageIndex(stageKey) {
  const index = WORKFLOW_STAGES.findIndex(
    (stage) => stage.key === stageKey
  );

  return index === -1 ? 0 : index;
}

export function canNavigateToWorkflowStage(targetStage, currentStage) {
  const normalizedCurrent = normalizeWorkflowStage(currentStage);
  const targetIndex = getWorkflowStageIndex(targetStage);
  const currentIndex = getWorkflowStageIndex(normalizedCurrent);

  if (targetIndex === -1 || currentIndex === -1) {
    return false;
  }

  return targetIndex <= currentIndex;
}

export function buildStageTimestamps(auditEvents) {
  const timestamps = {};

  if (!Array.isArray(auditEvents)) {
    return timestamps;
  }

  for (const event of auditEvents) {
    const at = event.created_at || event.timestamp;

    if (!at) {
      continue;
    }

    if (event.action === "CREATED_CHANGE_REQUEST") {
      timestamps.REQUEST_CREATED = at;
    }

    if (event.action === "WORKFLOW_STAGE_CHANGED" && event.new_value) {
      const stage = normalizeWorkflowStage(event.new_value);
      timestamps[stage] = at;
    }

    if (event.action === "RISK_ASSESSMENT_CALCULATED") {
      timestamps.RISK_ASSESSMENT = timestamps.RISK_ASSESSMENT || at;
    }
  }

  return timestamps;
}

export function formatStageTimestamp(timestamp) {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
