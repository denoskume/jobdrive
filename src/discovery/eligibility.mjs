const FRANCE = [
  "france", "paris", "nantes", "lyon", "toulouse", "bordeaux", "grenoble",
  "sophia antipolis", "lille", "rennes", "marseille", "aix-en-provence",
  "montpellier", "strasbourg", "corse", "corsica", "guadeloupe", "martinique",
  "guyane", "french guiana", "réunion", "reunion", "mayotte", "polynésie française",
  "polynesie francaise", "nouvelle-calédonie", "nouvelle-caledonie", "saint-pierre-et-miquelon"
];

const INTERNSHIP_POS = [
  /\binternship\b/i, /\bintern\b/i, /\bstage\b/i, /\bstagiaire\b/i,
  /\bfin d['’]études\b/i, /\bfin d'etudes\b/i, /\bpfe\b/i,
];

const DESCRIPTION_INTERNSHIP_POS = [
  /\binternship\b/i, /\bintern\b/i, /\bstagiaire\b/i,
  /\bfin d['’]études\b/i, /\bfin d'etudes\b/i, /\bpfe\b/i,
  /\bstage\s+(?:de\b|d['’]|en\b|chez\b|au\b|à\b|a\b|pour\b|fin\b|\d+\s*(?:mois|months?)\b)/i,
  /\b(?:ce|cet|un|une|notre|votre|le|la)\s+stage\b/i,
  /\b(?:offre|convention|durée|duree|période|periode)\s+(?:de|du)\s+stage\b/i,
];

const INTERNSHIP_NEG = [
  /\balternance\b/i, /\bapprentice(ship)?\b/i, /\bapprenti(e)?\b/i,
  /\bpermanent\b/i, /\bcdi\b/i, /\bph\.?d\b/i, /\bcifre\b/i,
  /\bpostdoc(toral)?\b/i,
];

const ACADEMIC_NEG = [
  /\buniversity\b/i, /\buniversité\b/i, /\buniversite\b/i, /\blaboratory\b/i,
  /\blaboratoire\b/i, /\bcnrs\b/i, /\binria\b/i, /\binrae\b/i, /\binserm\b/i,
  /\bdoctoral school\b/i, /\bécole doctorale\b/i, /\becole doctorale\b/i,
];

const DEFENSE_NEG = [
  /\bmilitary\b/i, /\bmilitaire\b/i, /\bdefen[cs]e\b/i, /\bdéfense\b/i,
  /\bmissile\b/i, /\bweapon\b/i, /\barmament\b/i, /\bcombat system\b/i,
  /\bguidance system\b/i,
];

const OFF_TARGET_ROLE = [
  /\bcustomer success\b/i, /\bcustomer support\b/i, /\baccount (manager|executive)\b/i,
  /\bsales\b/i, /\bbusiness development\b/i, /\bproduct (manager|management)\b/i,
  /\bfull[- ]?stack\b/i, /\bfront[- ]?end\b/i, /\bback[- ]?end\b/i,
  /\bweb developer\b/i, /\bmobile developer\b/i, /\bios developer\b/i,
  /\bandroid developer\b/i, /\bdevops\b/i, /\bsite reliability\b/i, /\bsre\b/i,
  /\bpower bi\b/i, /\btableau dashboard\b/i, /\bbusiness intelligence\b/i,
  /\breporting analyst\b/i, /\berp\b/i, /\bsap consultant\b/i,
  /\bcyber ?security\b/i, /\bqa tester\b/i, /\bmarketing\b/i,
  /\bit (operations|support|workplace)\b/i, /\bfinance analyst\b/i,
];

const TARGET_ROLE = [
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

const SUBSTANTIVE_MISSION = [
  /\bdevelop(?:ing)? (?:and evaluate )?(?:machine learning|deep learning|vision|signal|statistical) (?:model|models|algorithm|algorithms)/i,
  /\bdévelopp(?:er|ement).*\b(?:modèle|modele|algorithme)/i,
  /\bmodel training\b/i, /\bmodel evaluation\b/i, /\balgorithm development\b/i,
  /\bsensor fusion\b/i, /\bstatistical model/i, /\btime[- ]series (?:model|forecast)/i,
  /\bsimulation and model(?:ing|ling)\b/i, /\btrain(?:ing)? .*\bmodel/i,
  /\bbenchmark .*\bmodel/i, /\bforecast(?:ing)?\b/i,
];

const GENAI_TECHNICAL = [
  /\bfine[- ]?tun/i, /\btrain(?:ing)?\b/i, /\bevaluat/i, /\bretrieval\b/i,
  /\brag\b/i, /\bagent (?:system|systems|framework)/i, /\bmodel serving\b/i,
  /\bembedding/i, /\binference\b/i,
];

const FAMILIES = {
  "Machine Learning": ["machine learning", "deep learning", "pytorch", "tensorflow", "jax", "representation learning", "predictive modelling", "predictive modeling", "apprentissage automatique"],
  "Computer Vision": ["computer vision", "image processing", "opencv", "segmentation", "object detection", "vision transformer", "traitement d'image", "traitement d’image"],
  "Signal Processing": ["signal processing", "spectral", "time-frequency", "sensor signal", "sensor fusion", "radar signal", "traitement du signal"],
  "Audio / Speech": ["speech", "audio", "acoustic", "asr", "speaker"],
  "Time Series": ["time series", "time-series", "forecasting", "temporal model", "séries temporelles", "series temporelles"],
  "Medical Imaging": ["medical imaging", "biomedical signal", "radiology", "imagerie médicale", "imagerie medicale"],
  "Remote Sensing": ["remote sensing", "satellite", "geospatial", "earth observation", "télédétection", "teledetection"],
  "Multimodal / GenAI": ["multimodal", "vision-language", "generative ai", "large language model", "llm", "genai", "rag", "embedding"],
  "Statistical / Scientific ML": ["statistical model", "statistical learning", "quant research", "quantitative research", "simulation", "scientific modeling", "scientific modelling"],
};

const clean = (value) => String(value || "").trim();
const join = (...values) => values.map(clean).filter(Boolean).join(" ").toLowerCase();
const hasAny = (patterns, text) => patterns.some((pattern) => pattern.test(text));

const locationText = (candidate = {}) => join(candidate.location, candidate.country);
const organizationText = (candidate = {}) => join(candidate.company, candidate.source, candidate.link);
const roleText = (candidate = {}) => join(candidate.role);
const technicalText = (candidate = {}) => join(candidate.role, candidate.descriptionRaw, candidate.roleMission, candidate.mustHaveSkills, candidate.expectations);
const durationText = (candidate = {}) => join(candidate.role, candidate.contract, candidate.descriptionRaw, candidate.expectations);

function firstPatternEvidence(patterns, value, prefix) {
  const found = patterns.find((pattern) => pattern.test(String(value || "")));
  if (!found) return "";
  const match = String(value || "").match(found);
  return `${prefix}:${String(match?.[0] || "match").toLowerCase()}`;
}

export function locationEvidence(candidate = {}) {
  const text = locationText(candidate);
  if (/remote/.test(text) && /france/.test(text)) return "location:remote-france";
  if (/\bfrance\b/.test(String(candidate.country || "").toLowerCase())) return "country:france";
  if (FRANCE.some((place) => text.includes(place))) return "location:france";
  return "";
}

export function isFranceCompatible(candidate = {}) {
  return Boolean(locationEvidence(candidate));
}

export function internshipEvidence(candidate = {}) {
  return firstPatternEvidence(INTERNSHIP_POS, candidate.role, "title") ||
    firstPatternEvidence(INTERNSHIP_POS, candidate.contract, "contract") ||
    firstPatternEvidence(DESCRIPTION_INTERNSHIP_POS, candidate.descriptionRaw, "description");
}

export function isInternshipCompatible(candidate = {}) {
  const all = join(candidate.role, candidate.contract, candidate.descriptionRaw);
  if (hasAny(INTERNSHIP_NEG, all)) return false;
  return Boolean(internshipEvidence(candidate));
}

export function durationEvidence(candidate = {}) {
  const text = durationText(candidate);
  if (/\b5\s*[-–]\s*6\s*(?:month|months|mois)\b/i.test(text)) return "5_6_months";
  if (/\b5\s*[- ]?(?:month|months|mois)\b|\b(?:five|cinq)[ -]?(?:month|months|mois)\b/i.test(text)) return "5_months";
  if (/\b6\s*[- ]?(?:month|months|mois)\b|\b(?:six)[ -]?(?:month|months|mois)\b/i.test(text)) return "6_months";
  return "unknown";
}

export function isDurationCompatible(candidate = {}) {
  const text = durationText(candidate);
  if (durationEvidence(candidate) !== "unknown") return true;
  const anyDuration = /\b(?:[1-9]|1[0-2])\s*[- ]?(?:month|months|mois)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\b/i;
  return !anyDuration.test(text);
}

export function isIndustryCompatible(candidate = {}) {
  return !hasAny(ACADEMIC_NEG, organizationText(candidate));
}

function matchedFamilies(candidate = {}) {
  const text = technicalText(candidate);
  return Object.entries(FAMILIES).map(([family, words]) => {
    const signals = words.filter((word) => text.includes(word));
    const score = Math.min(100, signals.length * 28 + (signals.length ? 45 : 0));
    return {family, signals, score};
  }).filter((item) => item.signals.length).sort((a, b) => b.score - a.score);
}

export function technicalAlignment(candidate = {}) {
  const role = roleText(candidate);
  const text = technicalText(candidate);
  if (hasAny(OFF_TARGET_ROLE, role)) return {accepted:false, score:0, family:"", signals:[], families:[]};

  const families = matchedFamilies(candidate);
  const best = families[0] || {family:"", signals:[], score:0};
  if (!best.signals.length) return {accepted:false, score:0, family:"", signals:[], families:[]};

  const directTarget = hasAny(TARGET_ROLE, role);
  const substantiveMission = hasAny(SUBSTANTIVE_MISSION, text);
  let accepted = best.score >= 70 && (directTarget || (best.score >= 63 && substantiveMission));

  const genAiPresent = /\bgenerative ai\b|\bgenai\b|\bllm\b|\blarge language model/i.test(text);
  if (genAiPresent && best.family === "Multimodal / GenAI" && !hasAny(GENAI_TECHNICAL, text)) accepted = false;

  return {accepted, score:best.score, family:best.family, signals:best.signals, families:families.map((item) => item.family)};
}

function timingEvidence(candidate = {}) {
  const text = join(candidate.role, candidate.contract, candidate.descriptionRaw, candidate.expectations);
  if (/\b(?:january|janvier)\s+2027\b/i.test(text)) return "jan_2027";
  if (/\b(?:february|février|fevrier)\s+2027\b/i.test(text)) return "feb_2027";
  if (/\bflexible|negotiable|négociable|negociable\b/i.test(text)) return "flexible";
  return "unknown";
}

function buildEvidence(candidate = {}, technical = technicalAlignment(candidate)) {
  return {
    internshipEvidence: internshipEvidence(candidate),
    locationEvidence: locationEvidence(candidate),
    durationEvidence: durationEvidence(candidate),
    industryEvidence: isIndustryCompatible(candidate) ? "company" : "",
    domainEvidence: technical.families || [],
    timingEvidence: timingEvidence(candidate),
  };
}

export function evaluateEligibility(candidate = {}) {
  const technical = technicalAlignment(candidate);
  const evidence = buildEvidence(candidate, technical);
  const allText = join(candidate.role, candidate.contract, candidate.descriptionRaw);

  if (!/^https?:\/\//i.test(String(candidate.link || ""))) return {accepted:false, reason:"missing_url", technical, evidence};
  if (!evidence.locationEvidence) return {accepted:false, reason:"country", technical, evidence};
  if (hasAny(INTERNSHIP_NEG, allText) || !evidence.internshipEvidence) return {accepted:false, reason:"internship_type", technical, evidence};
  if (!isDurationCompatible(candidate)) return {accepted:false, reason:"internship_duration", technical, evidence};
  if (!evidence.industryEvidence) return {accepted:false, reason:"academic_policy", technical, evidence};
  if (hasAny(DEFENSE_NEG, join(candidate.company, candidate.role, candidate.descriptionRaw))) return {accepted:false, reason:"defense_policy", technical, evidence};
  if (!technical.accepted) return {accepted:false, reason:"technical_alignment", technical, evidence};
  return {accepted:true, reason:"accepted", technical, evidence};
}
