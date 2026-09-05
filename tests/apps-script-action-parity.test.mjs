import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { evaluateAction } from "../src/actions/actionEngine.mjs";

const APPS_SCRIPT_ACTIONS = "apps-script/ActionCenter.gs";
const NOW_ISO = "2026-09-05T08:00:00.000Z";

function job(overrides = {}) {
  return {
    id: "ACTION-1",
    type: "Stage M2",
    company: "Industrial AI",
    role: "Machine Learning Intern",
    status: "Nouveau",
    fitScore: 90,
    postedDate: "2026-09-04",
    detectedDate: "2026-09-04T10:00:00.000Z",
    deadline: "",
    appliedDate: "",
    followUpDate: "",
    lastFollowUp: "",
    followUpCount: 0,
    ...overrides,
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function parisDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(
    parts
      .filter((part) => ["year", "month", "day"].includes(part.type))
      .map((part) => [part.type, part.value])
  );
  return `${map.year}-${map.month}-${map.day}`;
}

function loadAppsScriptActions() {
  assert.equal(
    fs.existsSync(APPS_SCRIPT_ACTIONS),
    true,
    "apps-script/ActionCenter.gs must exist"
  );

  const context = {
    console,
    Utilities: {
      formatDate(date, timeZone, format) {
        assert.equal(timeZone, "Europe/Paris");
        assert.equal(format, "yyyy-MM-dd");
        return parisDateKey(date);
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(APPS_SCRIPT_ACTIONS, "utf8"),
    context,
    { filename: APPS_SCRIPT_ACTIONS }
  );

  assert.equal(typeof context.evaluateJobDriveAction_, "function");
  return context;
}

function assertParity(context, fixture) {
  const browser = plain(
    evaluateAction(fixture, { now: new Date(NOW_ISO) })
  );
  const appsScript = plain(
    context.evaluateJobDriveAction_(fixture, NOW_ISO)
  );
  assert.deepEqual(appsScript, browser);
}

test("Apps Script action engine matches browser decisions", () => {
  const context = loadAppsScriptActions();
  const fixtures = [
    job({ status: "Accepté" }),
    job({ fitScore: 74, deadline: "2026-09-06" }),
    job({ deadline: "2026-09-05" }),
    job({ deadline: "2026-09-08", fitScore: 84 }),
    job({ deadline: "2026-10-01", fitScore: 90 }),
    job({
      status: "Candidature envoyée",
      followUpDate: "2026-09-04",
    }),
    job({
      status: "Candidature envoyée",
      followUpDate: "2026-09-05",
    }),
    job({
      status: "Candidature envoyée",
      appliedDate: "2026-09-04",
    }),
    job({
      status: "Candidature envoyée",
      appliedDate: "2026-09-01",
    }),
    job({
      status: "Candidature envoyée",
      lastFollowUp: "2026-09-04T08:00:00.000Z",
    }),
  ];

  for (const fixture of fixtures) {
    assertParity(context, fixture);
  }
});

test("Apps Script ActionCenter owns only phase 2C row helpers", () => {
  const context = loadAppsScriptActions();
  assert.equal(typeof context.actionJobFromRow_, "function");
  assert.equal(typeof context.ensureActionCenterHeaders_, "function");
  assert.equal(typeof context.refreshActionSnapshotRow_, "function");

  const row = Array(45).fill("");
  row[0] = "ROW-1";
  row[11] = "Candidature envoyée";
  row[13] = "91";
  row[19] = "2026-09-01";
  row[20] = "2026-09-05";
  row[40] = "2026-09-04T08:00:00.000Z";
  row[41] = "2";

  const mapped = plain(context.actionJobFromRow_(row));
  assert.equal(mapped.id, "ROW-1");
  assert.equal(mapped.status, "Candidature envoyée");
  assert.equal(mapped.fitScore, 91);
  assert.equal(mapped.lastFollowUp, "2026-09-04T08:00:00.000Z");
  assert.equal(mapped.followUpCount, 2);
});
