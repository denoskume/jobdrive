import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("discovery audit lifecycle seeds and refreshes target-company coverage", () => {
  const source = fs.readFileSync("apps-script/DiscoveryCoverage.gs", "utf8");
  assert.match(source, /seedTargetCompanies_/);
  assert.match(source, /refreshTargetCompanyCoverage_/);
  assert.doesNotMatch(source, /newTrigger\(["']refreshTargetCompanyCoverage_/);
});

test("raw market candidates update target-company observations before eligibility filtering", () => {
  const source = fs.readFileSync("apps-script/Discovery.gs", "utf8");
  const observationIndex = source.indexOf("recordTargetCompanyMarketObservations_");
  const eligibilityIndex = source.indexOf("evaluateDiscoveryCandidate_(c)", observationIndex);
  assert.ok(observationIndex >= 0, "market observation hook is missing");
  assert.ok(eligibilityIndex >= 0, "candidate eligibility call is missing after market observation");
  assert.ok(observationIndex < eligibilityIndex, "market observation must happen before filtering");
  assert.match(source, /normalizedPageJobs/);
});
