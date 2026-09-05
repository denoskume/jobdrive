import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadDiscoveryRunner({backfillActive = false} = {}) {
  const code = fs.readFileSync("apps-script/Discovery.gs", "utf8");
  const calls = [];
  const properties = new Map([
    ["JOBDRIVE_BACKFILL_ACTIVE", backfillActive ? "true" : "false"],
  ]);
  const context = {
    console,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties.get(key) || "",
      }),
    },
    runJobDriveBackfillBatch: () => {
      calls.push("backfill");
      return {mode:"backfill", ran:true};
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  context.runDiscoveryBatch_ = () => {
    calls.push("continuous");
    return {mode:"continuous"};
  };
  return {context, calls};
}

test("scheduled discovery resumes an active backfill instead of starting a continuous scan", () => {
  const {context, calls} = loadDiscoveryRunner({backfillActive:true});
  const result = context.runJobDriveDiscovery();

  assert.equal(result.mode, "backfill");
  assert.deepEqual(calls, ["backfill"]);
});

test("scheduled discovery runs normally when no backfill is active", () => {
  const {context, calls} = loadDiscoveryRunner({backfillActive:false});
  const result = context.runJobDriveDiscovery();

  assert.equal(result.mode, "continuous");
  assert.deepEqual(calls, ["continuous"]);
});
