var SCORING_VERSION_ = "2.0";

var SCORE_WEIGHTS_ = {
  alignment: 45,
  technicalQuality: 20,
  companyQuality: 15,
  practicalFit: 10,
  freshness: 5,
  compensation: 5
};

var SCORE_GRADES_ = [
  [90, "A"],
  [80, "B"],
  [75, "C"],
  [0, "D"]
];

var PRIORITY_THRESHOLDS_ = [
  [85, "Haute"],
  [75, "Moyenne"],
  [0, "Basse"]
];

var SCORING_DOMAIN_RULES_ = [
  {
    domain: "Medical Imaging",
    signals: [
      /\bmedical imaging\b/i,
      /\bimagerie médicale\b/i,
      /\bimagerie medicale\b/i,
      /\bmri\b/i,
      /\birm\b/i,
      /\bct scan\b/i,
      /\bradiolog/i
    ]
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
      /\bgeographic information\b/i
    ]
  },
  {
    domain: "Audio / Speech",
    signals: [
      /\baudio\b/i,
      /\bspeech\b/i,
      /\basr\b/i,
      /\bacoustic/i,
      /\bparole\b/i,
      /\breconnaissance vocale\b/i
    ]
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
      /\bphysiological signal/i
    ]
  },
  {
    domain: "Computer Vision",
    signals: [
      /\bcomputer vision\b/i,
      /\bvision artificielle\b/i,
      /\bobject detection\b/i,
      /\bvisual recognition\b/i,
      /\bvision model/i,
      /\bvisual perception\b/i
    ]
  },
  {
    domain: "Image Processing",
    signals: [
      /\bimage processing\b/i,
      /\btraitement d['’]image/i,
      /\bimage enhancement\b/i,
      /\bimage analysis\b/i,
      /\bopencv\b/i
    ]
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
      /\bsensor fusion\b/i
    ]
  },
  {
    domain: "Time Series",
    signals: [
      /\btime series\b/i,
      /\btime-series\b/i,
      /\bséries temporelles\b/i,
      /\bseries temporelles\b/i,
      /\bforecasting\b/i,
      /\bprévision temporelle\b/i
    ]
  },
  {
    domain: "Multimodal AI",
    signals: [
      /\bmultimodal\b/i,
      /\bvision[- ]language\b/i,
      /\bvlm\b/i,
      /\bmultimodal ai\b/i
    ]
  },
  {
    domain: "Representation Learning",
    signals: [
      /\brepresentation learning\b/i,
      /\bcontrastive learning\b/i,
      /\bself[- ]supervised\b/i,
      /\bembedding learning\b/i
    ]
  },
  {
    domain: "Generative AI",
    signals: [
      /\bgenerative ai\b/i,
      /\bgenai\b/i,
      /\blarge language model/i,
      /\bllm\b/i,
      /\bdiffusion model/i
    ]
  },
  {
    domain: "Deep Learning",
    signals: [
      /\bdeep learning\b/i,
      /\bneural network/i,
      /\btransformer/i,
      /\bcnn\b/i,
      /\brnn\b/i
    ]
  },
  {
    domain: "Data Science",
    signals: [
      /\bdata science\b/i,
      /\bdata scientist\b/i,
      /\bstatistical model/i,
      /\bstatistical learning\b/i,
      /\bscience des données\b/i,
      /\bscience des donnees\b/i
    ]
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
      /\bml model/i
    ]
  }
];

var WRONG_EMPLOYMENT_PATTERNS_ = [
  /\bcdi\b/i,
  /\bpermanent\b/i,
  /\balternance\b/i,
  /\bapprentice(ship)?\b/i,
  /\bph\.?d\b/i,
  /\bcifre\b/i,
  /\bpostdoc(toral)?\b/i
];

var ACADEMIC_ORGANIZATION_PATTERNS_ = [
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
  /\binserm\b/i
];

