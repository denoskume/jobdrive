import test from "node:test";
import assert from "node:assert/strict";
import * as jobDrive from "../src/utils/jobDrive.mjs";

import {
  calculateAnalytics,
  deadlineInfo,
  normalizeJobs,
  toDateInput,
} from "../src/utils/jobDrive.mjs";

test("normalizes Google Sheet rows including Pro fields", () => {
  const values = [
    [
      "ID",
      "Type",
      "Entreprise / Organisation",
      "Poste / Stage",
      "Domaine",
      "Localisation",
      "Mode",
      "Contrat",
      "Rémunération",
      "Date publication",
      "Deadline",
      "Statut",
      "Priorité",
      "Score adéquation",
      "Pourquoi pertinent",
      "Lien officiel",
      "Source",
      "Détecté le",
      "Favorite",
      "Applied Date",
      "Follow-up Date",
      "Notes",
      "Last Updated",
    ],
    [
      "RJ-001",
      "Remote Job",
      "Example AI",
      "AI Evaluator",
      "AI Evaluation",
      "France",
      "Remote",
      "Freelance",
      "€20/h",
      "2026-08-25",
      "2026-09-10",
      "Nouveau",
      "Haute",
      "96",
      "Excellent match",
      "https://example.com",
      "Official",
      "2026-08-26",
      "TRUE",
      "",
      "",
      "Review carefully",
      "",
    ],
  ];

  const jobs = normalizeJobs(values);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].id, "RJ-001");
  assert.equal(jobs[0].company, "Example AI");
  assert.equal(jobs[0].fitScore, 96);
  assert.equal(jobs[0].favorite, true);
  assert.equal(jobs[0].notes, "Review carefully");
});

test("deadlineInfo reports a future deadline", () => {
  const result = deadlineInfo(
    "2026-08-30",
    new Date("2026-08-26T12:00:00")
  );

  assert.equal(result.days, 4);
  assert.equal(result.label, "4 days left");
  assert.equal(result.tone, "warning");
});

test("deadlineInfo reports expired deadlines", () => {
  const result = deadlineInfo(
    "2026-08-20",
    new Date("2026-08-26T12:00:00")
  );

  assert.equal(result.label, "Expired");
  assert.equal(result.tone, "expired");
});

test("toDateInput returns YYYY-MM-DD", () => {
  assert.equal(toDateInput("2026-09-04T12:00:00Z"), "2026-09-04");
});

test("analytics calculates application funnel", () => {
  const jobs = [
    { type: "Remote Job", priority: "Haute", status: "Candidature envoyée" },
    { type: "Stage M2", priority: "Haute", status: "Entretien" },
    { type: "Stage M2", priority: "Moyenne", status: "Offre" },
    { type: "Remote Job", priority: "Basse", status: "Nouveau" },
  ];

  const analytics = calculateAnalytics(jobs);

  assert.equal(analytics.total, 4);
  assert.equal(analytics.remote, 2);
  assert.equal(analytics.internships, 2);
  assert.equal(analytics.applications, 3);
  assert.equal(analytics.interviews, 2);
  assert.equal(analytics.offers, 1);
});


test("filterInternships keeps only industry M2 internships", () => {
  const jobs = [
    {
      id: "AIRBUS",
      type: "Stage M2",
      company: "Airbus",
      role: "Computer Vision Intern",
      domain: "Computer Vision",
    },
    {
      id: "ALSTOM",
      type: "Stage M2",
      company: "Alstom",
      role: "R&D Machine Learning Intern",
      domain: "Machine Learning",
    },
    {
      id: "CNRS",
      type: "Stage M2",
      company: "CNRS",
      role: "Machine Learning Internship",
    },
    {
      id: "UNIVERSITY",
      type: "Stage M2",
      company: "Nantes Université",
      role: "Computer Vision Intern",
    },
    {
      id: "LAB",
      type: "Stage M2",
      company: "University Research Laboratory",
      role: "Image Processing Internship",
    },
    {
      id: "RJ-1",
      type: "Remote Job",
      company: "Technology Company",
    },
  ];

  const result = jobDrive.filterInternships?.(jobs);

  assert.deepEqual(
    result?.map((job) => job.id),
    ["AIRBUS", "ALSTOM"]
  );
});

