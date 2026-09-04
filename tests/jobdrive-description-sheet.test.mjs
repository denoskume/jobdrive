import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeJobs,
} from "../src/utils/jobDrive.mjs";

test("normalizes persisted offer description fields", () => {
  const header =
    Array.from(
      { length: 34 },
      (_, index) => `COL-${index}`
    );

  const row =
    Array.from(
      { length: 34 },
      () => ""
    );

  row[0] = "JOB-001";
  row[1] = "Stage M2";
  row[2] = "Example Industry";
  row[3] = "Machine Learning Intern";

  row[23] = "97";
  row[24] = "Excellent alignment";
    row[25] = "Faible";

  row[26] = "Full official description";
  row[27] = "Company context";
  row[28] = "Build ML models";
  row[29] = "Final-year MSc student";
  row[30] = "Python; PyTorch";
  row[31] = "official";
  row[32] = "2026-09-04T10:00:00Z";
  row[33] = "live";

  const [job] =
    normalizeJobs([
      header,
      row,
    ]);

  assert.equal(
    job.descriptionRaw,
    "Full official description"
  );

  assert.equal(
    job.about,
    "Company context"
  );

  assert.equal(
    job.roleMission,
    "Build ML models"
  );

  assert.equal(
    job.expectations,
    "Final-year MSc student"
  );

  assert.equal(
    job.mustHaveSkills,
    "Python; PyTorch"
  );

  assert.equal(
    job.descriptionSource,
    "official"
  );

  assert.equal(
    job.descriptionFetchedAt,
    "2026-09-04T10:00:00Z"
  );

  assert.equal(
    job.descriptionStatus,
    "live"
  );
});


test("old Google Sheet rows remain compatible", () => {
  const header =
    Array.from(
      { length: 25 },
      (_, index) => `COL-${index}`
    );

  const row =
    Array.from(
      { length: 25 },
      () => ""
    );

  row[0] = "OLD-001";
  row[1] = "Stage M2";
  row[2] = "Legacy Company";

  const [job] =
    normalizeJobs([
      header,
      row,
    ]);

  assert.equal(job.descriptionRaw, "");
  assert.equal(job.about, "");
  assert.equal(job.roleMission, "");
  assert.equal(job.expectations, "");
  assert.equal(job.mustHaveSkills, "");
  assert.equal(job.descriptionSource, "");
  assert.equal(job.descriptionFetchedAt, "");
  assert.equal(job.descriptionStatus, "");
});
