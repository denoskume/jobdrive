export const STATUS_OPTIONS = [
  "Nouveau",
  "À candidater",
  "Candidature envoyée",
  "Entretien",
  "Offre",
  "Accepté",
  "Refusé",
  "Expiré",
];

export const STATUS_LABELS = {
  Nouveau: "New",
  "À candidater": "To apply",
  "Candidature envoyée": "Applied",
  Entretien: "Interview",
  Offre: "Offer",
  Accepté: "Accepted",
  Refusé: "Rejected",
  Expiré: "Expired",
};

export function parseDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  if (
    !text ||
    /non indiqu|not specified|n\/a|unknown/i.test(text)
  ) {
    return null;
  }

  const french = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  );

  if (french) {
    const [, day, month, year] = french;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function toDateInput(value) {
  const date = parseDate(value);

  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dayStart(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function deadlineInfo(value, now = new Date()) {
  const deadline = parseDate(value);

  if (!deadline) {
    return {
      days: null,
      label: "No deadline",
      tone: "neutral",
    };
  }

  const delta =
    dayStart(deadline).getTime() -
    dayStart(now).getTime();

  const days = Math.round(delta / 86400000);

  if (days < 0) {
    return {
      days,
      label: "Expired",
      tone: "expired",
    };
  }

  if (days === 0) {
    return {
      days,
      label: "Today",
      tone: "critical",
    };
  }

  if (days === 1) {
    return {
      days,
      label: "Tomorrow",
      tone: "critical",
    };
  }

  if (days <= 7) {
    return {
      days,
      label: `${days} days left`,
      tone: "warning",
    };
  }

  return {
    days,
    label: `${days} days left`,
    tone: "normal",
  };
}

export function followUpInfo(value, now = new Date()) {
  const date = parseDate(value);

  if (!date) {
    return {
      days: null,
      label: "No follow-up",
      tone: "neutral",
    };
  }

  const delta =
    dayStart(date).getTime() -
    dayStart(now).getTime();

  const days = Math.round(delta / 86400000);

  if (days < 0) {
    return {
      days,
      label: "Follow-up overdue",
      tone: "critical",
    };
  }

  if (days === 0) {
    return {
      days,
      label: "Follow-up today",
      tone: "critical",
    };
  }

  if (days === 1) {
    return {
      days,
      label: "Follow-up tomorrow",
      tone: "warning",
    };
  }

  return {
    days,
    label: `Follow-up in ${days} days`,
    tone: "normal",
  };
}

function booleanValue(value) {
  if (typeof value === "boolean") return value;

  return ["true", "1", "yes", "oui"].includes(
    String(value ?? "")
      .trim()
      .toLowerCase()
  );
}

function parseJsonObject(value) {
  if (!value) return {};

  try {
    const parsed =
      typeof value === "string"
        ? JSON.parse(value)
        : value;

    return parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value) {
  if (!value) return [];

  try {
    const parsed =
      typeof value === "string"
        ? JSON.parse(value)
        : value;

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function normalizeJobs(values = []) {
  if (!Array.isArray(values) || values.length < 2) {
    return [];
  }

  return values
    .slice(1)
    .map((row, index) => ({
      rowNumber: index + 2,

      id: row[0] || "",
      type: row[1] || "",
      company: row[2] || "",
      role: row[3] || "",
      domain: row[4] || "",
      location: row[5] || "",
      mode: row[6] || "",
      contract: row[7] || "",
      compensation: row[8] || "",
      postedDate: row[9] || "",
      deadline: row[10] || "",

      status: row[11] || "Nouveau",
      priority: row[12] || "",
      fitScore: Number(row[13] || 0),

      whyRelevant: row[14] || "",
      link: row[15] || "",
      source: row[16] || "",
      detectedDate: row[17] || "",

      favorite: booleanValue(row[18]),
      appliedDate: row[19] || "",
      followUpDate: row[20] || "",
      notes: row[21] || "",
      lastUpdated: row[22] || "",

      // Real Google Sheet business columns:
      // X = DASSIP Score
      // Y = Entreprise & sujet score
      // Z = Risque validation Centrale
      dassipScore:
        Number(row[23] || 0),

      companySubjectScore:
        Number(row[24] || 0),

      validationRisk:
        String(row[25] || "").trim(),

      // Company identity is resolved from the company name
      // and official offer URL. X/Y must never feed logo metadata.
      companyDomain: "",
      logoUrl: "",

      descriptionRaw:
        String(row[26] || "").trim(),

      about:
        String(row[27] || "").trim(),

      roleMission:
        String(row[28] || "").trim(),

      expectations:
        String(row[29] || "").trim(),

      mustHaveSkills:
        String(row[30] || "").trim(),

      descriptionSource:
        String(row[31] || "").trim(),

      descriptionFetchedAt:
        String(row[32] || "").trim(),

      descriptionStatus:
        String(row[33] || "").trim(),

      scoreGrade:
        String(row[34] || "").trim(),

      scoreBreakdown:
        parseJsonObject(row[35]),

      scoringStrengths:
        parseJsonArray(row[36]),

      scoringWeaknesses:
        parseJsonArray(row[37]),

      scoringVersion:
        String(row[38] || "").trim(),

      scoringUpdatedAt:
        String(row[39] || "").trim(),

      lastFollowUp:
        String(row[40] || "").trim(),

      followUpCount:
        Number.isFinite(Number(row[41]))
          ? Number(row[41])
          : 0,

      actionPriority:
        String(row[42] || "").trim(),

      actionReason:
        String(row[43] || "").trim(),

      actionUpdatedAt:
        String(row[44] || "").trim(),
    }))
    .filter((job) => job.id);
}

export function calculateAnalytics(jobs = []) {
  const statusesApplied = new Set([
    "Candidature envoyée",
    "Entretien",
    "Offre",
    "Accepté",
  ]);

  const statusesInterview = new Set([
    "Entretien",
    "Offre",
    "Accepté",
  ]);

  const statusesOffer = new Set([
    "Offre",
    "Accepté",
  ]);

  const total = jobs.length;

  const applications = jobs.filter((job) =>
    statusesApplied.has(job.status)
  ).length;

  const interviews = jobs.filter((job) =>
    statusesInterview.has(job.status)
  ).length;

  const offers = jobs.filter((job) =>
    statusesOffer.has(job.status)
  ).length;

  const accepted = jobs.filter(
    (job) => job.status === "Accepté"
  ).length;

  return {
    total,

    internships: jobs.filter(
      (job) => job.type === "Stage M2"
    ).length,

    remote: jobs.filter(
      (job) => job.type === "Remote Job"
    ).length,

    highPriority: jobs.filter(
      (job) => job.priority === "Haute"
    ).length,

    favorites: jobs.filter(
      (job) => job.favorite
    ).length,

    applications,
    interviews,
    offers,
    accepted,

    applicationRate:
      total > 0
        ? Math.round((applications / total) * 100)
        : 0,

    interviewRate:
      applications > 0
        ? Math.round((interviews / applications) * 100)
        : 0,

    offerRate:
      interviews > 0
        ? Math.round((offers / interviews) * 100)
        : 0,
  };
}

export function sourceAnalytics(jobs = []) {
  const map = new Map();

  for (const job of jobs) {
    const source = job.source || "Unknown";

    map.set(
      source,
      (map.get(source) || 0) + 1
    );
  }

  return [...map.entries()]
    .map(([source, count]) => ({
      source,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || "New";
}

export function addDaysISO(value, amount) {
  const base = value
    ? new Date(value)
    : new Date();

  base.setDate(base.getDate() + amount);

  return toDateInput(base);
}

const ACADEMIC_ORGANIZATION_PATTERNS = [
  /\buniversity\b/i,
  /université/i,
  /universite/i,
  /\bcollege\b/i,
  /\bfaculty\b/i,
  /faculté/i,
  /faculte/i,
  /\bgraduate school\b/i,
  /\bécole\b/i,
  /\becole\b/i,

  /\bcnrs\b/i,
  /\binrae\b/i,
  /\binria\b/i,
  /\binserm\b/i,
  /\binsa\b/i,

  /\bumr\b/i,
  /\blaboratoire\b/i,
  /\blaboratory\b/i,
  /\bacademic lab\b/i,
  /\bresearch laboratory\b/i,

  /\binstitut curie\b/i,
  /\binstitut imagine\b/i,
  /\binstitut pasteur\b/i,

  /\bcentre de recherche\b/i,
  /\bcenter for research\b/i,
  /\bresearch center\b/i,
  /\bresearch centre\b/i,

  /\bfondation.*recherche\b/i,
  /\bresearch foundation\b/i,

  /\bchu\b/i,
  /\bcentre hospitalier universitaire\b/i,
  /\buniversity hospital\b/i,

  /\bcentrale nantes\b/i,
  /\bécole centrale\b/i,
  /\becole centrale\b/i,
];


const ALIGNED_INTERNSHIP_PATTERNS = [
  /\bdata science\b/i,
  /\bdata scientist\b/i,

  /\bmachine learning\b/i,
  /\bml\b/i,
  /\bdeep learning\b/i,
  /\bneural network/i,

  /\bartificial intelligence\b/i,
  /\bai\b/i,
  /\bgenerative ai\b/i,
  /\bmultimodal\b/i,
  /\brepresentation learning\b/i,
  /\bcontrastive learning\b/i,
  /\bself[- ]supervised\b/i,

  /\bcomputer vision\b/i,
  /\bvision artificielle\b/i,
  /\bimage processing\b/i,
  /\bimage analysis\b/i,
  /\bimage segmentation\b/i,
  /\bobject detection\b/i,
  /\bperception\b/i,
  /\bmedical imaging\b/i,
  /\bimagerie médicale\b/i,
  /\bimagerie medicale\b/i,

  /\bsignal processing\b/i,
  /\bsignal analysis\b/i,
  /\bdigital signal\b/i,
  /\bbiomedical signal/i,
  /\bsignal biomédical/i,
  /\bsignal biomedical/i,
  /\b(ecg|eeg|emg)\b/i,

  /\baudio processing\b/i,
  /\baudio analysis\b/i,
  /\bspeech processing\b/i,
  /\bspeech recognition\b/i,
  /\bacoustic/i,

  /\btime series\b/i,
  /\btime-series\b/i,

  /\bremote sensing\b/i,
  /\bgeospatial\b/i,
  /\bsatellite\b/i,
  /\btélédétection\b/i,
  /\bteledetection\b/i,

  /\bstatistical learning\b/i,
  /\bstatistical analysis\b/i,
  /\bpattern recognition\b/i,

  /\bnatural language processing\b/i,
  /\bnlp\b/i,
];


function internshipOrganizationText(job = {}) {
  return [
    job.company,
    job.source,
    job.companyDomain,
    job.link,
  ]
    .filter(Boolean)
    .join(" ");
}


function internshipTechnicalText(job = {}) {
  return [
    job.role,
    job.domain,
    job.whyRelevant,
    job.notes,
  ]
    .filter(Boolean)
    .join(" ");
}


export function isAcademicOrganization(job = {}) {
  const text = internshipOrganizationText(job);

  return ACADEMIC_ORGANIZATION_PATTERNS.some(
    (pattern) => pattern.test(text)
  );
}


export function isAlignedInternship(job = {}) {
  const text = internshipTechnicalText(job);

  return ALIGNED_INTERNSHIP_PATTERNS.some(
    (pattern) => pattern.test(text)
  );
}


export function isIndustryInternship(job = {}) {
  if (job.type !== "Stage M2") {
    return false;
  }

  if (isAcademicOrganization(job)) {
    return false;
  }

  return isAlignedInternship(job);
}


export function filterInternships(jobs = []) {
  return jobs.filter(isIndustryInternship);
}


export function internshipSpecializations(jobs = []) {
  return [
    ...new Set(
      filterInternships(jobs)
        .map((job) =>
          String(job.domain || "").trim()
        )
        .filter(Boolean)
    ),
  ].sort((a, b) =>
    a.localeCompare(b)
  );
}

function sortableDate(value, missingValue) {
  const date = parseDate(value);

  return date
    ? date.getTime()
    : missingValue;
}

export function sortInternships(
  jobs = [],
  mode = "newest"
) {
  const result = [...jobs];

  const priorityOrder = {
    Haute: 0,
    Moyenne: 1,
    Basse: 2,
  };

  return result.sort((a, b) => {
    if (mode === "recommended") {
      const scoreDelta =
        Number(b.fitScore || 0) -
        Number(a.fitScore || 0);

      if (scoreDelta) return scoreDelta;

      const priorityDelta =
        (priorityOrder[a.priority] ?? 99) -
        (priorityOrder[b.priority] ?? 99);

      if (priorityDelta) return priorityDelta;

      const deadlineA = sortableDate(
        a.deadline,
        Number.POSITIVE_INFINITY
      );
      const deadlineB = sortableDate(
        b.deadline,
        Number.POSITIVE_INFINITY
      );

      if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB;
      }

      const postedA = sortableDate(
        a.postedDate,
        Number.NEGATIVE_INFINITY
      );
      const postedB = sortableDate(
        b.postedDate,
        Number.NEGATIVE_INFINITY
      );

      if (postedA !== postedB) {
        return postedB - postedA;
      }

      return (
        sortableDate(
          b.detectedDate,
          Number.NEGATIVE_INFINITY
        ) -
        sortableDate(
          a.detectedDate,
          Number.NEGATIVE_INFINITY
        )
      );
    }

    if (mode === "deadline") {
      return (
        sortableDate(
          a.deadline,
          Number.POSITIVE_INFINITY
        ) -
        sortableDate(
          b.deadline,
          Number.POSITIVE_INFINITY
        )
      );
    }

    if (mode === "match") {
      return (
        Number(b.fitScore || 0) -
        Number(a.fitScore || 0)
      );
    }

    if (mode === "priority") {
      return (
        (priorityOrder[a.priority] ?? 99) -
        (priorityOrder[b.priority] ?? 99)
      );
    }

    if (mode === "company") {
      return String(
        a.company || ""
      ).localeCompare(
        String(b.company || "")
      );
    }

    return (
      sortableDate(
        b.postedDate,
        Number.NEGATIVE_INFINITY
      ) -
      sortableDate(
        a.postedDate,
        Number.NEGATIVE_INFINITY
      )
    );
  });
}
