import test from "node:test";
import assert from "node:assert/strict";
import {
  actionKpi,
  buildActionItems,
  evaluateAction,
  groupActionItems,
  sortActionItems,
} from "../src/actions/actionEngine.mjs";

const NOW = new Date("2026-09-05T08:00:00.000Z");

function job(overrides = {}) {
  return {
    id: "J-1",
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
    ...overrides,
  };
}

test("terminal statuses never create actions", () => {
  for (const status of ["Accepté", "Refusé", "Expiré"]) {
    const result = evaluateAction(job({ status }), { now: NOW });
    assert.equal(result.active, false);
    assert.equal(result.actionType, "NONE");
    assert.equal(result.actionPriority, "None");
  }
});

test("pre-application rows below the Phase 2B threshold stay inactive", () => {
  for (const fitScore of [0, 74]) {
    const result = evaluateAction(job({ fitScore, deadline: "2026-09-06" }), { now: NOW });
    assert.equal(result.actionType, "NONE");
  }
});

test("application follow-up states have precedence", () => {
  const cases = [
    ["2026-09-04", "FOLLOW_UP_OVERDUE", "Critical"],
    ["2026-09-05", "FOLLOW_UP_TODAY", "Critical"],
    ["2026-09-06", "FOLLOW_UP_TOMORROW", "High"],
    ["2026-09-10", "UPCOMING_FOLLOW_UP", "Normal"],
  ];

  for (const [followUpDate, actionType, actionPriority] of cases) {
    const result = evaluateAction(job({ status: "Candidature envoyée", followUpDate }), { now: NOW });
    assert.equal(result.actionType, actionType);
    assert.equal(result.actionPriority, actionPriority);
  }
});

test("application without any prior follow-up becomes Schedule Follow-up", () => {
  const fresh = evaluateAction(job({ status: "Candidature envoyée", appliedDate: "2026-09-04" }), { now: NOW });
  const old = evaluateAction(job({ status: "Candidature envoyée", appliedDate: "2026-09-01" }), { now: NOW });
  assert.equal(fresh.actionType, "SCHEDULE_FOLLOW_UP");
  assert.equal(fresh.actionPriority, "Normal");
  assert.equal(old.actionPriority, "High");
});

test("No further follow-up stays inactive until explicitly rescheduled", () => {
  const result = evaluateAction(job({
    status: "Candidature envoyée",
    followUpDate: "",
    lastFollowUp: "2026-09-04T08:00:00.000Z",
  }), { now: NOW });
  assert.equal(result.active, false);
  assert.equal(result.actionType, "NONE");
  assert.equal(result.actionReason, "No further follow-up requested");
});

test("deadline matrix matches the approved thresholds", () => {
  const cases = [
    [90, "2026-09-05", "Critical"],
    [75, "2026-09-06", "Critical"],
    [85, "2026-09-08", "Critical"],
    [84, "2026-09-08", "High"],
    [85, "2026-09-12", "High"],
    [84, "2026-09-12", "Normal"],
  ];

  for (const [fitScore, deadline, actionPriority] of cases) {
    const result = evaluateAction(job({ fitScore, deadline }), { now: NOW });
    assert.equal(result.actionType, "DEADLINE_RISK");
    assert.equal(result.actionPriority, actionPriority);
  }
});

test("distant or missing deadlines create Apply Now by score", () => {
  for (const [fitScore, actionPriority] of [[90, "High"], [85, "High"], [75, "Normal"]]) {
    const result = evaluateAction(job({ fitScore, deadline: "2026-10-01" }), { now: NOW });
    assert.equal(result.actionType, "APPLY_NOW");
    assert.equal(result.actionPriority, actionPriority);
  }
});

test("passed deadline produces no active pre-application action", () => {
  assert.equal(evaluateAction(job({ deadline: "2026-09-04" }), { now: NOW }).actionType, "NONE");
});

test("action ordering is deterministic", () => {
  const items = buildActionItems([
    job({ id: "apply", fitScore: 95 }),
    job({ id: "deadline", fitScore: 85, deadline: "2026-09-08" }),
    job({ id: "today", status: "Candidature envoyée", followUpDate: "2026-09-05" }),
    job({ id: "overdue", status: "Candidature envoyée", followUpDate: "2026-09-04" }),
  ], { now: NOW });

  assert.deepEqual(sortActionItems(items).map((item) => item.job.id), ["overdue", "today", "deadline", "apply"]);
});

test("Actions Today counts only Critical plus High", () => {
  const items = buildActionItems([
    job({ id: "critical", deadline: "2026-09-05" }),
    job({ id: "high", fitScore: 90 }),
    job({ id: "normal", fitScore: 75 }),
  ], { now: NOW });

  assert.equal(groupActionItems(items).deadlineRisk.length, 1);
  assert.deepEqual(actionKpi(items), { todayCount: 2, criticalCount: 1, highCount: 1 });
});

test("malformed dates are safe and identical inputs are deterministic", () => {
  const input = job({ deadline: "not-a-date" });
  assert.deepEqual(evaluateAction(input, { now: NOW }), evaluateAction(input, { now: NOW }));
});
