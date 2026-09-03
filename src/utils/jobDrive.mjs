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

      companyDomain:
        String(row[23] || "").trim(),

      logoUrl:
        String(row[24] || "").trim(),
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
  /école/i,
  /ecole/i,

  /\bcnrs\b/i,
  /\binrae\b/i,
  /\binria\b/i,
  /\binsa\b/i,

  /\bumr\b/i,
  /\blaboratoire\b/i,
  /\blaboratory\b/i,
  /\bacademic lab\b/i,
  /\bresearch laboratory\b/i,
  /\bresearch institute\b/i,

  /\bcentrale nantes\b/i,
  /école centrale/i,
  /ecole centrale/i,
];

function internshipOrganizationText(job = {}) {
  return [
    job.company,
    job.role,
    job.domain,
    job.source,
    job.whyRelevant,
  ]
    .filter(Boolean)
    .join(" ");
}

export function isIndustryInternship(job = {}) {
  if (job.type !== "Stage M2") {
    return false;
  }

  const text = internshipOrganizationText(job);

  return !ACADEMIC_ORGANIZATION_PATTERNS.some(
    (pattern) => pattern.test(text)
  );
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
