const FRANCE = ["france","paris","nantes","lyon","toulouse","bordeaux","grenoble","sophia antipolis","lille","rennes","marseille","aix-en-provence","montpellier","strasbourg"];
const INTERN_POS = ["intern","internship","stage","stagiaire","final-year","final year","fin d'études","fin d’etudes","pfe","6-month","6 months"];
const INTERN_NEG = ["alternance","apprenticeship","apprenti","permanent","cdi","phd","cifre","postdoc","post-doctoral"];
const ACADEMIC_NEG = ["university","université","laboratory","laboratoire","cnrs","inria","doctoral school","école doctorale"];
const TECH_NEG = ["power bi","tableau dashboard","business intelligence","reporting analyst","erp","sap consultant","cybersecurity","qa tester"];
const FAMILIES = {
  "Machine Learning": ["machine learning","deep learning","pytorch","tensorflow","jax","representation learning","predictive modelling"],
  "Computer Vision": ["computer vision","image processing","opencv","segmentation","object detection","vision transformer"],
  "Signal Processing": ["signal processing","spectral","time-frequency","sensor signal","radar signal"],
  "Audio / Speech": ["speech","audio","acoustic","asr","speaker"],
  "Time Series": ["time series","forecasting","temporal model"],
  "Medical Imaging": ["medical imaging","biomedical signal","radiology"],
  "Remote Sensing": ["remote sensing","satellite","geospatial"],
  "Multimodal / GenAI": ["multimodal","vision-language","generative ai","large language model","llm"],
};
const text = (c) => `${c.role || ""} ${c.location || ""} ${c.country || ""} ${c.contract || ""} ${c.descriptionRaw || ""}`.toLowerCase();
export function isFranceCompatible(c = {}) {
  const t = text(c);
  if (/germany|berlin|spain|madrid|italy|milan|london|united kingdom|usa|united states/.test(t) && !FRANCE.some(x => t.includes(x))) return false;
  return FRANCE.some(x => t.includes(x));
}
export function isInternshipCompatible(c = {}) {
  const t = text(c);
  if (INTERN_NEG.some(x => t.includes(x))) return false;
  return INTERN_POS.some(x => t.includes(x));
}
export function isIndustryCompatible(c = {}) {
  const t = text(c);
  return !ACADEMIC_NEG.some(x => t.includes(x));
}
export function technicalAlignment(c = {}) {
  const t = text(c);
  if (TECH_NEG.some(x => t.includes(x))) return { accepted:false, score:0, family:"", signals:[] };
  let best = { accepted:false, score:0, family:"", signals:[] };
  for (const [family, words] of Object.entries(FAMILIES)) {
    const signals = words.filter(x => t.includes(x));
    const score = Math.min(100, signals.length * 28 + (signals.length ? 45 : 0));
    if (score > best.score) best = { accepted: score >= 70, score, family, signals };
  }
  return best;
}
export function evaluateEligibility(c = {}) {
  if (!/^https?:\/\//i.test(String(c.link || ""))) return { accepted:false, reason:"missing_url", technical:technicalAlignment(c) };
  if (!isFranceCompatible(c)) return { accepted:false, reason:"country", technical:technicalAlignment(c) };
  if (!isInternshipCompatible(c)) return { accepted:false, reason:"internship_type", technical:technicalAlignment(c) };
  if (!isIndustryCompatible(c)) return { accepted:false, reason:"academic_policy", technical:technicalAlignment(c) };
  const technical = technicalAlignment(c);
  if (!technical.accepted) return { accepted:false, reason:"technical_alignment", technical };
  return { accepted:true, reason:"accepted", technical };
}
