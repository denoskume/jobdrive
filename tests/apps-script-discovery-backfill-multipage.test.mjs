import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadRunner({mode = "backfill"} = {}) {
  const code = fs.readFileSync("apps-script/Discovery.gs", "utf8");
  const calls = [];
  const props = new Map();
  const source = {
    sourceKey: "bosch-smartrecruiters",
    sourceType: "smartrecruiters",
    active: true,
    verificationStatus: "verified",
    healthState: "ok",
    cursor: "offset=600",
    lastAttemptAt: "2026-09-05T22:00:00Z",
  };

  const pages = {
    "offset=600": {status:"ok", jobs:[], done:false, nextCursor:"offset=700", error:""},
    "offset=700": {status:"ok", jobs:[], done:false, nextCursor:"offset=800", error:""},
    "offset=800": {status:"ok", jobs:[], done:true, nextCursor:"", error:""},
  };

  const context = {
    console: {log: () => {}},
    SPREADSHEET_ID: "sheet",
    SHEET_NAME: "Opportunités",
    SpreadsheetApp: {openById: () => ({getSheetByName: () => ({})})},
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => props.get(key) || "",
        setProperty: (key, value) => props.set(key, String(value)),
        deleteProperty: (key) => props.delete(key),
      }),
    },
    ensureDiscoveryScoringHeaders_: () => {},
    ensureDiscoveryLifecycleHeaders_: () => {},
    loadExistingDiscoveryIndex_: () => ({}),
    seedDiscoveryRegistry_: () => {},
    refreshFranceTravailRegistryConfig_: () => {},
    verifyPendingDiscoverySources_: () => {},
    loadDiscoverySources_: () => [source],
    selectDiscoveryBatch_: () => [source],
    discoverSourcePage_: (_source, cursor) => {
      calls.push(cursor);
      return pages[cursor];
    },
    persistDiscoverySourceHealth_: (_source, result) => {
      source.cursor = result.done === false ? result.nextCursor : "";
    },
    markSourceListingsSeen_: () => {},
    refreshMarketLifecycleForSource_: () => {},
    appendDiscoveryRun_: () => {},
    isBackfillRotationComplete_: () => source.cursor === "",
  };

  vm.createContext(context);
  vm.runInContext(code, context);
  return {context, calls, source, mode};
}

test("backfill consumes consecutive pages from one source in a single execution", () => {
  const {context, calls, source} = loadRunner();
  const summary = context.runDiscoveryBatch_({
    mode:"backfill",
    now:new Date("2026-09-05T22:05:00Z"),
    rotationStartedAt:"2026-09-05T18:00:00Z",
  });

  assert.deepEqual(calls, ["offset=600", "offset=700", "offset=800"]);
  assert.equal(source.cursor, "");
  assert.equal(summary.rotationCompleted, true);
});

test("continuous discovery still processes only one page per source", () => {
  const {context, calls, source} = loadRunner({mode:"continuous"});
  context.runDiscoveryBatch_({mode:"continuous", now:new Date("2026-09-05T22:05:00Z")});

  assert.deepEqual(calls, ["offset=600"]);
  assert.equal(source.cursor, "offset=700");
});
