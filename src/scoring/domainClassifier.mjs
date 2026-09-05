import { DOMAIN_RULES } from "./scoringConfig.mjs";

export function classifyInternshipDomain(evidence = {}) {
  const text = String(evidence.technicalText || evidence.text || "");
  let best = { domain: "", signals: [], confidence: 0 };

  for (const rule of DOMAIN_RULES) {
    const signals = rule.signals
      .filter((pattern) => pattern.test(text))
      .map((pattern) => pattern.source);

    if (!signals.length) continue;

    const confidence = Math.min(100, 45 + signals.length * 18);

    if (confidence > best.confidence) {
      best = {
        domain: rule.domain,
        signals,
        confidence,
      };
    }
  }

  return best;
}