test("industry R&D internships are not mistaken for academic labs", () => {
  const jobs = [
    {
      id: "INDUSTRIAL-RD",
      type: "Stage M2",
      company: "Safran",
      role: "R&D Computer Vision Intern",
      domain: "Image Processing",
      whyRelevant:
        "Applied research on industrial inspection systems",
    },
    {
      id: "ACADEMIC-RD",
      type: "Stage M2",
      company: "Université de Nantes",
      role: "R&D Computer Vision Intern",
      domain: "Image Processing",
    },
  ];

  assert.deepEqual(
    jobDrive.filterInternships(jobs).map(
      (job) => job.id
    ),
    ["INDUSTRIAL-RD"]
  );
});


test("academic institutes are excluded from internship tracking", () => {
  const jobs = [
    {
      id: "INRAE",
      type: "Stage M2",
      company: "INRAE",
    },
    {
      id: "INRIA",
      type: "Stage M2",
      company: "Inria",
    },
    {
      id: "UMR",
      type: "Stage M2",
      company: "UMR 1234",
    },
    {
      id: "COMPANY",
      type: "Stage M2",
      company: "Valeo",
      role: "Computer Vision Intern",
      domain: "Computer Vision / Deep Learning",
    },
  ];

  assert.deepEqual(
    jobDrive.filterInternships(jobs).map(
      (job) => job.id
    ),
    ["COMPANY"]
  );
});


test("internshipSpecializations returns unique sorted domains", () => {
  const jobs = [
    { type: "Stage M2", domain: "Machine Learning" },
    { type: "Stage M2", domain: "Computer Vision" },
    { type: "Stage M2", domain: "Machine Learning" },
    { type: "Remote Job", domain: "AI Evaluation" },
  ];

  assert.deepEqual(
    jobDrive.internshipSpecializations?.(jobs),
    ["Computer Vision", "Machine Learning"]
  );
});

test("sortInternships sorts newest publication first and missing dates last", () => {
  const jobs = [
    { id: "old", postedDate: "2026-08-20" },
    { id: "missing", postedDate: "" },
    { id: "new", postedDate: "2026-08-29" },
  ];

  const result = jobDrive.sortInternships?.(
    jobs,
    "newest"
  );

  assert.deepEqual(
    result?.map((job) => job.id),
    ["new", "old", "missing"]
  );
});

test("sortInternships supports deadline, match, priority and company", () => {
  const jobs = [
    {
      id: "B",
      company: "Beta",
      deadline: "2026-09-15",
      fitScore: 92,
      priority: "Moyenne",
    },
    {
      id: "A",
      company: "Alpha",
      deadline: "2026-09-05",
      fitScore: 97,
      priority: "Haute",
    },
    {
      id: "C",
      company: "Gamma",
      deadline: "",
      fitScore: 88,
      priority: "Basse",
    },
  ];

  for (const mode of [
    "deadline",
    "match",
    "priority",
    "company",
  ]) {
    assert.deepEqual(
      jobDrive
        .sortInternships?.(jobs, mode)
        ?.map((job) => job.id),
      ["A", "B", "C"]
    );
  }
});

test("normalizes real business columns without treating them as logo metadata", () => {
  const headers = Array.from(
    { length: 26 },
    (_, index) => `column-${index}`
  );

  const row = Array(26).fill("");

  row[0] = "identity-1";
  row[1] = "Stage M2";
  row[2] = "Example Company";
  row[3] = "AI Internship";

  row[23] = "97";
  row[24] = "92";
  row[25] = "Faible";

  const [job] = normalizeJobs([
    headers,
    row,
  ]);

  assert.equal(job.dassipScore, 97);
  assert.equal(job.companySubjectScore, 92);
  assert.equal(job.validationRisk, "Faible");

  assert.equal(job.companyDomain, "");
  assert.equal(job.logoUrl, "");
});


test("company identity metadata defaults safely", () => {
  const headers = Array.from(
    { length: 25 },
    (_, index) => `column-${index}`
  );

  const row = Array(25).fill("");

  row[0] = "identity-2";
  row[1] = "Stage M2";
  row[2] = "Unknown Company";
  row[3] = "Internship";

  const [job] = normalizeJobs([
    headers,
    row,
  ]);

  assert.equal(
    job.companyDomain,
    ""
  );

  assert.equal(
    job.logoUrl,
    ""
  );
});

