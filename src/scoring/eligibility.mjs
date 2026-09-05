import {
  ACADEMIC_ORGANIZATION_PATTERNS,
  DEFENSE_PATTERNS,
  OFF_TARGET_ROLE_PATTERNS,
  WRONG_EMPLOYMENT_PATTERNS,
} from "./scoringConfig.mjs";

const INTERNSHIP_POSITIVE_PATTERNS = [
  /\binternship\b/i, /\bintern\b/i, /\bstage\b/i, /\bstagiaire\b/i,
  /\bfin d['’]études\b/i, /\bfin d'etudes\b/i, /\bpfe\b/i,
];

const STRICT_OFF_TARGET_ROLE_PATTERNS = [
  ...OFF_TARGET_ROLE_PATTERNS,
  /\bcustomer success\b/i, /\bcustomer support\b/i,
  /\baccount (manager|executive)\b/i, /\bsales\b/i,
  /\bproduct (manager|management)\b/i, /\bfull[- ]?stack\b/i,
  /\bfront[- ]?end\b/i, /\bback[- ]?end\b/i, /\bmobile developer\b/i,
  /\bios developer\b/i, /\bandroid developer\b/i, /\bdevops\b/i,
  /\bsite reliability\b/i, /\bsre\b/i, /\bit (operations|support|workplace)\b/i,
  /\bfinance analyst\b/i,
];

const TARGET_TECHNICAL_ROLE_PATTERNS = [
  /\bdata scien(tist|ce)\b/i, /\bmachine learning\b/i,
  /\bml (engineer|research|scientist|intern)\b/i, /\bdeep learning\b/i,
  /\bartificial intelligence\b/i, /\bai (engineer|research|scientist|intern)\b/i,
  /\bgenerative ai\b/i, /\bgenai\b/i, /\bapplied scientist\b/i,
  /\bresearch scientist\b/i, /\bresearch engineer\b/i, /\bresearch intern\b/i,
  /\br&d intern\b/i, /\bcomputer vision\b/i, /\bperception\b/i,
  /\bimage processing\b/i, /\bmedical imaging\b/i, /\bsignal processing\b/i,
  /\bbiomedical signal\b/i, /\bdsp\b/i, /\baudio\b/i, /\bspeech\b/i,
  /\bacoustic\b/i, /\basr\b/i, /\btime series\b/i, /\bforecasting\b/i,
  /\bremote sensing\b/i, /\bgeospatial\b/i, /\bsatellite\b/i, /\bmultimodal\b/i,
  /\bquant(?:itative)? research\b/i, /\bscience des données\b/i,
  /\bscience des donnees\b/i, /\bapprentissage automatique\b/i,
  /\bintelligence artificielle\b/i, /\btraitement du signal\b/i,
  /\btraitement d['’]image\b/i, /\bimagerie médicale\b/i, /\bimagerie medicale\b/i,
  /\btélédétection\b/i, /\bteledetection\b/i, /\bséries temporelles\b/i,
  /\bseries temporelles\b/i,
];

const SUBSTANTIVE_TECHNICAL_MISSION_PATTERNS = [
  /\bdevelop(?:ing)? .*\b(model|models|algorithm|algorithms|pipeline|pipelines)\b/i,
  /\bdesign .*\b(model|models|algorithm|algorithms)\b/i,
  /\btrain(?:ing)? .*\bmodel/i, /\bevaluat(?:e|ing|ion).*\bmodel/i,
  /\bbenchmark .*\b(model|algorithm)/i, /\bstatistical model/i,
  /\bsensor fusion\b/i, /\bforecast(?:ing)?\b/i,
  /\bdévelopp(?:er|ement).*\b(modèle|modele|algorithme)/i,
  /\bconcevoir .*\b(modèle|modele|algorithme)/i,
];

const GENAI_TECHNICAL_PATTERNS = [
  /\bfine[- ]?tun/i, /\btrain(?:ing)?\b/i, /\bevaluat/i, /\bretrieval\b/i,
  /\brag\b/i, /\bagent (?:system|systems|framework)/i, /\bmodel serving\b/i,
  /\bembedding/i, /\binference\b/i,
];

function firstMatch(patterns, text) {
  const pattern = patterns.find((item) => item.test(text));
  return pattern ? pattern.source : "";
}

function internshipSignal(candidate = {}) {
  const fields = [
    ["title", candidate.role],
    ["contract", candidate.contract],
    ["description", candidate.descriptionRaw],
  ];
  for (const [name, value] of fields) {
    const pattern = INTERNSHIP_POSITIVE_PATTERNS.find((item) => item.test(String(value || "")));
    if (pattern) return `${name}:${String(value || "").match(pattern)?.[0]?.toLowerCase() || "match"}`;
  }
  return "";
}

function durationCompatibility(candidate = {}, evidence = {}) {
  const text = [candidate.role, candidate.contract, candidate.expectations, candidate.descriptionRaw, evidence.practicalText]
    .map((value) => String(value || "")).join(" ");

  const target = /\b(?:5|6)\s*[- ]?(?:month|months|mois)\b|\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\b/i;
  if (target.test(text)) return { compatible:true, explicit:true, evidence:/\b5\b/.test(text) ? "5_months" : "6_months" };

  const any = /\b(?:[1-9]|1[0-2])\s*[- ]?(?:month|months|mois)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\b/i;
  return { compatible:!any.test(text), explicit:any.test(text), evidence:any.test(text) ? "incompatible" : "unknown" };
}

export function evaluateEligibility(candidate = {}, evidence = {}, classification = {}) {
  const contractText = [candidate.role, candidate.contract, candidate.type]
    .map((value) => String(value || "")).join(" ");
  const wrongEmployment = firstMatch(WRONG_EMPLOYMENT_PATTERNS, contractText);
  if (wrongEmployment) return {accepted:false,rejectionReason:"internship_type",rejectionSignals:[wrongEmployment]};

  const internshipEvidence = internshipSignal(candidate);
  if (!internshipEvidence) return {accepted:false,rejectionReason:"internship_type",rejectionSignals:[]};

  const duration = durationCompatibility(candidate, evidence);
  if (!duration.compatible) return {accepted:false,rejectionReason:"internship_duration",rejectionSignals:["explicit_duration_outside_5_6_month_target"],durationEvidence:duration.evidence};

  const academic = firstMatch(ACADEMIC_ORGANIZATION_PATTERNS, String(evidence.organizationText || ""));
  if (academic) return {accepted:false,rejectionReason:"academic_policy",rejectionSignals:[academic]};

  const defense = firstMatch(DEFENSE_PATTERNS, `${evidence.organizationText || ""} ${evidence.text || ""}`);
  if (defense) return {accepted:false,rejectionReason:"defense_policy",rejectionSignals:[defense]};

  const roleText = String(candidate.role || evidence.roleText || "");
  const offTarget = firstMatch(STRICT_OFF_TARGET_ROLE_PATTERNS, roleText);
  if (offTarget) return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:[offTarget]};

  if (!classification.domain || !classification.signals?.length) {
    return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:[]};
  }

  const technicalText = String(evidence.technicalText || evidence.text || "");
  const targetRole = firstMatch(TARGET_TECHNICAL_ROLE_PATTERNS, roleText);
  const substantiveMission = firstMatch(SUBSTANTIVE_TECHNICAL_MISSION_PATTERNS, technicalText);
  if (!targetRole && !substantiveMission) {
    return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:[]};
  }

  if (classification.domain === "Generative AI") {
    const genaiTechnical = firstMatch(GENAI_TECHNICAL_PATTERNS, technicalText);
    if (!genaiTechnical) return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:["genai_without_technical_model_evidence"]};
  }

  return {
    accepted:true,
    rejectionReason:"",
    rejectionSignals:[],
    internshipEvidence,
    durationEvidence:duration.evidence,
  };
}
