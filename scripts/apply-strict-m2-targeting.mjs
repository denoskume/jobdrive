import fs from "node:fs";

function replaceOnce(text, matcher, replacement, label) {
  const matches = text.match(matcher);
  if (!matches) throw new Error(`Missing patch target: ${label}`);
  const next = text.replace(matcher, replacement);
  if (next === text) throw new Error(`Patch made no change: ${label}`);
  return next;
}

function patchDashboardPolicy() {
  const path = "src/utils/jobDrive.mjs";
  let text = fs.readFileSync(path, "utf8");

  const strictHelpers = `
const INTERNSHIP_EVIDENCE_PATTERNS = [
  /\\binternship\\b/i,
  /\\bintern\\b/i,
  /\\bstage\\b/i,
  /\\bstagiaire\\b/i,
  /\\bfin d['’]études\\b/i,
  /\\bfin d'etudes\\b/i,
  /\\bpfe\\b/i,
];

const OFF_TARGET_INTERNSHIP_ROLE_PATTERNS = [
  /\\bcustomer success\\b/i,
  /\\bcustomer support\\b/i,
  /\\baccount (manager|executive)\\b/i,
  /\\bsales\\b/i,
  /\\bbusiness development\\b/i,
  /\\bproduct (manager|management)\\b/i,
  /\\bfull[- ]?stack\\b/i,
  /\\bfront[- ]?end\\b/i,
  /\\bback[- ]?end\\b/i,
  /\\bweb developer\\b/i,
  /\\bmobile developer\\b/i,
  /\\bios developer\\b/i,
  /\\bandroid developer\\b/i,
  /\\bdevops\\b/i,
  /\\bsite reliability\\b/i,
  /\\bsre\\b/i,
  /\\bpower bi\\b/i,
  /\\bbusiness intelligence\\b/i,
  /\\breporting analyst\\b/i,
  /\\berp\\b/i,
  /\\bsap consultant\\b/i,
  /\\bcyber ?security\\b/i,
  /\\bqa tester\\b/i,
  /\\bmarketing\\b/i,
];

const TARGET_ROLE_FALLBACK_PATTERNS = [
  /\\bapplied scientist\\b/i,
  /\\bresearch scientist\\b/i,
  /\\bresearch engineer\\b/i,
  /\\bresearch intern\\b/i,
  /\\br&d intern\\b/i,
];

const TARGET_DURATION_PATTERN =
  /\\b(?:5|6)\\s*[- ]?(?:month|months|mois)\\b|\\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\\b/i;

const ANY_DURATION_PATTERN =
  /\\b(?:[1-9]|1[0-2])\\s*[- ]?(?:month|months|mois)\\b|\\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\\b/i;

function matchesAny(patterns, text) {
  return patterns.some((pattern) => pattern.test(String(text || "")));
}

function internshipRoleText(job = {}) {
  return String(job.role || "");
}

function internshipEvidenceText(job = {}) {
  return [job.role, job.contract]
    .filter(Boolean)
    .join(" ");
}

function internshipDurationText(job = {}) {
  return [
    job.role,
    job.contract,
    job.descriptionRaw,
    job.expectations,
  ]
    .filter(Boolean)
    .join(" ");
}

function isFranceInternshipLocation(job = {}) {
  return /france|paris|nantes|lyon|toulouse|bordeaux|grenoble|sophia antipolis|lille|rennes|marseille|aix-en-provence|montpellier|strasbourg/i
    .test(String(job.location || ""));
}

function hasRealInternshipEvidence(job = {}) {
  return matchesAny(
    INTERNSHIP_EVIDENCE_PATTERNS,
    internshipEvidenceText(job)
  );
}

function hasCompatibleInternshipDuration(job = {}) {
  const text = internshipDurationText(job);
  if (TARGET_DURATION_PATTERN.test(text)) return true;
  return !ANY_DURATION_PATTERN.test(text);
}

function isTargetTechnicalRole(job = {}) {
  const role = internshipRoleText(job);
  if (matchesAny(OFF_TARGET_INTERNSHIP_ROLE_PATTERNS, role)) {
    return false;
  }

  return (
    matchesAny(ALIGNED_INTERNSHIP_PATTERNS, role) ||
    matchesAny(TARGET_ROLE_FALLBACK_PATTERNS, role)
  );
}
`;

  text = replaceOnce(
    text,
    /\n\nfunction internshipOrganizationText\(job = \{\}\) \{/,
    `${strictHelpers}\nfunction internshipOrganizationText(job = {}) {`,
    "dashboard strict helper insertion"
  );

  text = replaceOnce(
    text,
    /function internshipTechnicalText\(job = \{\}\) \{[\s\S]*?\n\}\n\n\nexport function isAcademicOrganization/,
    `function internshipTechnicalText(job = {}) {
  return [
    job.role,
    job.descriptionRaw,
    job.roleMission,
    job.mustHaveSkills,
    job.expectations,
  ]
    .filter(Boolean)
    .join(" ");
}


export function isAcademicOrganization`,
    "dashboard source-evidence technical text"
  );

  text = replaceOnce(
    text,
    /export function isIndustryInternship\(job = \{\}\) \{[\s\S]*?\n\}\n\n\nexport function filterInternships/,
    `export function isIndustryInternship(job = {}) {
  if (job.type !== "Stage M2") {
    return false;
  }

  if (!isFranceInternshipLocation(job)) {
    return false;
  }

  if (!hasRealInternshipEvidence(job)) {
    return false;
  }

  if (!hasCompatibleInternshipDuration(job)) {
    return false;
  }

  if (isAcademicOrganization(job)) {
    return false;
  }

  if (!isTargetTechnicalRole(job)) {
    return false;
  }

  return isAlignedInternship(job);
}


export function filterInternships`,
    "dashboard strict industry internship policy"
  );

  fs.writeFileSync(path, text);
}

function patchAppsDiscovery() {
  const path = "apps-script/Discovery.gs";
  let text = fs.readFileSync(path, "utf8");

  text = replaceOnce(
    text,
    /function discoveryText_\(c\)\{[\s\S]*?\n\}\n\nfunction createDiscoveryRunSummary_/,
    `function discoveryLocationText_(c){
  return [c.location,c.country].join(" ").toLowerCase();
}
function discoveryInternshipText_(c){
  return [c.role,c.contract].join(" ").toLowerCase();
}
function discoveryDurationText_(c){
  return [c.role,c.contract,c.descriptionRaw].join(" ").toLowerCase();
}
function discoveryDurationCompatible_(c){
  var t=discoveryDurationText_(c);
  var target=/\\b(?:5|6)\\s*[- ]?(?:month|months|mois)\\b|\\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\\b/i;
  if(target.test(t)) return true;
  var any=/\\b(?:[1-9]|1[0-2])\\s*[- ]?(?:month|months|mois)\\b|\\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\\b/i;
  return !any.test(t);
}

function normalizeDiscoveryCandidate_(raw, source) {
  return { sourceKey:source.key, externalId:String(raw.id||raw.externalId||""), company:String(raw.company||source.company||"").trim(), role:String(raw.title||raw.role||"").trim(), location:String(raw.location||raw.locationName||"").trim(), country:String(raw.country||"").trim(), postedDate:String(raw.publishedAt||raw.postedDate||raw.createdAt||"").trim(), deadline:String(raw.deadline||"").trim(), link:String(raw.absoluteUrl||raw.jobUrl||raw.url||raw.applyUrl||"").trim(), source:source.type, descriptionRaw:String(raw.descriptionPlain||raw.description||raw.descriptionHtml||"").replace(/<[^>]+>/g," ").replace(/\\s+/g," ").trim(), contract:String(raw.employmentType||raw.contract||"").trim(), compensation:String(raw.compensation||raw.salary||raw.salaryRange||"").trim(), detectedAt:new Date().toISOString() };
}

function evaluateDiscoveryCandidate_(c) {
  if (!/^https?:\\/\\//i.test(c.link)) return {accepted:false,reason:"missing_url"};
  var locationText=discoveryLocationText_(c);
  var fr=/france|paris|nantes|lyon|toulouse|bordeaux|grenoble|sophia antipolis|lille|rennes|marseille|aix-en-provence|montpellier|strasbourg/.test(locationText);
  if (!fr) return {accepted:false,reason:"country"};

  var internshipText=discoveryInternshipText_(c);
  if (/alternance|apprenticeship|apprenti|permanent|\\bcdi\\b|\\bphd\\b|cifre|postdoc/.test(internshipText)) return {accepted:false,reason:"internship_type"};
  if (!/\\binternship\\b|\\bintern\\b|\\bstage\\b|\\bstagiaire\\b|\\bfin d['’]études\\b|\\bfin d'etudes\\b|\\bpfe\\b/.test(internshipText)) return {accepted:false,reason:"internship_type"};
  if (!discoveryDurationCompatible_(c)) return {accepted:false,reason:"internship_duration"};

  return {accepted:true,reason:"accepted"};
}

function createDiscoveryRunSummary_`,
    "Apps Script discovery hard gates"
  );

  text = text.replace(
    /else if\(e\.reason==="internship_type"\) summary\.rejectedByInternshipType\+\+;/,
    `else if(e.reason==="internship_type"||e.reason==="internship_duration") summary.rejectedByInternshipType++;`
  );
  text = text.replace(
    /if\(scored\.rejectionReason==="internship_type"\) summary\.rejectedByInternshipType\+\+;/,
    `if(scored.rejectionReason==="internship_type"||scored.rejectionReason==="internship_duration") summary.rejectedByInternshipType++;`
  );

  fs.writeFileSync(path, text);
}

function patchAppsScoring() {
  const path = "apps-script/Scoring.gs";
  let text = fs.readFileSync(path, "utf8");

  const strictConfig = `

var INTERNSHIP_POSITIVE_PATTERNS_ = [
  /\\binternship\\b/i,
  /\\bintern\\b/i,
  /\\bstage\\b/i,
  /\\bstagiaire\\b/i,
  /\\bfin d['’]études\\b/i,
  /\\bfin d'etudes\\b/i,
  /\\bpfe\\b/i
];

var STRICT_OFF_TARGET_ROLE_PATTERNS_ = OFF_TARGET_ROLE_PATTERNS_.concat([
  /\\bcustomer success\\b/i,
  /\\bcustomer support\\b/i,
  /\\baccount (manager|executive)\\b/i,
  /\\bsales\\b/i,
  /\\bproduct (manager|management)\\b/i,
  /\\bfull[- ]?stack\\b/i,
  /\\bfront[- ]?end\\b/i,
  /\\bback[- ]?end\\b/i,
  /\\bmobile developer\\b/i,
  /\\bios developer\\b/i,
  /\\bandroid developer\\b/i,
  /\\bdevops\\b/i,
  /\\bsite reliability\\b/i,
  /\\bsre\\b/i
]);

var TARGET_TECHNICAL_ROLE_PATTERNS_ = [
  /\\bdata scien(tist|ce)\\b/i,
  /\\bmachine learning\\b/i,
  /\\bml (engineer|research|scientist|intern)\\b/i,
  /\\bdeep learning\\b/i,
  /\\bartificial intelligence\\b/i,
  /\\bai (engineer|research|scientist|intern)\\b/i,
  /\\bgenerative ai\\b/i,
  /\\bgenai\\b/i,
  /\\bapplied scientist\\b/i,
  /\\bresearch scientist\\b/i,
  /\\bresearch engineer\\b/i,
  /\\bresearch intern\\b/i,
  /\\br&d intern\\b/i,
  /\\bcomputer vision\\b/i,
  /\\bperception\\b/i,
  /\\bimage processing\\b/i,
  /\\bmedical imaging\\b/i,
  /\\bsignal processing\\b/i,
  /\\bbiomedical signal\\b/i,
  /\\bdsp\\b/i,
  /\\baudio\\b/i,
  /\\bspeech\\b/i,
  /\\bacoustic\\b/i,
  /\\basr\\b/i,
  /\\btime series\\b/i,
  /\\bforecasting\\b/i,
  /\\bremote sensing\\b/i,
  /\\bgeospatial\\b/i,
  /\\bsatellite\\b/i,
  /\\bmultimodal\\b/i,
  /\\bscience des données\\b/i,
  /\\bscience des donnees\\b/i,
  /\\bapprentissage automatique\\b/i,
  /\\bintelligence artificielle\\b/i,
  /\\btraitement du signal\\b/i,
  /\\btraitement d['’]image\\b/i,
  /\\bimagerie médicale\\b/i,
  /\\bimagerie medicale\\b/i,
  /\\btélédétection\\b/i,
  /\\bteledetection\\b/i,
  /\\bséries temporelles\\b/i,
  /\\bseries temporelles\\b/i
];
`;

  text = replaceOnce(
    text,
    /(var OFF_TARGET_ROLE_PATTERNS_ = \[[\s\S]*?\n\];)/,
    `$1${strictConfig}`,
    "Apps Script strict scoring config"
  );

  text = replaceOnce(
    text,
    /function evaluateInternshipEligibility_\(candidate, evidence, classification\) \{[\s\S]*?\n\}\n\nfunction scoringClamp_/,
    `function scoringDurationCompatibility_(candidate, evidence) {
  var text = [
    candidate.role,
    candidate.contract,
    candidate.expectations,
    candidate.descriptionRaw,
    evidence.practicalText
  ].map(function(value) {
    return String(value || "");
  }).join(" ");

  var target=/\\b(?:5|6)\\s*[- ]?(?:month|months|mois)\\b|\\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\\b/i;
  if (target.test(text)) return { compatible:true, explicit:true };

  var any=/\\b(?:[1-9]|1[0-2])\\s*[- ]?(?:month|months|mois)\\b|\\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\\b/i;
  return { compatible:!any.test(text), explicit:any.test(text) };
}

function evaluateInternshipEligibility_(candidate, evidence, classification) {
  candidate = candidate || {};
  evidence = evidence || {};
  classification = classification || {};

  var contractText = [candidate.contract, candidate.type].map(function(value) {
    return String(value || "");
  }).join(" ");

  var wrongEmployment = scoringFirstMatch_(WRONG_EMPLOYMENT_PATTERNS_, contractText);
  if (wrongEmployment) {
    return {
      accepted: false,
      rejectionReason: "internship_type",
      rejectionSignals: [wrongEmployment]
    };
  }

  var internshipText = [candidate.role, candidate.contract].map(function(value) {
    return String(value || "");
  }).join(" ");
  var internshipSignal = scoringFirstMatch_(INTERNSHIP_POSITIVE_PATTERNS_, internshipText);
  if (!internshipSignal) {
    return {
      accepted: false,
      rejectionReason: "internship_type",
      rejectionSignals: []
    };
  }

  var duration = scoringDurationCompatibility_(candidate, evidence);
  if (!duration.compatible) {
    return {
      accepted: false,
      rejectionReason: "internship_duration",
      rejectionSignals: ["explicit_duration_outside_5_6_month_target"]
    };
  }

  var academic = scoringFirstMatch_(
    ACADEMIC_ORGANIZATION_PATTERNS_,
    String(evidence.organizationText || "")
  );
  if (academic) {
    return {
      accepted: false,
      rejectionReason: "academic_policy",
      rejectionSignals: [academic]
    };
  }

  var defense = scoringFirstMatch_(
    DEFENSE_PATTERNS_,
    String(evidence.organizationText || "") + " " + String(evidence.text || "")
  );
  if (defense) {
    return {
      accepted: false,
      rejectionReason: "defense_policy",
      rejectionSignals: [defense]
    };
  }

  var roleText = String(candidate.role || evidence.roleText || "");
  var offTarget = scoringFirstMatch_(
    STRICT_OFF_TARGET_ROLE_PATTERNS_,
    roleText
  );
  if (offTarget) {
    return {
      accepted: false,
      rejectionReason: "technical_alignment",
      rejectionSignals: [offTarget]
    };
  }

  var targetRole = scoringFirstMatch_(
    TARGET_TECHNICAL_ROLE_PATTERNS_,
    roleText
  );
  if (!targetRole) {
    return {
      accepted: false,
      rejectionReason: "technical_alignment",
      rejectionSignals: []
    };
  }

  if (!classification.domain || !classification.signals || !classification.signals.length) {
    return {
      accepted: false,
      rejectionReason: "technical_alignment",
      rejectionSignals: []
    };
  }

  return {
    accepted: true,
    rejectionReason: "",
    rejectionSignals: []
  };
}

function scoringClamp_`,
    "Apps Script strict eligibility"
  );

  fs.writeFileSync(path, text);
}

patchDashboardPolicy();
patchAppsDiscovery();
patchAppsScoring();
console.log("Strict M2 targeting patch applied.");
