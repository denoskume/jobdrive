var EVIDENCE_SUBSTANTIVE_MISSION_PATTERNS_ = [
  /\bdevelop(?:ing)? .*\b(model|models|algorithm|algorithms|pipeline|pipelines)\b/i,
  /\bdesign .*\b(model|models|algorithm|algorithms)\b/i,
  /\btrain(?:ing)? .*\bmodel/i,
  /\bevaluat(?:e|ing|ion).*\bmodel/i,
  /\bbenchmark .*\b(model|algorithm)/i,
  /\bstatistical model/i,
  /\bsensor fusion\b/i,
  /\bforecast(?:ing)?\b/i,
  /\bdévelopp(?:er|ement).*\b(modèle|modele|algorithme)/i,
  /\bconcevoir .*\b(modèle|modele|algorithme)/i
];

var EVIDENCE_GENAI_TECHNICAL_PATTERNS_ = [
  /\bfine[- ]?tun/i,
  /\btrain(?:ing)?\b/i,
  /\bevaluat/i,
  /\bretrieval\b/i,
  /\brag\b/i,
  /\bagent (?:system|systems|framework)/i,
  /\bmodel serving\b/i,
  /\bembedding/i,
  /\binference\b/i
];

var EVIDENCE_EXTRA_OFF_TARGET_PATTERNS_ = [
  /\bit (operations|support|workplace)\b/i,
  /\bfinance analyst\b/i
];

var EVIDENCE_DESCRIPTION_INTERNSHIP_PATTERNS_ = [
  /\binternship\b/i,
  /\bintern\b/i,
  /\bstagiaire\b/i,
  /\bfin d['’]études\b/i,
  /\bfin d'etudes\b/i,
  /\bpfe\b/i,
  /\bstage\s+(?:de\b|d['’]|en\b|chez\b|au\b|à\b|pour\b|fin\b|\d+\s*(?:mois|months?)\b)/i,
  /\b(?:ce|cet|un|une|notre|votre|le|la)\s+stage\b/i,
  /\b(?:offre|convention|durée|duree|période|periode)\s+(?:de|du)\s+stage\b/i
];

function scoringEvidenceInternshipSignal_(candidate) {
  var fields = [
    ["title", candidate.role, INTERNSHIP_POSITIVE_PATTERNS_],
    ["contract", candidate.contract, INTERNSHIP_POSITIVE_PATTERNS_],
    ["description", candidate.descriptionRaw, EVIDENCE_DESCRIPTION_INTERNSHIP_PATTERNS_]
  ];
  for (var i = 0; i < fields.length; i++) {
    var value = String(fields[i][1] || "");
    var patterns = fields[i][2];
    for (var j = 0; j < patterns.length; j++) {
      var match = value.match(patterns[j]);
      if (match) return fields[i][0] + ":" + String(match[0] || "match").toLowerCase();
    }
  }
  return "";
}

function scoringLocationEvidence_(candidate) {
  var location = [candidate.location, candidate.country].map(function(value){ return String(value || ""); }).join(" ").toLowerCase();
  if (/remote/.test(location) && /france/.test(location)) return "location:remote-france";
  if (/\bfrance\b/.test(String(candidate.country || "").toLowerCase())) return "country:france";
  if (/france|paris|nantes|lyon|toulouse|bordeaux|grenoble|sophia antipolis|lille|rennes|marseille|aix-en-provence|montpellier|strasbourg|corse|corsica|guadeloupe|martinique|guyane|french guiana|réunion|reunion|mayotte|polynésie française|polynesie francaise|nouvelle-calédonie|nouvelle-caledonie|saint-pierre-et-miquelon/.test(location)) return "location:france";
  return "";
}

function scoringTimingEvidence_(candidate) {
  var text = [candidate.role,candidate.contract,candidate.descriptionRaw,candidate.expectations].map(function(value){ return String(value || ""); }).join(" ").toLowerCase();
  if (/\b(?:january|janvier)\s+2027\b/i.test(text)) return "jan_2027";
  if (/\b(?:february|février|fevrier)\s+2027\b/i.test(text)) return "feb_2027";
  if (/\bflexible|negotiable|négociable|negociable\b/i.test(text)) return "flexible";
  return "unknown";
}

function scoringDurationEvidenceLabel_(candidate, evidence) {
  var text = [candidate.role,candidate.contract,candidate.expectations,candidate.descriptionRaw,evidence.practicalText].map(function(value){return String(value || "");}).join(" ");
  if (/\b5\s*[-–]\s*6\s*(?:month|months|mois)\b/i.test(text)) return "5_6_months";
  if (/\b5\s*[- ]?(?:month|months|mois)\b|\b(?:five|cinq)[ -]?(?:month|months|mois)\b/i.test(text)) return "5_months";
  if (/\b6\s*[- ]?(?:month|months|mois)\b|\b(?:six)[ -]?(?:month|months|mois)\b/i.test(text)) return "6_months";
  return "unknown";
}

function evaluateInternshipEligibilityEvidence_(candidate, evidence, classification) {
  candidate = candidate || {};
  evidence = evidence || {};
  classification = classification || {};

  var employmentText = [candidate.role, candidate.contract, candidate.type].map(String).join(" ");
  var wrongEmployment = scoringFirstMatch_(WRONG_EMPLOYMENT_PATTERNS_, employmentText);
  if (wrongEmployment) return {accepted:false,rejectionReason:"internship_type",rejectionSignals:[wrongEmployment]};

  var internshipEvidence = scoringEvidenceInternshipSignal_(candidate);
  if (!internshipEvidence) return {accepted:false,rejectionReason:"internship_type",rejectionSignals:[]};

  var duration = scoringDurationCompatibility_(candidate, evidence);
  if (!duration.compatible) return {accepted:false,rejectionReason:"internship_duration",rejectionSignals:["explicit_duration_outside_5_6_month_target"]};

  var academic = scoringFirstMatch_(ACADEMIC_ORGANIZATION_PATTERNS_, String(evidence.organizationText || ""));
  if (academic) return {accepted:false,rejectionReason:"academic_policy",rejectionSignals:[academic]};

  var defense = scoringFirstMatch_(DEFENSE_PATTERNS_, String(evidence.organizationText || "") + " " + String(evidence.text || ""));
  if (defense) return {accepted:false,rejectionReason:"defense_policy",rejectionSignals:[defense]};

  var roleText = String(candidate.role || evidence.roleText || "");
  var offTarget = scoringFirstMatch_(STRICT_OFF_TARGET_ROLE_PATTERNS_.concat(EVIDENCE_EXTRA_OFF_TARGET_PATTERNS_), roleText);
  if (offTarget) return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:[offTarget]};

  if (!classification.domain || !classification.signals || !classification.signals.length) {
    return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:[]};
  }

  var technicalText = String(evidence.technicalText || evidence.text || "");
  var targetRole = scoringFirstMatch_(TARGET_TECHNICAL_ROLE_PATTERNS_.concat([/\bquant(?:itative)? research\b/i]), roleText);
  var substantive = scoringFirstMatch_(EVIDENCE_SUBSTANTIVE_MISSION_PATTERNS_, technicalText);
  if (!targetRole && !substantive) return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:[]};

  if (classification.domain === "Generative AI") {
    var genaiTechnical = scoringFirstMatch_(EVIDENCE_GENAI_TECHNICAL_PATTERNS_, technicalText);
    if (!genaiTechnical) return {accepted:false,rejectionReason:"technical_alignment",rejectionSignals:["genai_without_technical_model_evidence"]};
  }

  return {
    accepted:true,
    rejectionReason:"",
    rejectionSignals:[],
    internshipEvidence:internshipEvidence,
    locationEvidence:scoringLocationEvidence_(candidate),
    durationEvidence:scoringDurationEvidenceLabel_(candidate, evidence),
    industryEvidence:"company",
    domainEvidence:classification.domain ? [classification.domain] : [],
    timingEvidence:scoringTimingEvidence_(candidate)
  };
}

