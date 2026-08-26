import test from "node:test";
import assert from "node:assert/strict";

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