test("strict policy excludes academic and institutional research internships", () => {
  const jobs = [
    {
      id: "CURIE",
      type: "Stage M2",
      company: "Institut Curie Centre de Recherche / Institut Imagine",
      role: "Analysis of X Chromosome Inactivation in Single-Cell Data",
      domain: "Data Science / Statistical Analysis",
      whyRelevant: "Single-cell data analysis",
    },
    {
      id: "INSERM",
      type: "Stage M2",
      company: "INSERM",
      role: "Machine Learning Intern",
      domain: "Machine Learning",
    },
    {
      id: "PASTEUR",
      type: "Stage M2",
      company: "Institut Pasteur",
      role: "AI Research Internship",
      domain: "Artificial Intelligence",
    },
    {
      id: "IMAGINE",
      type: "Stage M2",
      company: "Institut Imagine",
      role: "Data Science Intern",
      domain: "Data Science",
    },
    {
      id: "CHU",
      type: "Stage M2",
      company: "CHU Nantes - Centre de Recherche",
      role: "Medical Image Processing Intern",
      domain: "Image Processing",
    },
    {
      id: "AIRBUS",
      type: "Stage M2",
      company: "Airbus",
      role: "R&D Computer Vision Intern",
      domain: "Computer Vision / Deep Learning",
    },
  ];

  assert.deepEqual(
    jobDrive.filterInternships(jobs).map((job) => job.id),
    ["AIRBUS"]
  );
});


test("strict policy keeps aligned industrial R&D internships", () => {
  const jobs = [
    {
      id: "SAFRAN",
      type: "Stage M2",
      company: "Safran",
      role: "Research Internship - Image Processing",
      domain: "Computer Vision",
      whyRelevant: "Applied research for industrial inspection",
    },
    {
      id: "ALSTOM",
      type: "Stage M2",
      company: "Alstom",
      role: "Machine Learning Intern",
      domain: "Signal Processing / Predictive Maintenance",
    },
    {
      id: "SCHNEIDER",
      type: "Stage M2",
      company: "Schneider Electric",
      role: "AI Intern",
      domain: "Artificial Intelligence",
    },
    {
      id: "VALEO",
      type: "Stage M2",
      company: "Valeo",
      role: "Perception Intern",
      domain: "Computer Vision / Deep Learning",
    },
  ];

  assert.deepEqual(
    jobDrive.filterInternships(jobs).map((job) => job.id),
    ["SAFRAN", "ALSTOM", "SCHNEIDER", "VALEO"]
  );
});


test("strict policy rejects industry internships outside DASSIP core", () => {
  const jobs = [
    {
      id: "WEB",
      type: "Stage M2",
      company: "Capgemini",
      role: "Frontend Web Developer Intern",
      domain: "React / JavaScript",
    },
    {
      id: "SALES",
      type: "Stage M2",
      company: "Orange",
      role: "Business Development Intern",
      domain: "Sales",
    },
    {
      id: "DATA-ENTRY",
      type: "Stage M2",
      company: "Technology Company",
      role: "Data Entry Intern",
      domain: "Operations",
    },
    {
      id: "ML",
      type: "Stage M2",
      company: "Dassault Systèmes",
      role: "Machine Learning Intern",
      domain: "Machine Learning",
    },
  ];

  assert.deepEqual(
    jobDrive.filterInternships(jobs).map((job) => job.id),
    ["ML"]
  );
});


test("technical alignment recognizes DASSIP core specializations", () => {
  const accepted = [
    "Data Science",
    "Machine Learning",
    "Deep Learning",
    "Artificial Intelligence",
    "Computer Vision",
    "Image Processing",
    "Signal Processing",
    "Audio Processing",
    "Speech Processing",
    "Time Series",
    "Statistical Learning",
    "Multimodal AI",
  ];

  for (const domain of accepted) {
    assert.equal(
      jobDrive.isIndustryInternship({
        type: "Stage M2",
        company: "Industrial Technology Company",
        role: `${domain} Intern`,
        domain,
      }),
      true,
      `Expected ${domain} to be accepted`
    );
  }
});