function scoreInternshipCandidateEvidence_(candidate, nowIso) {
  candidate = candidate || {};
  var evidence = collectScoringEvidence_(candidate);
  var classification = classifyInternshipDomain_(evidence);
  var eligibility = evaluateInternshipEligibilityEvidence_(candidate, evidence, classification);
  if (!eligibility.accepted) return eligibility;

  var scoreBreakdown = {
    alignment: scoringAlignmentScore_(evidence, classification),
    technicalQuality: scoringTechnicalQualityScore_(evidence),
    companyQuality: scoringCompanyQualityScore_(evidence),
    practicalFit: scoringPracticalFitScore_(candidate, evidence),
    freshness: scoringFreshnessScore_(candidate, new Date(nowIso || Date.now())),
    compensation: scoringCompensationScore_(candidate)
  };
  var fitScore = scoreBreakdown.alignment + scoreBreakdown.technicalQuality + scoreBreakdown.companyQuality + scoreBreakdown.practicalFit + scoreBreakdown.freshness + scoreBreakdown.compensation;
  var explanations = scoringExplanations_(candidate, classification, scoreBreakdown);

  return {
    accepted:true,
    fitScore:fitScore,
    grade:gradeForScore_(fitScore),
    priority:priorityForScore_(fitScore),
    domain:classification.domain,
    whyRelevant:explanations.strengths.slice(0,3).join(" · "),
    strengths:explanations.strengths,
    weaknesses:explanations.weaknesses,
    scoreBreakdown:scoreBreakdown,
    scoringVersion:SCORING_VERSION_,
    internshipEvidence:eligibility.internshipEvidence,
    locationEvidence:eligibility.locationEvidence,
    durationEvidence:eligibility.durationEvidence,
    industryEvidence:eligibility.industryEvidence,
    domainEvidence:eligibility.domainEvidence,
    timingEvidence:eligibility.timingEvidence
  };
}
