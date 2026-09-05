const FRANCE = [
  "france",
  "paris",
  "nantes",
  "lyon",
  "toulouse",
  "bordeaux",
  "grenoble",
  "sophia antipolis",
  "lille",
  "rennes",
  "marseille",
  "aix-en-provence",
  "montpellier",
  "strasbourg",
];

const INTERNSHIP_POS = [
  /\binternship\b/i,
  /\bintern\b/i,
  /\bstage\b/i,
  /\bstagiaire\b/i,
  /\bfin d['’]études\b/i,
  /\bfin d'etudes\b/i,
  /\bpfe\b/i,
];

const INTERNSHIP_NEG = [
  /\balternance\b/i,
  /\bapprentice(ship)?\b/i,
  /\bapprenti(e)?\b/i,
  /\bpermanent\b/i,
  /\bfull[- ]?time\b/i,
  /\bcdi\b/i,
  /\bph\.?d\b/i,
  /\bcifre\b/i,
  /\bpostdoc(toral)?\b/i,
];

const ACADEMIC_NEG = [
  /\buniversity\b/i,
  /\buniversité\b/i,
  /\buniversite\b/i,
  /\blaboratory\b/i,
  /\blaboratoire\b/i,
  /\bcnrs\b/i,
  /\binria\b/i,
  /\binrae\b/i,
  /\binserm\b/i,
  /\bdoctoral school\b/i,
  /\bécole doctorale\b/i,
  /\becole doctorale\b/i,
];

const OFF_TARGET_ROLE = [
  /\bcustomer success\b/i,
  /\bcustomer support\b/i,
  /\baccount (manager|executive)\b/i,
  /\bsales\b/i,
  /\bbusiness development\b/i,
  /\bproduct (manager|management)\b/i,
  /\bfull[- ]?stack\b/i,
  /\bfront[- ]?end\b/i,
  /\bback[- ]?end\b/i,
  /\bweb developer\b/i,
  /\bmobile developer\b/i,
  /\bios developer\b/i,
  /\bandroid developer\b/i,
  /\bdevops\b/i,
  /\bsite reliability\b/i,
  /\bsre\b/i,
  /\bpower bi\b/i,
  /\btableau dashboard\b/i,
  /\bbusiness intelligence\b/i,
  /\breporting analyst\b/i,
  /\berp\b/i,
  /\bsap consultant\b/i,
  /\bcyber ?security\b/i,
  /\bqa tester\b/i,
  /\bmarketing\b/i,
];

const TARGET_ROLE = [
  /\bdata scien(tist|ce)\b/i,
  /\bmachine learning\b/i,
  /\bml (engineer|research|scientist|intern)\b/i,
  /\bdeep learning\b/i,
  /\bartificial intelligence\b/i,
  /\bai (engineer|research|scientist|intern)\b/i,
  /\bgenerative ai\b/i,
  /\bgenai\b/i,
  /\bapplied scientist\b/i,
  /\bresearch scientist\b/i,
  /\bresearch engineer\b/i,
  /\bresearch intern\b/i,
  /\br&d intern\b/i,
  /\bcomputer vision\b/i,
  /\bperception\b/i,
  /\bimage processing\b/i,
  /\bmedical imaging\b/i,
  /\bsignal processing\b/i,
  /\bbiomedical signal\b/i,
  /\bdsp\b/i,
  /\baudio\b/i,
  /\bspeech\b/i,
  /\bacoustic\b/i,
  /\basr\b/i,
  /\btime series\b/i,
  /\bforecasting\b/i,
  /\bremote sensing\b/i,
  /\bgeospatial\b/i,
  /\bsatellite\b/i,
  /\bmultimodal\b/i,
  /\bscience des données\b/i,
  /\bscience des donnees\b/i,
  /\bapprentissage automatique\b/i,
  /\bintelligence artificielle\b/i,
  /\btraitement du signal\b/i,
  /\btraitement d['’]image\b/i,
  /\bimagerie médicale\b/i,
  /\bimagerie medicale\b/i,
  /\btélédétection\b/i,
  /\bteledetection\b/i,
  /\bséries temporelles\b/i,
  /\bseries temporelles\b/i,
];

const FAMILIES = {
  "Machine Learning": [
    "machine learning",
    "deep learning",
    "pytorch",
    "tensorflow",
    "jax",
    "representation learning",
    "predictive modelling",
    "apprentissage automatique",
  ],
  "Computer Vision": [
    "computer vision",
    "image processing",
    "opencv",
    "segmentation",
    "object detection",
    "vision transformer",
    "traitement d'image",
    "traitement d’image",
  ],
  "Signal Processing": [
    "signal processing",
    "spectral",
    "time-frequency",
    "sensor signal",
    "radar signal",
    "traitement du signal",
  ],
  "Audio / Speech": ["speech", "audio", "acoustic", "asr", "speaker"],
  "Time Series": ["time series", "forecasting", "temporal model", "séries temporelles", "series temporelles"],
  "Medical Imaging": ["medical imaging", "biomedical signal", "radiology", "imagerie médicale", "imagerie medicale"],
  "Remote Sensing": ["remote sensing", "satellite", "geospatial", "télédétection", "teledetection"],
  "Multimodal / GenAI": ["multimodal", "vision-language", "generative ai", "large language model", "llm", "genai"],
};

const clean = (value) => String(value || "").trim();
const join = (...values) => values.map(clean).filter(Boolean).join(" ").toLowerCase();

const locationText = (candidate = {}) => join(candidate.location, candidate.country);
const internshipText = (candidate = {}) => join(candidate.role, candidate.contract);
const organizationText = (candidate = {}) => join(candidate.company, candidate.source, candidate.link);
const roleText = (candidate = {}) => join(candidate.role);
const technicalText = (candidate = {}) => join(
  candidate.role,
  candidate.descriptionRaw,
  candidate.roleMission,
  candidate.mustHaveSkills,
  candidate.expectations
);
const durationText = (candidate = {}) => join(
  candidate.role,
  candidate.contract,
  candidate.descriptionRaw,
  candidate.expectations
);

function hasAny(patterns, text) {
  return patterns.some((pattern) => pattern.test(text));
}

export function isFranceCompatible(candidate = {}) {
  const text = locationText(candidate);
  return FRANCE.some((place) => text.includes(place));
}

export function isInternshipCompatible(candidate = {}) {
  const text = internshipText(candidate);
  if (hasAny(INTERNSHIP_NEG, text)) return false;
  return hasAny(INTERNSHIP_POS, text);
}

export function isDurationCompatible(candidate = {}) {
  const text = durationText(candidate);

  const targetDuration =
    /\b(?:5|6)\s*[- ]?(?:month|months|mois)\b|\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\b/i;
  if (targetDuration.test(text)) return true;

  const anyDuration =
    /\b(?:[1-9]|1[0-2])\s*[- ]?(?:month|months|mois)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\b/i;

  return !anyDuration.test(text);
}

export function isIndustryCompatible(candidate = {}) {
  return !hasAny(ACADEMIC_NEG, organizationText(candidate));
}

export function technicalAlignment(candidate = {}) {
  const role = roleText(candidate);
  if (hasAny(OFF_TARGET_ROLE, role)) {
    return { accepted: false, score: 0, family: "", signals: [] };
  }

  if (!hasAny(TARGET_ROLE, role)) {
    return { accepted: false, score: 0, family: "", signals: [] };
  }

  const text = technicalText(candidate);
  let best = { accepted: false, score: 0, family: "", signals: [] };

  for (const [family, words] of Object.entries(FAMILIES)) {
    const signals = words.filter((word) => text.includes(word));
    const score = Math.min(100, signals.length * 28 + (signals.length ? 45 : 0));
    if (score > best.score) {
      best = { accepted: score >= 70, score, family, signals };
    }
  }

  return best;
}

export function evaluateEligibility(candidate = {}) {
  if (!/^https?:\/\//i.test(String(candidate.link || ""))) {
    return { accepted: false, reason: "missing_url", technical: technicalAlignment(candidate) };
  }
  if (!isFranceCompatible(candidate)) {
    return { accepted: false, reason: "country", technical: technicalAlignment(candidate) };
  }
  if (!isInternshipCompatible(candidate)) {
    return { accepted: false, reason: "internship_type", technical: technicalAlignment(candidate) };
  }
  if (!isDurationCompatible(candidate)) {
    return { accepted: false, reason: "internship_duration", technical: technicalAlignment(candidate) };
  }
  if (!isIndustryCompatible(candidate)) {
    return { accepted: false, reason: "academic_policy", technical: technicalAlignment(candidate) };
  }

  const technical = technicalAlignment(candidate);
  if (!technical.accepted) {
    return { accepted: false, reason: "technical_alignment", technical };
  }

  return { accepted: true, reason: "accepted", technical };
}
