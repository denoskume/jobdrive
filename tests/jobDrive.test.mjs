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


test("filterInternships excludes Remote Job rows", () => {
  const jobs = [
    { id: "M2-1", type: "Stage M2" },
    { id: "RJ-1", type: "Remote Job" },
    { id: "M2-2", type: "Stage M2" },
  ];

  const result = jobDrive.filterInternships?.(jobs);

  assert.deepEqual(
    result?.map((job) => job.id),
    ["M2-1", "M2-2"]
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
