import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeJobs,
} from "../src/utils/jobDrive.mjs";


test("description fields start at AA and do not consume X Y Z business data", () => {
  const header = Array(34).fill("");

  const row = Array(34).fill("");

  row[0] = "M2-TEST-001";
  row[2] = "Mistral AI";

  // Existing business columns in the real Sheet
  row[23] = "97";                    // X — DASSIP Score
  row[24] = "Excellent alignment";  // Y — Entreprise & sujet
  row[25] = "Faible";               // Z — Risque validation Centrale

  // Description block AA:AH
  row[26] = "REAL RAW DESCRIPTION";
  row[27] = "REAL ABOUT";
  row[28] = "REAL ROLE";
  row[29] = "REAL EXPECTATIONS";
  row[30] = "REAL SKILLS";
  row[31] = "https://example.com/job";
  row[32] = "2026-09-04T10:00:00Z";
  row[33] = "live";

  const [job] = normalizeJobs([
    header,
    row,
  ]);

  assert.equal(
    job.descriptionRaw,
    "REAL RAW DESCRIPTION"
  );

  assert.equal(job.about, "REAL ABOUT");
  assert.equal(job.roleMission, "REAL ROLE");
  assert.equal(
    job.expectations,
    "REAL EXPECTATIONS"
  );
  assert.equal(
    job.mustHaveSkills,
    "REAL SKILLS"
  );
  assert.equal(
    job.descriptionSource,
    "https://example.com/job"
  );
  assert.equal(
    job.descriptionFetchedAt,
    "2026-09-04T10:00:00Z"
  );
  assert.equal(
    job.descriptionStatus,
    "live"
  );

  assert.notEqual(job.descriptionRaw, "Faible");
  assert.notEqual(
    job.descriptionRaw,
    "Excellent alignment"
  );

  assert.equal(job.companyDomain, "");
  assert.equal(job.logoUrl, "");
  assert.equal(job.dassipScore, 97);
  assert.equal(
    job.validationRisk,
    "Faible"
  );
});
