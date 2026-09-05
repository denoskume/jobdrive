import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  filterInternships,
  normalizeJobs,
  sortInternships,
} from "../src/utils/jobDrive.mjs";

function sheetValuesWithScoring() {
  const headers = Array.from({ length: 40 }, (_, index) => `column-${index}`);
  const row = Array(40).fill("");

  row[0] = "SCORE-1";
  row[1] = "Stage M2";
  row[2] = "Industrial Vision Co";
  row[3] = "Computer Vision Intern";
  row[4] = "Computer Vision";
  row[5] = "Paris, France";
  row[11] = "Nouveau";
  row[12] = "Haute";
  row[13] = "91";
  row[14] = "Strong Computer Vision alignment";
  row[34] = "A";
  row[35] = JSON.stringify({
    alignment: 43,
    technicalQuality: 18,
    companyQuality: 13,
    practicalFit: 9,
    freshness: 5,
    compensation: 3,
  });
  row[36] = JSON.stringify([
    "Strong Computer Vision alignment",
    "Hands-on model and experimentation work",
  ]);
  row[37] = JSON.stringify(["Application deadline not specified"]);
  row[38] = "2.0";
  row[39] = "2026-09-05T09:30:00.000Z";

  return [headers, row];
}

test("normalizes AI:AN scoring metadata into typed dashboard fields", () => {
  const [job] = normalizeJobs(sheetValuesWithScoring());

  assert.equal(job.scoreGrade, "A");
  assert.deepEqual(job.scoreBreakdown, {
    alignment: 43,
    technicalQuality: 18,
    companyQuality: 13,
    practicalFit: 9,
    freshness: 5,
    compensation: 3,
  });
  assert.deepEqual(job.scoringStrengths, [
    "Strong Computer Vision alignment",
    "Hands-on model and experimentation work",
  ]);
  assert.deepEqual(job.scoringWeaknesses, [
    "Application deadline not specified",
  ]);
  assert.equal(job.scoringVersion, "2.0");
  assert.equal(job.scoringUpdatedAt, "2026-09-05T09:30:00.000Z");
});

test("old and malformed rows normalize scoring metadata safely", () => {
  const headers = Array.from({ length: 34 }, (_, index) => `column-${index}`);
  const oldRow = Array(34).fill("");
  oldRow[0] = "OLD-1";
  oldRow[1] = "Stage M2";
  oldRow[2] = "Example Company";
  oldRow[3] = "Machine Learning Intern";
  oldRow[4] = "Machine Learning";

  const malformedRow = Array(40).fill("");
  malformedRow[0] = "BAD-JSON";
  malformedRow[1] = "Stage M2";
  malformedRow[2] = "Example Company";
  malformedRow[3] = "Machine Learning Intern";
  malformedRow[4] = "Machine Learning";
  malformedRow[35] = "{not-json";
  malformedRow[36] = "not-an-array";
  malformedRow[37] = "[broken";

  const [oldJob, malformedJob] = normalizeJobs([
    headers,
    oldRow,
    malformedRow,
  ]);

  for (const job of [oldJob, malformedJob]) {
    assert.equal(job.scoreGrade, "");
    assert.deepEqual(job.scoreBreakdown, {});
    assert.deepEqual(job.scoringStrengths, []);
    assert.deepEqual(job.scoringWeaknesses, []);
    assert.equal(job.scoringVersion, "");
    assert.equal(job.scoringUpdatedAt, "");
  }
});

test("dashboard internship policy recognizes every new Phase 2B specialization", () => {
  const domains = [
    "Medical Imaging",
    "Biomedical Signal",
    "Remote Sensing / Geospatial",
    "Representation Learning",
  ];

  const jobs = domains.map((domain, index) => ({
    id: `NEW-DOMAIN-${index}`,
    type: "Stage M2",
    company: "Industrial Technology Company",
    role: `${domain} Intern`,
    domain,
  }));

  assert.deepEqual(
    filterInternships(jobs).map((job) => job.id),
    jobs.map((job) => job.id)
  );
});

test("recommended ranking is fit-first then priority deadline publication and detection", () => {
  const jobs = [
    {
      id: "lower-score-new",
      fitScore: 88,
      priority: "Haute",
      deadline: "2026-09-06",
      postedDate: "2026-09-05",
      detectedDate: "2026-09-05T10:00:00Z",
    },
    {
      id: "score-95-medium",
      fitScore: 95,
      priority: "Moyenne",
      deadline: "2026-09-10",
      postedDate: "2026-09-04",
      detectedDate: "2026-09-04T10:00:00Z",
    },
    {
      id: "score-95-high-late",
      fitScore: 95,
      priority: "Haute",
      deadline: "2026-09-12",
      postedDate: "2026-09-05",
      detectedDate: "2026-09-05T09:00:00Z",
    },
    {
      id: "score-95-high-urgent-old",
      fitScore: 95,
      priority: "Haute",
      deadline: "2026-09-08",
      postedDate: "2026-09-03",
      detectedDate: "2026-09-05T08:00:00Z",
    },
    {
      id: "score-95-high-urgent-new",
      fitScore: 95,
      priority: "Haute",
      deadline: "2026-09-08",
      postedDate: "2026-09-05",
      detectedDate: "2026-09-05T07:00:00Z",
    },
  ];

  assert.deepEqual(
    sortInternships(jobs, "recommended").map((job) => job.id),
    [
      "score-95-high-urgent-new",
      "score-95-high-urgent-old",
      "score-95-high-late",
      "score-95-medium",
      "lower-score-new",
    ]
  );
});

test("Sheets client keeps Phase 2B scoring metadata inside the extended A:AS range", () => {
  const code = fs.readFileSync("src/services/sheetsApi.js", "utf8");
  assert.match(code, /'\$\{SHEET_NAME\}'!A:AS/);
});

test("AppPro defaults to recommended ranking and exposes Fit Intelligence", () => {
  const appPro = fs.readFileSync("src/AppPro.jsx", "utf8");
  const dashboard = fs.readFileSync("src/JobDriveDashboard.jsx", "utf8");

  assert.match(appPro, /useState\("recommended"\)/);
  assert.doesNotMatch(appPro, /useState\("newest"\)/);
  assert.match(dashboard, /<option value="recommended">/);
  assert.match(dashboard, /Recommended/);
  assert.match(appPro, /Fit Intelligence/);
  assert.match(appPro, /job\.scoreGrade/);
  assert.match(appPro, /job\.scoreBreakdown/);
  assert.match(appPro, /job\.scoringStrengths/);
  assert.match(appPro, /job\.scoringWeaknesses/);
});
