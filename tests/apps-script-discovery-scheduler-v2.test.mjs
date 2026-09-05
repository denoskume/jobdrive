import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadScheduler() {
  const code = fs.readFileSync("apps-script/DiscoveryScheduler.gs", "utf8");
  const context = { console };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

function source(sourceKey, priority, lastSuccessfulScanAt, extra = {}) {
  return {
    sourceKey,
    active: true,
    priority,
    verificationStatus: "verified",
    lastSuccessfulScanAt,
    nextEligibleScanAt: "",
    cursor: "",
    consecutiveFailures: 0,
    ...extra,
  };
}

test("Discovery Scheduler v2 rotates fairly instead of starving old low-priority sources", () => {
  const context = loadScheduler();
  const selected = context.selectDiscoveryBatch_([
    source("old-high", 100, "2026-09-01T00:00:00Z"),
    source("new-high", 100, "2026-09-05T12:00:00Z"),
    source("old-low", 20, "2026-08-31T00:00:00Z"),
  ], "2026-09-05T15:00:00Z", {maxSources: 2, mode: "continuous"});

  assert.deepEqual(Array.from(selected, (item) => item.sourceKey), ["old-high", "old-low"]);
});

test("Discovery Scheduler v2 resumes unfinished cursors first", () => {
  const context = loadScheduler();
  const selected = context.selectDiscoveryBatch_([
    source("high", 100, "2026-09-04T00:00:00Z"),
    source("resume", 10, "2026-09-05T14:00:00Z", {cursor: "page-2"}),
  ], "2026-09-05T15:00:00Z", {maxSources: 1, mode: "continuous"});

  assert.equal(selected[0].sourceKey, "resume");
});

test("Discovery Scheduler v2 excludes restricted configuration-required and future-backoff sources", () => {
  const context = loadScheduler();
  const selected = context.selectDiscoveryBatch_([
    source("ok", 50, "2026-09-01T00:00:00Z"),
    source("restricted", 100, "", {verificationStatus: "restricted"}),
    source("config", 100, "", {verificationStatus: "configuration_required"}),
    source("backoff", 100, "", {nextEligibleScanAt: "2026-09-05T18:00:00Z"}),
  ], "2026-09-05T15:00:00Z", {maxSources: 10, mode: "continuous"});

  assert.deepEqual(Array.from(selected, (item) => item.sourceKey), ["ok"]);
});

test("Discovery Scheduler v2 applies bounded exponential backoff and resets on success", () => {
  const context = loadScheduler();
  const sourceState = source("broken", 50, "", {consecutiveFailures: 3});
  const failed = context.sourceHealthPatch_(sourceState, {
    status: "fetch_error",
    jobs: [],
    error: "HTTP 500",
  }, "2026-09-05T15:00:00Z");

  assert.equal(failed.healthState, "fetch_error");
  assert.equal(failed.consecutiveFailures, 4);
  assert.equal(failed.lastError, "HTTP 500");
  assert.equal(failed.nextEligibleScanAt, "2026-09-06T07:00:00.000Z");

  const ok = context.sourceHealthPatch_({...sourceState, consecutiveFailures: 2}, {
    status: "ok",
    jobs: [{id:"1"}],
    nextCursor: "",
    done: true,
  }, "2026-09-05T15:00:00Z");

  assert.equal(ok.healthState, "ok");
  assert.equal(ok.consecutiveFailures, 0);
  assert.equal(ok.nextEligibleScanAt, "");
  assert.equal(ok.lastSuccessfulScanAt, "2026-09-05T15:00:00Z");
  assert.equal(ok.jobsSeenLastRun, 1);
});
