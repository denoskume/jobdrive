import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadCoverage() {
  const code = fs.readFileSync("apps-script/DiscoveryCoverage.gs", "utf8");
  const context = {console};
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

test("coverage snapshot is incomplete when an accessible source failed", () => {
  const context = loadCoverage();
  const now = new Date("2026-09-05T18:00:00Z");
  const sources = [
    {sourceKey:"ok", active:true, verificationStatus:"verified", healthState:"ok", lastAttemptAt:"2026-09-05T17:30:00Z"},
    {sourceKey:"failed", active:true, verificationStatus:"verified", healthState:"fetch_error", lastAttemptAt:"2026-09-05T17:40:00Z"},
    {sourceKey:"linkedin", active:true, verificationStatus:"restricted", healthState:"restricted", lastAttemptAt:""},
  ];
  const runs = [
    {finishedAt:"2026-09-05T17:45:00Z", rawListingsInspected:120, acceptedStored:4, rotationCompleted:false},
  ];
  const snapshot = context.computeDiscoveryCoverageSnapshot_(sources, runs, now);
  assert.equal(snapshot.totalKnownSources, 3);
  assert.equal(snapshot.activeSources, 2);
  assert.equal(snapshot.scanned24h, 2);
  assert.equal(snapshot.failed, 1);
  assert.equal(snapshot.restricted, 1);
  assert.equal(snapshot.rawListings24h, 120);
  assert.equal(snapshot.retained24h, 4);
  assert.equal(snapshot.state, "incomplete");
});

test("coverage is complete only after an accessible-source rotation completed without pending or failed sources", () => {
  const context = loadCoverage();
  const now = new Date("2026-09-05T18:00:00Z");
  const sources = [
    {sourceKey:"a", active:true, verificationStatus:"verified", healthState:"ok", lastAttemptAt:"2026-09-05T17:00:00Z"},
    {sourceKey:"b", active:true, verificationStatus:"verified", healthState:"empty", lastAttemptAt:"2026-09-05T17:05:00Z"},
  ];
  const runs = [
    {finishedAt:"2026-09-05T17:10:00Z", rawListingsInspected:30, acceptedStored:2, rotationCompleted:true, lastRotationCompletedAt:"2026-09-05T17:10:00Z"},
  ];
  const snapshot = context.computeDiscoveryCoverageSnapshot_(sources, runs, now);
  assert.equal(snapshot.activeSources, 2);
  assert.equal(snapshot.scanned24h, 2);
  assert.equal(snapshot.pending, 0);
  assert.equal(snapshot.failed, 0);
  assert.equal(snapshot.state, "complete");
  assert.equal(snapshot.lastRotationCompletedAt, "2026-09-05T17:10:00Z");
});

test("coverage ignores runs older than 24 hours for rolling counters", () => {
  const context = loadCoverage();
  const snapshot = context.computeDiscoveryCoverageSnapshot_([], [
    {finishedAt:"2026-09-04T17:59:59Z",rawListingsInspected:999,acceptedStored:99,rotationCompleted:true,lastRotationCompletedAt:"2026-09-04T17:59:59Z"},
    {finishedAt:"2026-09-05T17:00:00Z",rawListingsInspected:12,acceptedStored:1,rotationCompleted:false},
  ], new Date("2026-09-05T18:00:00Z"));
  assert.equal(snapshot.rawListings24h, 12);
  assert.equal(snapshot.retained24h, 1);
  assert.equal(snapshot.state, "incomplete");
});

test("Discovery Runs schema contains the approved audit fields and no secret-bearing fields", () => {
  const code = fs.readFileSync("apps-script/DiscoveryCoverage.gs", "utf8");
  for (const header of ["runId","mode","rawListingsInspected","acceptedStored","rotationCompleted","sourceHealthJson"]) {
    assert.match(code, new RegExp(`["]${header}["]`));
  }
  assert.doesNotMatch(code, /accessToken|Authorization|client_secret/i);
});
