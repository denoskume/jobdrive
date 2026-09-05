import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeJobsWithDiscoveryMetadata } from "../src/discovery/jobsPhase2d.mjs";

test("new A:BC rows normalize Phase 2D lifecycle and evidence metadata", () => {
  const header = Array(55).fill("");
  const row = Array(55).fill("");
  row[0] = "DISC-1";
  row[1] = "Stage M2";
  row[2] = "Acme";
  row[3] = "Algorithms Intern";
  row[45] = "Active";
  row[46] = "2026-09-05T18:00:00Z";
  row[47] = "greenhouse:acme";
  row[48] = "2";
  row[49] = "description:internship";
  row[50] = "location:france";
  row[51] = "6_months";
  row[52] = "company";
  row[53] = '["Machine Learning","Time Series"]';
  row[54] = "jan_2027";

  const [job] = normalizeJobsWithDiscoveryMetadata([header, row]);
  assert.equal(job.marketStatus, "Active");
  assert.equal(job.marketLastSeenAt, "2026-09-05T18:00:00Z");
  assert.equal(job.canonicalSourceKey, "greenhouse:acme");
  assert.equal(job.sourceCount, 2);
  assert.equal(job.internshipEvidence, "description:internship");
  assert.equal(job.locationEvidence, "location:france");
  assert.equal(job.durationEvidence, "6_months");
  assert.equal(job.industryEvidence, "company");
  assert.deepEqual(job.domainEvidence, ["Machine Learning", "Time Series"]);
  assert.equal(job.timingEvidence, "jan_2027");
});

test("old A:AS rows keep safe Phase 2D defaults", () => {
  const header = Array(45).fill("");
  const row = Array(45).fill("");
  row[0] = "OLD-1";
  const [job] = normalizeJobsWithDiscoveryMetadata([header, row]);
  assert.equal(job.marketStatus, "");
  assert.equal(job.marketLastSeenAt, "");
  assert.equal(job.canonicalSourceKey, "");
  assert.equal(job.sourceCount, 0);
  assert.equal(job.durationEvidence, "");
  assert.deepEqual(job.domainEvidence, []);
});

test("frontend coverage normalizer ignores runs older than 24 hours", async () => {
  const { normalizeCoverageRows } = await import("../src/discovery/coverage.mjs");
  const sources = [
    ["sourceKey","company","sourceType","tenant","endpoint","countryScope","active","priority","healthState","verificationStatus","verifiedAt","lastAttemptAt"],
    ["a","Acme","greenhouse","acme","","FR","TRUE","90","ok","verified","","2026-09-05T17:00:00Z"],
  ];
  const runs = [
    ["runId","mode","startedAt","finishedAt","totalKnownSources","activeSources","sourcesAttempted","sourcesSucceeded","sourcesFailed","sourcesRestricted","sourcesPending","sourcesSkippedByBudget","rawListingsInspected","normalizedCandidates","duplicatesDetected","rejectedLocation","rejectedInternshipType","rejectedDuration","rejectedAcademic","rejectedDefense","rejectedTechnicalAlignment","rejectedScore","acceptedStored","runtimeBudgetReached","rotationCompleted","lastRotationCompletedAt","sourceHealthJson"],
    ["old","continuous","","2026-09-04T17:00:00Z","1","1","1","1","0","0","0","0","999","999","0","0","0","0","0","0","0","0","99","FALSE","TRUE","2026-09-04T17:00:00Z","[]"],
    ["new","continuous","","2026-09-05T17:30:00Z","1","1","1","1","0","0","0","0","20","20","0","0","0","0","0","0","0","0","3","FALSE","TRUE","2026-09-05T17:30:00Z","[]"],
  ];
  const coverage = normalizeCoverageRows({sources, runs}, {now:new Date("2026-09-05T18:00:00Z")});
  assert.equal(coverage.rawListings24h, 20);
  assert.equal(coverage.retained24h, 3);
  assert.equal(coverage.state, "complete");
});

test("empty frontend coverage rows return a safe incomplete snapshot", async () => {
  const { normalizeCoverageRows } = await import("../src/discovery/coverage.mjs");
  const coverage = normalizeCoverageRows({sources:[], runs:[]}, {now:new Date("2026-09-05T18:00:00Z")});
  assert.equal(coverage.state, "incomplete");
  assert.equal(coverage.totalKnownSources, 0);
  assert.equal(coverage.activeSources, 0);
  assert.equal(coverage.rawListings24h, 0);
});

test("Sheets client reads jobs through BC and exposes both coverage tabs", () => {
  const sheets = fs.readFileSync("src/services/sheetsApi.js", "utf8");
  assert.match(sheets, /Opportunités['"]?!A:BC|SHEET_NAME.*A:BC|A:BC/s);
  assert.match(sheets, /Discovery Sources/);
  assert.match(sheets, /Discovery Runs/);
});

test("AppPro isolates coverage read failure from the main jobs load", () => {
  const app = fs.readFileSync("src/AppPro.jsx", "utf8");
  assert.match(app, /coverage/i);
  assert.match(app, /readDiscoveryCoverage/);
  assert.match(app, /coverageError|Coverage read failed|coverage read failed/i);
});
