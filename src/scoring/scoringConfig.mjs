export const SCORING_VERSION = "2.0";

export const SCORE_WEIGHTS = Object.freeze({
  alignment: 45,
  technicalQuality: 20,
  companyQuality: 15,
  practicalFit: 10,
  freshness: 5,
  compensation: 5,
});

export const SCORE_GRADES = Object.freeze([
  [90, "A"],
  [80, "B"],
  [75, "C"],
  [0, "D"],
]);

export const PRIORITY_THRESHOLDS = Object.freeze([
  [85, "Haute"],
  [75, "Moyenne"],
  [0, "Basse"],
]);

export const DOMAIN_RULES = Object.freeze([
  {
    domain: "Medical Imaging",
    signals: [
      /\bmedical imaging\b/i,
      /\bimagerie médicale\b/i,
      /\bimagerie medicale\b/i,
      /\bmri\b/i,
      /\birm\b/i,
      /\bct scan\b/i,
      /\bradiolog/i,
    ],
  },
  {
    domain: "Remote Sensing / Geospatial",
    signals: [
      /\bremote sensing\b/i,
      /\btélédétection\b/i,
      /\bteledetection\b/i,
      /\bsatellite\b/i,
      /\bgeospatial\b/i,
      /\bearth observation\b/i,
      /\bgeographic information\b/i,
    ],
  },
  {
    domain: "Audio / Speech",
    signals: [
      /\baudio\b/i,
      /\bspeech\b/i,
      /\basr\b/i,
      /\bacoustic/i,
      /\bparole\b/i,
      /\breconnaissance vocale\b/i,
    ],
  },
  {
    domain: "Biomedical Signal",
    signals: [
      /\bbiomedical signal/i,
      /\bsignal biomédical/i,
      /\bsignal biomedical/i,
      /\becg\b/i,
      /\beeg\b/i,
      /\bemg\b/i,
      /\bphysiological signal/i,
    ],
  },
  {
    domain: "Computer Vision",
    signals: [
      /\bcomputer vision\b/i,
      /\bvision artificielle\b/i,
      /\bobject detection\b/i,
      /\bvisual recognition\b/i,
      /\bvision model/i,
      /\bvisual perception\b/i,
    ],
  },
  {
    domain: "Image Processing",
    signals: [
      /\bimage processing\b/i,
      /\btraitement d['’]image/i,
      /\bimage enhancement\b/i,
      /\bimage analysis\b/i,
      /\bopencv\b/i,
    ],
  },
  {
    domain: "Signal Processing",
    signals: [
      /\bsignal processing\b/i,
      /\btraitement du signal\b/i,
      /\bspectral\b/i,
      /\btime[- ]frequency\b/i,
      /\bdsp\b/i,
      /\bsensor signal/i,
      /\bsensor fusion\b/i,
    ],
  },
  {
    domain: "Time Series",
    signals: [
      /\btime series\b/i,
      /\btime-series\b/i,
      /\bséries temporelles\b/i,
      /\bseries temporelles\b/i,
      /\bforecasting\b/i,
      /\bprévision temporelle\b/i,
    ],
  },
  {
    domain: "Multimodal AI",
    signals: [
      /\bmultimodal\b/i,
      /\bvision[- ]language\b/i,
      /\bvlm\b/i,
      /\bmultimodal ai\b/i,
    ],
  },
  {
    domain: "Representation Learning",
    signals: [
      /\brepresentation learning\b/i,
      /\bcontrastive learning\b/i,
      /\bself[- ]supervised\b/i,
      /\bembedding learning\b/i,
    ],
  },
  {
    domain: "Generative AI",
    signals: [
      /\bgenerative ai\b/i,
      /\bgenai\b/i,
      /\blarge language model/i,
      /\bllm\b/i,
      /\bdiffusion model/i,
    ],
  },
  {
    domain: "Deep Learning",
    signals: [
      /\bdeep learning\b/i,
      /\bneural network/i,
      /\btransformer/i,
      /\bcnn\b/i,
      /\brnn\b/i,
    ],
  },
  {
    domain: "Data Science",
    signals: [
      /\bdata science\b/i,
      /\bdata scientist\b/i,
      /\bstatistical model/i,
      /\bstatistical learning\b/i,
      /\bscience des données\b/i,
      /\bscience des donnees\b/i,
    ],
  },
  {
    domain: "Machine Learning",
    signals: [
      /\bmachine learning\b/i,
      /\bapprentissage automatique\b/i,
      /\bpytorch\b/i,
      /\btensorflow\b/i,
      /\bjax\b/i,
      /\bscikit[- ]learn\b/i,
      /\bml model/i,
    ],
  },
]);

export const WRONG_EMPLOYMENT_PATTERNS = Object.freeze([
  /\bcdi\b/i,
  /\bpermanent\b/i,
  /\balternance\b/i,
  /\bapprentice(ship)?\b/i,
  /\bph\.?d\b/i,
  /\bcifre\b/i,
  /\bpostdoc(toral)?\b/i,
]);

export const ACADEMIC_ORGANIZATION_PATTERNS = Object.freeze([
  /\buniversity\b/i,
  /\buniversité\b/i,
  /\buniversite\b/i,
  /\bcollege\b/i,
  /\bacademic lab/i,
  /\bresearch laboratory\b/i,
  /\blaboratoire\b/i,
  /\bdoctoral school\b/i,
  /\bécole doctorale\b/i,
  /\becole doctorale\b/i,
  /\bcnrs\b/i,
  /\binria\b/i,
  /\binrae\b/i,
  /\binserm\b/i,
]);

export const DEFENSE_PATTERNS = Object.freeze([
  /\bmilitary\b/i,
  /\bmilitaire\b/i,
  /\bdefen[cs]e\b/i,
  /\bdéfense\b/i,
  /\bmissile\b/i,
  /\bweapon\b/i,
  /\barmament\b/i,
  /\bcombat system\b/i,
  /\bguidance system\b/i,
]);

export const OFF_TARGET_ROLE_PATTERNS = Object.freeze([
  /\bpower bi\b/i,
  /\bbusiness intelligence\b/i,
  /\breporting (analyst|intern|stage)/i,
  /\berp\b/i,
  /\bsap consultant\b/i,
  /\bcyber ?security\b/i,
  /\bqa tester\b/i,
  /\bfrontend\b/i,
  /\bweb developer\b/i,
  /\bbusiness development\b/i,
  /\bmarketing\b/i,
]);
