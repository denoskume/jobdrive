import {
  ACADEMIC_ORGANIZATION_PATTERNS,
  DEFENSE_PATTERNS,
  OFF_TARGET_ROLE_PATTERNS,
  WRONG_EMPLOYMENT_PATTERNS,
} from "./scoringConfig.mjs";

function firstMatch(patterns, text) {
  const pattern = patterns.find((item) => item.test(text));
  return pattern ? pattern.source : "";
}

export function evaluateEligibility(candidate = {}, evidence = {}, classification = {}) {
  const contractText = [candidate.contract, candidate.type]
    .map((value) => String(value || ""))
    .join(" ");

  const wrongEmployment = firstMatch(WRONG_EMPLOYMENT_PATTERNS, contractText);
  if (wrongEmployment) {
    return {
      accepted: false,
      rejectionReason: "internship_type",
      rejectionSignals: [wrongEmployment],
    };
  }

  const academic = firstMatch(
    ACADEMIC_ORGANIZATION_PATTERNS,
    String(evidence.organizationText || "")
  );
  if (academic) {
    return {
      accepted: false,
      rejectionReason: "academic_policy",
      rejectionSignals: [academic],
    };
  }

  const defense = firstMatch(
    DEFENSE_PATTERNS,
    `${evidence.organizationText || ""} ${evidence.text || ""}`
  );
  if (defense) {
    return {
      accepted: false,
      rejectionReason: "defense_policy",
      rejectionSignals: [defense],
    };
  }

  const offTarget = firstMatch(
    OFF_TARGET_ROLE_PATTERNS,
    String(evidence.roleText || "")
  );
  if (offTarget) {
    return {
      accepted: false,
      rejectionReason: "technical_alignment",
      rejectionSignals: [offTarget],
    };
  }

  if (!classification.domain || !classification.signals?.length) {
    return {
      accepted: false,
      rejectionReason: "technical_alignment",
      rejectionSignals: [],
    };
  }

  return {
    accepted: true,
    rejectionReason: "",
    rejectionSignals: [],
  };
}
