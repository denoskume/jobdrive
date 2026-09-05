const txt = (v) => String(v || "").toLowerCase();
export function scoreCandidate(candidate = {}, technical = {}) {
  const body = txt(`${candidate.role} ${candidate.descriptionRaw}`);
  const technicalPoints = Math.round(Math.max(0, Math.min(100, technical.score || 0)) * 0.4);
  const m2 = /final.?year|fin d['’]études|pfe|master|6.?month/.test(body) ? 20 : /intern|stage/.test(body) ? 14 : 0;
  const environment = /research|r&d|scientist|model|algorithm|ai|machine learning|vision|signal/.test(body) ? 15 : 8;
  const handsOn = /pytorch|tensorflow|jax|opencv|train|model|algorithm|experiment/.test(body) ? 10 : 4;
  const france = /france|paris|nantes|lyon|toulouse|bordeaux|grenoble|rennes|lille/.test(txt(candidate.location)) ? 10 : 5;
  const completeness = candidate.postedDate && candidate.descriptionRaw ? 5 : candidate.descriptionRaw ? 3 : 1;
  const fitScore = Math.max(0, Math.min(100, technicalPoints + m2 + environment + handsOn + france + completeness));
  const priority = fitScore >= 85 ? "Haute" : fitScore >= 75 ? "Moyenne" : "Basse";
  const whyRelevant = technical.family ? `${technical.family}: ${(technical.signals || []).slice(0, 4).join(", ") || "technical alignment"}` : "Technical alignment";
  return { fitScore, priority, whyRelevant };
}
