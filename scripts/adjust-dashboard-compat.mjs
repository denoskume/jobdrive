import fs from "node:fs";

const path = "src/utils/jobDrive.mjs";
let text = fs.readFileSync(path, "utf8");

function replaceOnce(matcher, replacement, label) {
  if (!matcher.test(text)) {
    throw new Error(`Missing patch target: ${label}`);
  }
  text = text.replace(matcher, replacement);
}

replaceOnce(
  /function internshipTechnicalText\(job = \{\}\) \{[\s\S]*?\n\}\n\n\nexport function isAcademicOrganization/,
  `function internshipTechnicalText(job = {}) {
  return [
    job.role,
    job.domain,
    job.whyRelevant,
    job.notes,
    job.descriptionRaw,
    job.roleMission,
    job.mustHaveSkills,
    job.expectations,
  ]
    .filter(Boolean)
    .join(" ");
}


export function isAcademicOrganization`,
  "legacy-safe technical evidence"
);

replaceOnce(
  /function isTargetTechnicalRole\(job = \{\}\) \{[\s\S]*?\n\}\n\nfunction internshipOrganizationText/,
  `function isTargetTechnicalRole(job = {}) {
  const role = internshipRoleText(job);

  if (!role.trim()) {
    return isAlignedInternship(job);
  }

  if (matchesAny(OFF_TARGET_INTERNSHIP_ROLE_PATTERNS, role)) {
    return false;
  }

  return (
    matchesAny(ALIGNED_INTERNSHIP_PATTERNS, role) ||
    matchesAny(TARGET_ROLE_FALLBACK_PATTERNS, role)
  );
}

function internshipOrganizationText`,
  "legacy-safe target role"
);

replaceOnce(
  /export function isIndustryInternship\(job = \{\}\) \{[\s\S]*?\n\}\n\n\nexport function filterInternships/,
  `export function isIndustryInternship(job = {}) {
  if (job.type !== "Stage M2") {
    return false;
  }

  if (isAcademicOrganization(job)) {
    return false;
  }

  const contract = String(job.contract || "").trim();
  if (/\\b(?:cdi|permanent|alternance|apprentice(?:ship)?|apprenti(?:e)?|ph\\.?d|cifre|postdoc(?:toral)?)\\b/i.test(contract)) {
    return false;
  }

  if (/\\bfull[- ]?time\\b/i.test(contract) && !hasRealInternshipEvidence(job)) {
    return false;
  }

  const location = String(job.location || "").trim();
  if (
    location &&
    /\\b(?:emea|east coast|london|united kingdom|uk|germany|berlin|spain|madrid|italy|milan|united states|usa|india|bangalore|bengaluru)\\b/i.test(location) &&
    !isFranceInternshipLocation(job)
  ) {
    return false;
  }

  if (!hasCompatibleInternshipDuration(job)) {
    return false;
  }

  if (!isTargetTechnicalRole(job)) {
    return false;
  }

  return isAlignedInternship(job);
}


export function filterInternships`,
  "legacy-safe strict dashboard policy"
);

fs.writeFileSync(path, text);
console.log("Dashboard compatibility adjustment applied.");
