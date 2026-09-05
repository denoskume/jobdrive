import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function propertyStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    api: {
      getProperty: (key) => values.get(key) || "",
      setProperty: (key, value) => values.set(key, String(value)),
      deleteProperty: (key) => values.delete(key),
    },
  };
}

function loadBackfill({sources = [], batchSummary = null, initialProps = {}} = {}) {
  const code = fs.readFileSync("apps-script/DiscoveryBackfill.gs", "utf8");
  const store = propertyStore(initialProps);
  const updates = [];
  const context = {
    PropertiesService: {getScriptProperties: () => store.api},
    seedDiscoveryRegistry_: () => ({inserted:0,total:sources.length}),
    loadDiscoverySources_: () => sources.map((source) => ({...source})),
    upsertDiscoverySource_: (source) => updates.push({...source}),
    runDiscoveryBatch_: () => batchSummary || {mode:"backfill",sourcesAttempted:1,sourcesSucceeded:1,finishedAt:"2026-09-05T18:05:00Z"},
    franceTravailConfigStatus_: () => ({configured:false,reason:"missing_credentials"}),
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return {context, store, updates};
}

test("startJobDriveBackfill marks backfill active and clears only progression cursors", () => {
  const sources = [
    {sourceKey:"a",active:true,verificationStatus:"verified",cursor:"page-3",lastSuccessfulScanAt:"2026-09-05T10:00:00Z"},
    {sourceKey:"restricted",active:true,verificationStatus:"restricted",cursor:""},
  ];
  const {context, store, updates} = loadBackfill({sources});
  const result = context.startJobDriveBackfill(new Date("2026-09-05T18:00:00Z"));
  assert.equal(result.active, true);
  assert.equal(store.values.get("JOBDRIVE_BACKFILL_ACTIVE"), "true");
  assert.equal(store.values.get("JOBDRIVE_BACKFILL_STARTED_AT"), "2026-09-05T18:00:00.000Z");
  assert.equal(store.values.get("JOBDRIVE_ROTATION_STARTED_AT"), "2026-09-05T18:00:00.000Z");
  assert.equal(updates.find((source) => source.sourceKey === "a").cursor, "");
  assert.equal(updates.find((source) => source.sourceKey === "a").lastSuccessfulScanAt, "2026-09-05T10:00:00Z");
});

test("backfill completeness accounts verified success restricted config and failed states", () => {
  const {context} = loadBackfill();
  const rotation = "2026-09-05T18:00:00Z";
  const sources = [
    {active:true,verificationStatus:"verified",lastAttemptAt:"2026-09-05T18:01:00Z",cursor:"",healthState:"ok"},
    {active:true,verificationStatus:"verified",lastAttemptAt:"2026-09-05T18:02:00Z",cursor:"",healthState:"fetch_error"},
    {active:true,verificationStatus:"restricted",lastAttemptAt:"",cursor:"",healthState:"restricted"},
    {active:true,verificationStatus:"configuration_required",lastAttemptAt:"",cursor:"",healthState:"configuration_required"},
  ];
  assert.equal(context.isBackfillRotationComplete_(sources, rotation), true);
  sources[0].cursor = "page-2";
  assert.equal(context.isBackfillRotationComplete_(sources, rotation), false);
});

test("runJobDriveBackfillBatch resumes active rotation and marks completion once accounted", () => {
  const sources = [
    {sourceKey:"a",active:true,verificationStatus:"verified",lastAttemptAt:"2026-09-05T18:06:00Z",cursor:"",healthState:"ok"},
    {sourceKey:"linkedin",active:true,verificationStatus:"restricted",lastAttemptAt:"",cursor:"",healthState:"restricted"},
  ];
  const {context, store} = loadBackfill({
    sources,
    initialProps:{
      JOBDRIVE_BACKFILL_ACTIVE:"true",
      JOBDRIVE_BACKFILL_STARTED_AT:"2026-09-05T18:00:00Z",
      JOBDRIVE_ROTATION_STARTED_AT:"2026-09-05T18:00:00Z",
    },
  });
  const result = context.runJobDriveBackfillBatch(new Date("2026-09-05T18:07:00Z"));
  assert.equal(result.complete, true);
  assert.equal(store.values.get("JOBDRIVE_BACKFILL_ACTIVE"), "false");
  assert.equal(store.values.get("JOBDRIVE_BACKFILL_COMPLETED_AT"), "2026-09-05T18:07:00.000Z");
});

test("backfill scheduler source eligibility does not restart already-accounted sources", () => {
  const code = fs.readFileSync("apps-script/DiscoveryScheduler.gs", "utf8");
  const context = {console};
  vm.createContext(context);
  vm.runInContext(code, context);
  const rotation = "2026-09-05T18:00:00Z";
  const selected = context.selectDiscoveryBatch_([
    {sourceKey:"done",active:true,priority:100,verificationStatus:"verified",lastAttemptAt:"2026-09-05T18:01:00Z",lastSuccessfulScanAt:"2026-09-05T18:01:00Z",cursor:""},
    {sourceKey:"pending",active:true,priority:20,verificationStatus:"verified",lastAttemptAt:"2026-09-05T17:00:00Z",lastSuccessfulScanAt:"2026-09-05T17:00:00Z",cursor:""},
    {sourceKey:"resume",active:true,priority:10,verificationStatus:"verified",lastAttemptAt:"2026-09-05T18:02:00Z",lastSuccessfulScanAt:"2026-09-05T18:02:00Z",cursor:"page-2"},
  ], "2026-09-05T18:03:00Z", {maxSources:10,mode:"backfill",rotationStartedAt:rotation});
  assert.deepEqual(Array.from(selected, (source) => source.sourceKey), ["resume", "pending"]);
});