var DEFENSE_PATTERNS_ = [
  /\bmilitary\b/i,
  /\bmilitaire\b/i,
  /\bdefen[cs]e\b/i,
  /\bdéfense\b/i,
  /\bmissile\b/i,
  /\bweapon\b/i,
  /\barmament\b/i,
  /\bcombat system\b/i,
  /\bguidance system\b/i
];

var OFF_TARGET_ROLE_PATTERNS_ = [
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
  /\bmarketing\b/i
];

var INTERNSHIP_POSITIVE_PATTERNS_ = [
  /\binternship\b/i,
  /\bintern\b/i,
  /\bstage\b/i,
  /\bstagiaire\b/i,
  /\bfin d['’]études\b/i,
  /\bfin d'etudes\b/i,
  /\bpfe\b/i
];

var STRICT_OFF_TARGET_ROLE_PATTERNS_ = OFF_TARGET_ROLE_PATTERNS_.concat([
  /\bcustomer success\b/i,
  /\bcustomer support\b/i,
  /\baccount (manager|executive)\b/i,
  /\bsales\b/i,
  /\bproduct (manager|management)\b/i,
  /\bfull[- ]?stack\b/i,
  /\bfront[- ]?end\b/i,
  /\bback[- ]?end\b/i,
  /\bmobile developer\b/i,
  /\bios developer\b/i,
  /\bandroid developer\b/i,
  /\bdevops\b/i,
  /\bsite reliability\b/i,
  /\bsre\b/i
]);

var TARGET_TECHNICAL_ROLE_PATTERNS_ = [
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
  /\bseries temporelles\b/i
];


function scoringClean_(value) {
  return String(value || "").trim();
}

function scoringJoin_(values) {
  return values.map(scoringClean_).filter(function(value) {
    return Boolean(value);
  }).join(" \n");
}

function collectScoringEvidence_(candidate) {
  candidate = candidate || {};
  var offerValues = [
    candidate.descriptionRaw,
    candidate.roleMission,
    candidate.mustHaveSkills,
    candidate.expectations,
    candidate.role,
    candidate.domain
  ];
  var text = scoringJoin_(offerValues).toLowerCase();

  return {
    text: text,
    organizationText: scoringJoin_([
      candidate.company,
      candidate.source,
      candidate.link
    ]).toLowerCase(),
    technicalText: text,
    practicalText: scoringJoin_([
      candidate.location,
      candidate.contract,
      candidate.expectations,
      candidate.descriptionRaw
    ]).toLowerCase(),
    roleText: scoringJoin_([
      candidate.role,
      candidate.mustHaveSkills
    ]).toLowerCase(),
    compensationText: scoringClean_(candidate.compensation).toLowerCase()
  };
}

function classifyInternshipDomain_(evidence) {
  evidence = evidence || {};
  var text = String(evidence.technicalText || evidence.text || "");
  var best = { domain: "", signals: [], confidence: 0 };

  SCORING_DOMAIN_RULES_.forEach(function(rule) {
    var signals = rule.signals.filter(function(pattern) {
      return pattern.test(text);
    }).map(function(pattern) {
      return pattern.source;
    });

    if (!signals.length) return;

    var confidence = Math.min(100, 45 + signals.length * 18);
    if (confidence > best.confidence) {
      best = {
        domain: rule.domain,
        signals: signals,
        confidence: confidence
      };
    }
  });

  return best;
}

function scoringFirstMatch_(patterns, text) {
  var pattern = patterns.find(function(item) {
    return item.test(text);
  });
  return pattern ? pattern.source : "";
}

function scoringDurationCompatibility_(candidate, evidence) {
  var text = [
    candidate.role,
    candidate.contract,
    candidate.expectations,
    candidate.descriptionRaw,
    evidence.practicalText
  ].map(function(value) {
    return String(value || "");
  }).join(" ");

  var target=/\b(?:5|6)\s*[- ]?(?:month|months|mois)\b|\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\b/i;
  if (target.test(text)) return { compatible:true, explicit:true };

  var any=/\b(?:[1-9]|1[0-2])\s*[- ]?(?:month|months|mois)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\b/i;
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

function scoringClamp_(value, max) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function scoringHas_(text, pattern) {
  return pattern.test(String(text || ""));
}

function scoringSafeDate_(value) {
  if (!value) return null;
  var date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function gradeForScore_(score) {
  var numeric = Number(score || 0);
  for (var i = 0; i < SCORE_GRADES_.length; i++) {
    if (numeric >= SCORE_GRADES_[i][0]) return SCORE_GRADES_[i][1];
  }
  return "D";
}

function priorityForScore_(score) {
  var numeric = Number(score || 0);
  for (var i = 0; i < PRIORITY_THRESHOLDS_.length; i++) {
    if (numeric >= PRIORITY_THRESHOLDS_[i][0]) return PRIORITY_THRESHOLDS_[i][1];
  }
  return "Basse";
}

function scoringAlignmentScore_(evidence, classification) {
  var text = evidence.technicalText;
  var score = 18 + classification.confidence * 0.24;

  if (scoringHas_(text, /\b(model|algorithm|modèle|modele|segmentation|detection|signal)\b/i)) score += 2;
  if (scoringHas_(text, /\b(train|training|fine[- ]?tun|experiment|evaluate|évaluer|evaluer)\w*/i)) score += 2;
  if (scoringHas_(text, /\b(pytorch|tensorflow|jax|opencv|scikit[- ]learn)\b/i)) score += 2;

  return scoringClamp_(score, SCORE_WEIGHTS_.alignment);
}

function scoringTechnicalQualityScore_(evidence) {
  var text = evidence.technicalText;
  var score = 2;

  if (
    scoringHas_(text, /\b(design|develop|build|implement|train|fine[- ]?tun|concevoir|développer|developper|entraîner|entrainer)\w*/i) &&
    scoringHas_(text, /\b(model|algorithm|pipeline|system|modèle|modele|algorithme)\w*/i)
  ) score += 4;

  if (scoringHas_(text, /\b(experiment|evaluate|evaluation|benchmark|compare|validation|expériment|experiment|évalu|evalu)\w*/i)) score += 4;
  if (scoringHas_(text, /\b(pipeline|deploy|deployment|production|mlops|serving|industrializ)\w*/i)) score += 4;
  if (scoringHas_(text, /\b(r&d|research|scientific|industrial|recherche|scientifique)\b/i)) score += 3;
  if (scoringHas_(text, /\b(python|pytorch|tensorflow|jax|opencv|sql|scikit[- ]learn)\b/i)) score += 3;

  return scoringClamp_(score, SCORE_WEIGHTS_.technicalQuality);
}

function scoringCompanyQualityScore_(evidence) {
  var text = evidence.text;
  var score = 3;

  if (scoringHas_(text, /\b(r&d|research|recherche|engineering|ingénierie|ingenierie)\b/i)) score += 4;
  if (scoringHas_(text, /\b(team|équipe|equipe|mentor|mentorship|collaborat)\w*/i)) score += 3;
  if (scoringHas_(text, /\b(industrial|industry|product|production|industriel|produit)\w*/i)) score += 4;
  if (scoringHas_(text, /\b(deploy|deployment|customer|real[- ]world|terrain)\w*/i)) score += 2;

  return scoringClamp_(score, SCORE_WEIGHTS_.companyQuality);
}

function scoringPracticalFitScore_(candidate, evidence) {
  var text = evidence.practicalText;
  var score = 0;

  if (scoringHas_(text, /\b(final[- ]year|master|msc|m2|fin d['’]études|fin d'etudes|pfe)\b/i)) score += 3;
  if (scoringHas_(text, /\b(4|5|6)[ -]?(month|months|mois)\b|\bsix months\b|\bsix-month\b/i)) score += 2;
  if (scoringHas_(String(candidate.location || ""), /france|paris|nantes|lyon|toulouse|bordeaux|grenoble|rennes|lille|marseille|montpellier|strasbourg|sophia antipolis/i)) score += 2;
  if (scoringHas_(String(candidate.contract || ""), /intern|internship|stage|stagiaire/i)) score += 1;
  if (scoringHas_(text, /\b(student|étudiant|etudiant|candidate|candidat)\b/i)) score += 1;
  if (scoringHas_(text, /\b(january|february|march|janvier|février|fevrier|mars)\s+2027\b|\b2027\b/i)) score += 1;

  return scoringClamp_(score, SCORE_WEIGHTS_.practicalFit);
}

function scoringFreshnessScore_(candidate, now) {
  var posted = scoringSafeDate_(candidate.postedDate);
  if (!posted) return 2;

  var current = now instanceof Date ? now : new Date(now || Date.now());
  var ageDays = Math.floor((current.getTime() - posted.getTime()) / 86400000);

  if (ageDays <= 7) return 5;
  if (ageDays <= 30) return 4;
  if (ageDays <= 90) return 3;
  return 1;
}

function scoringCompensationScore_(candidate) {
  var text = String(candidate.compensation || "").trim().toLowerCase();
  if (!text) return 2;

  var match = text.match(/\d+(?:[.,]\d+)?/);
  var numeric = match ? Number(match[0].replace(",", ".")) : NaN;

  if (/\b(hour|hourly|\/h|heure)\b/i.test(text) && isFinite(numeric)) {
    if (numeric >= 20) return 5;
    if (numeric >= 15) return 4;
    return 3;
  }

  if (/\b(month|monthly|\/month|mois|mensuel)\b/i.test(text) && isFinite(numeric)) {
    if (numeric >= 1800) return 5;
    if (numeric >= 1000) return 4;
    return 3;
  }

  if (/paid|gratification|rémun|remuner|salary|salaire/i.test(text)) return 3;
  return 2;
}

function scoringExplanations_(candidate, classification, breakdown) {
  var strengths = [];
  var weaknesses = [];

  strengths.push("Strong " + classification.domain + " alignment");

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

  return { strengths: strengths, weaknesses: weaknesses };
}

function scoreInternshipCandidate_(candidate, nowIso) {
  candidate = candidate || {};
  var evidence = collectScoringEvidence_(candidate);
  var classification = classifyInternshipDomain_(evidence);
  var eligibility = evaluateInternshipEligibility_(candidate, evidence, classification);

  if (!eligibility.accepted) return eligibility;

  var scoreBreakdown = {
    alignment: scoringAlignmentScore_(evidence, classification),
    technicalQuality: scoringTechnicalQualityScore_(evidence),
    companyQuality: scoringCompanyQualityScore_(evidence),
    practicalFit: scoringPracticalFitScore_(candidate, evidence),
    freshness: scoringFreshnessScore_(candidate, new Date(nowIso || Date.now())),
    compensation: scoringCompensationScore_(candidate)
  };

  var fitScore =
    scoreBreakdown.alignment +
    scoreBreakdown.technicalQuality +
    scoreBreakdown.companyQuality +
    scoreBreakdown.practicalFit +
    scoreBreakdown.freshness +
    scoreBreakdown.compensation;

  var explanations = scoringExplanations_(candidate, classification, scoreBreakdown);

  return {
    accepted: true,
    fitScore: fitScore,
    grade: gradeForScore_(fitScore),
    priority: priorityForScore_(fitScore),
    domain: classification.domain,
    whyRelevant: explanations.strengths.slice(0, 3).join(" · "),
    strengths: explanations.strengths,
    weaknesses: explanations.weaknesses,
    scoreBreakdown: scoreBreakdown,
    scoringVersion: SCORING_VERSION_
  };
}
