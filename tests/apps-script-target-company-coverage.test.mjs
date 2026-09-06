import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadContext() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("apps-script/TargetCompanies.gs", "utf8"), context);
  return context;
}

test("healthy recent mapped direct source marks company covered", () => {
  const context = loadContext();
  const result = context.computeTargetCompanyCoverage_(
    { companyKey: "mistral-ai", companyName: "Mistral AI", sourceKeys: "mistral-ashby", aliases: "Mistral" },
    [{ sourceKey: "mistral-ashby", active: true, verificationStatus: "verified", healthState: "ok", lastSuccessfulScanAt: "2026-09-06T08:00:00.000Z" }],
    [],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "covered");
});

test("generic France Travail health alone does not make target companies partial", () => {
  const context = loadContext();
  const result = context.computeTargetCompanyCoverage_(
    { companyKey: "sanofi", companyName: "Sanofi", sourceKeys: "", aliases: "Sanofi" },
    [{ sourceKey: "france-travail", active: true, verificationStatus: "verified", healthState: "ok", lastSuccessfulScanAt: "2026-09-06T08:00:00.000Z" }],
    [],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "uncovered");
});

test("recent raw market observation marks only the observed company partial", () => {
  const context = loadContext();
  const result = context.computeTargetCompanyCoverage_(
    {
      companyKey: "sanofi",
      companyName: "Sanofi",
      sourceKeys: "",
      aliases: "Sanofi SA",
      lastMarketObservedAt: "2026-08-30T10:00:00.000Z",
    },
    [],
    [],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "partial");
  assert.equal(result.activeInternshipCount, 0);
});

test("market observation older than 30 days does not count as partial", () => {
  const context = loadContext();
  const result = context.computeTargetCompanyCoverage_(
    {
      companyKey: "sanofi",
      companyName: "Sanofi",
      sourceKeys: "",
      aliases: "Sanofi SA",
      lastMarketObservedAt: "2026-07-01T10:00:00.000Z",
    },
    [],
    [],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "uncovered");
});

test("terminal tracking and market lifecycle states are excluded from active internship count", () => {
  const context = loadContext();
  const company = { companyKey: "sanofi", companyName: "Sanofi", sourceKeys: "", aliases: "Sanofi" };
  const opportunities = [
    { company: "Sanofi", status: "Nouveau", marketStatus: "active", detectedAt: "2026-09-01T10:00:00.000Z" },
    { company: "Sanofi", status: "Accepté", marketStatus: "active", detectedAt: "2026-09-02T10:00:00.000Z" },
    { company: "Sanofi", status: "Refusé", marketStatus: "active", detectedAt: "2026-09-03T10:00:00.000Z" },
    { company: "Sanofi", status: "Nouveau", marketStatus: "closed", detectedAt: "2026-09-04T10:00:00.000Z" },
  ];
  const result = context.computeTargetCompanyCoverage_(company, [], opportunities, "2026-09-06T12:00:00.000Z");
  assert.equal(result.activeInternshipCount, 1);
});

test("stale direct source does not count as covered", () => {
  const context = loadContext();
  const result = context.computeTargetCompanyCoverage_(
    { companyKey: "mistral-ai", companyName: "Mistral AI", sourceKeys: "mistral-ashby", aliases: "" },
    [{ sourceKey: "mistral-ashby", active: true, verificationStatus: "verified", healthState: "ok", lastSuccessfulScanAt: "2026-09-04T08:00:00.000Z" }],
    [],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "uncovered");
});
