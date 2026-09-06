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

test("recent France Travail observation marks only the matching company partial", () => {
  const context = loadContext();
  const result = context.computeTargetCompanyCoverage_(
    { companyKey: "sanofi", companyName: "Sanofi", sourceKeys: "", aliases: "Sanofi SA" },
    [],
    [{ company: "Sanofi", sourceKey: "france-travail", detectedAt: "2026-08-30T10:00:00.000Z", marketStatus: "active" }],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "partial");
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
