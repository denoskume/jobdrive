import {
  PRIORITY_THRESHOLDS,
  SCORE_GRADES,
  SCORE_WEIGHTS,
  SCORING_VERSION,
} from "./scoringConfig.mjs";
import { collectScoringEvidence } from "./scoringEvidence.mjs";
import { classifyInternshipDomain } from "./domainClassifier.mjs";
import { evaluateEligibility } from "./eligibility.mjs";

function clamp(value, max) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function has(text, pattern) {
  return pattern.test(String(text || ""));
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function gradeForScore(score) {
  const numeric = Number(score || 0);
  return SCORE_GRADES.find(([min]) => numeric >= min)?.[1] || "D";
}

export function priorityForScore(score) {
  const numeric = Number(score || 0);
  return PRIORITY_THRESHOLDS.find(([min]) => numeric >= min)?.[1] || "Basse";
}

function alignmentScore(evidence, classification) {
  const text = evidence.technicalText;
  let score = 18 + classification.confidence * 0.24;

  if (has(text, /\b(model|algorithm|modèle|modele|segmentation|detection|signal)\b/i)) score += 2;
  if (has(text, /\b(train|training|fine[- ]?tun|experiment|evaluate|évaluer|evaluer)\w*/i)) score += 2;
  if (has(text, /\b(pytorch|tensorflow|jax|opencv|scikit[- ]learn)\b/i)) score += 2;

  return clamp(score, SCORE_WEIGHTS.alignment);
}

function technicalQualityScore(evidence) {
  const text = evidence.technicalText;
  let score = 2;

  if (
    has(text, /\b(design|develop|build|implement|train|fine[- ]?tun|concevoir|développer|developper|entraîner|entrainer)\w*/i) &&
    has(text, /\b(model|algorithm|pipeline|system|modèle|modele|algorithme)\w*/i)
  ) score += 4;

  if (has(text, /\b(experiment|evaluate|evaluation|benchmark|compare|validation|expériment|experiment|évalu|evalu)\w*/i)) score += 4;
  if (has(text, /\b(pipeline|deploy|deployment|production|mlops|serving|industrializ)\w*/i)) score += 4;
  if (has(text, /\b(r&d|research|scientific|industrial|recherche|scientifique)\b/i)) score += 3;
  if (has(text, /\b(python|pytorch|tensorflow|jax|opencv|sql|scikit[- ]learn)\b/i)) score += 3;

  return clamp(score, SCORE_WEIGHTS.technicalQuality);
}

function companyQualityScore(evidence) {
  const text = evidence.text;
  let score = 3;

  if (has(text, /\b(r&d|research|recherche|engineering|ingénierie|ingenierie)\b/i)) score += 4;
  if (has(text, /\b(team|équipe|equipe|mentor|mentorship|collaborat)\w*/i)) score += 3;
  if (has(text, /\b(industrial|industry|product|production|industriel|produit)\w*/i)) score += 4;
  if (has(text, /\b(deploy|deployment|customer|real[- ]world|terrain)\w*/i)) score += 2;

  return clamp(score, SCORE_WEIGHTS.companyQuality);
}

function practicalFitScore(candidate, evidence) {
  const text = evidence.practicalText;
  let score = 0;

  if (has(text, /\b(final[- ]year|master|msc|m2|fin d['’]études|fin d'etudes|pfe)\b/i)) score += 3;
  if (has(text, /\b(4|5|6)[ -]?(month|months|mois)\b|\bsix months\b|\bsix-month\b/i)) score += 2;
  if (has(String(candidate.location || ""), /france|paris|nantes|lyon|toulouse|bordeaux|grenoble|rennes|lille|marseille|montpellier|strasbourg|sophia antipolis/i)) score += 2;
  if (has(String(candidate.contract || ""), /intern|internship|stage|stagiaire/i)) score += 1;
  if (has(text, /\b(student|étudiant|etudiant|candidate|candidat)\b/i)) score += 1;
  if (has(text, /\b(january|february|march|janvier|février|fevrier|mars)\s+2027\b|\b2027\b/i)) score += 1;

  return clamp(score, SCORE_WEIGHTS.practicalFit);
}

function freshnessScore(candidate, now) {
  const posted = safeDate(candidate.postedDate);
  if (!posted) return 2;

  const current = now instanceof Date ? now : new Date(now || Date.now());
  const ageDays = Math.floor((current.getTime() - posted.getTime()) / 86400000);

  if (ageDays <= 7) return 5;
  if (ageDays <= 30) return 4;
  if (ageDays <= 90) return 3;
  return 1;
}

function compensationScore(candidate) {
  const text = String(candidate.compensation || "").trim().toLowerCase();
  if (!text) return 2;

  const numeric = Number((text.match(/\d+(?:[.,]\d+)?/) || [])[0]?.replace(",", "."));

  if (/\b(hour|hourly|\/h|heure)\b/i.test(text) && Number.isFinite(numeric)) {
    if (numeric >= 20) return 5;
    if (numeric >= 15) return 4;
    return 3;
  }

  if (/\b(month|monthly|\/month|mois|mensuel)\b/i.test(text) && Number.isFinite(numeric)) {
    if (numeric >= 1800) return 5;
    if (numeric >= 1000) return 4;
    return 3;
  }

  if (/paid|gratification|rémun|remuner|salary|salaire/i.test(text)) return 3;
  return 2;
}

function explanations(candidate, classification, breakdown) {
  const strengths = [];
  const weaknesses = [];

  strengths.push(`Strong ${classification.domain} alignment`);

  if (breakdown.technicalQuality >= 14) strengths.push("Hands-on model and experimentation work");
  else if (breakdown.technicalQuality >= 8) strengths.push("Meaningful technical responsibilities");

  if (breakdown.companyQuality >= 10) strengths.push("Credible engineering / R&D environment");
  if (breakdown.practicalFit >= 7) strengths.push("Strong final-year M2 compatibility");
  if (breakdown.freshness >= 4) strengths.push("Recently published opportunity");

  if (!String(candidate.compensation || "").trim()) weaknesses.push("Compensation not specified");
  if (!String(candidate.postedDate || "").trim()) weaknesses.push("Publication date not specified");
  if (!String(candidate.deadline || "").trim()) weaknesses.push("Application deadline not specified");
  if (!/\b(4|5|6)[ -]?(month|months|mois)\b|\bsix months\b/i.test(String(candidate.expectations || candidate.descriptionRaw || ""))) {
    weaknesses.push("Internship duration not clearly specified");
  }

  return { strengths, weaknesses };
}

export function scoreInternship(candidate = {}, { now = new Date() } = {}) {
  const evidence = collectScoringEvidence(candidate);
  const classification = classifyInternshipDomain(evidence);
  const eligibility = evaluateEligibility(candidate, evidence, classification);

  if (!eligibility.accepted) {
    return eligibility;
  }

  const scoreBreakdown = {
    alignment: alignmentScore(evidence, classification),
    technicalQuality: technicalQualityScore(evidence),
    companyQuality: companyQualityScore(evidence),
    practicalFit: practicalFitScore(candidate, evidence),
    freshness: freshnessScore(candidate, now),
    compensation: compensationScore(candidate),
  };

  const fitScore = Object.values(scoreBreakdown)
    .reduce((total, value) => total + value, 0);
  const { strengths, weaknesses } = explanations(candidate, classification, scoreBreakdown);

  return {
    accepted: true,
    fitScore,
    grade: gradeForScore(fitScore),
    priority: priorityForScore(fitScore),
    domain: classification.domain,
    whyRelevant: strengths.slice(0, 3).join(" · "),
    strengths,
    weaknesses,
    scoreBreakdown,
    scoringVersion: SCORING_VERSION,
  };
}
