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

test("normalizes company identity metadata from Google Sheet rows", () => {
  const headers = Array.from(
    { length: 25 },
    (_, index) => `column-${index}`
  );

  const row = Array(25).fill("");

  row[0] = "identity-1";
  row[1] = "Stage M2";
  row[2] = "Example Company";
  row[3] = "AI Internship";

  row[23] = "example.com";
  row[24] = "https://cdn.example.com/logo.svg";

  const [job] = normalizeJobs([
    headers,
    row,
  ]);

  assert.equal(
    job.companyDomain,
    "example.com"
  );

  assert.equal(
    job.logoUrl,
    "https://cdn.example.com/logo.svg"
  );
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
