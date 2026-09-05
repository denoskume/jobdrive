import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const componentPath = "src/discovery/CoverageHealthCard.jsx";
const dashboardPath = "src/JobDriveDashboard.jsx";

test("Coverage Health exposes honest coverage wording and all required metrics", () => {
  const code = fs.readFileSync(componentPath, "utf8");
  for (const text of [
    "Coverage complete for registered accessible sources",
    "Coverage incomplete",
    "Restricted sources not scanned",
    "Sources scanned / active sources (24h)",
    "Pending",
    "Failed / Restricted",
    "Raw listings inspected",
    "Relevant M2 internships retained",
    "Last rotation completed",
  ]) {
    assert.match(code, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.doesNotMatch(code, /all internships in France/i);
});

test("Coverage Health maps complete incomplete and restricted states explicitly", () => {
  const code = fs.readFileSync(componentPath, "utf8");
  assert.match(code, /complete/);
  assert.match(code, /incomplete/);
  assert.match(code, /restricted/);
  assert.match(code, /scanned24h/);
  assert.match(code, /activeSources/);
  assert.match(code, /failed/);
  assert.match(code, /restricted/);
  assert.match(code, /rawListings24h/);
  assert.match(code, /retainedTotal/);
  assert.match(code, /lastRotationCompletedAt/);
});

test("Overview injects CoverageHealthCard immediately after the KPI section", () => {
  const code = fs.readFileSync(dashboardPath, "utf8");
  assert.match(code, /CoverageHealthCard/);
  assert.match(code, /querySelector\("\.jd-kpis"\)/);
  assert.match(code, /insertAdjacentElement\("afterend", slot\)/);
  assert.match(code, /view === "overview"/);
  assert.match(code, /retainedTotal=\{jobs\.length\}/);
});
