import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const dashboard = fs.readFileSync("src/JobDriveDashboard.jsx", "utf8");
const appPro = fs.readFileSync("src/AppPro.jsx", "utf8");

function readActionCenter() {
  try {
    return fs.readFileSync("src/actions/ActionCenterView.jsx", "utf8");
  } catch {
    return "";
  }
}

test("dashboard exposes Action Center navigation and clickable KPI", () => {
  assert.match(dashboard, /onViewChange\("actions"\)/);
  assert.match(dashboard, /ACTIONS TODAY/);
  assert.match(dashboard, /actionKpi\.todayCount/);
  assert.match(dashboard, /actionKpi\.criticalCount/);
  assert.match(dashboard, /onClick=\{\(\) => onViewChange\("actions"\)\}/);
});

test("dashboard preserves Recommended as a visible sort option", () => {
  assert.match(dashboard, /<option value="recommended">/);
  assert.match(dashboard, /Recommended/);
});

test("AppPro computes live actions and wires follow-up helpers", () => {
  assert.match(appPro, /buildActionItems/);
  assert.match(appPro, /view === "actions"/);
  assert.match(appPro, /buildCompletedFollowUpPatch/);
  assert.match(appPro, /buildScheduleFollowUpPatch/);
  assert.match(appPro, /actionKpi=\{actionKpi\}/);
});

test("Action Center renders approved groups and controls", () => {
  const source = readActionCenter();
  for (const label of [
    "Overdue Follow-up",
    "Follow-up Today",
    "Deadline Risk",
    "Apply Now",
    "Upcoming",
    "Schedule Follow-up",
    "Mark Followed Up",
  ]) {
    assert.match(source, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Action Center CSS protects mobile primary actions", () => {
  const source = (() => {
    try {
      return fs.readFileSync("src/actions/action-center.css", "utf8");
    } catch {
      return "";
    }
  })();

  assert.match(source, /@media\s*\(max-width:\s*760px\)/);
  assert.match(source, /min-height:\s*44px/);
});
