import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompletedFollowUpPatch,
  buildScheduleFollowUpPatch,
} from "../src/actions/followUpActions.mjs";

const NOW = new Date("2026-09-05T08:00:00.000Z");

for (const [choice, expected] of [
  [3, "2026-09-08"],
  [7, "2026-09-12"],
  [14, "2026-09-19"],
]) {
  test(`completed follow-up +${choice} increments once`, () => {
    const patch = buildCompletedFollowUpPatch(
      { followUpCount: 2 },
      choice,
      { now: NOW }
    );

    assert.equal(patch.followUpDate, expected);
    assert.equal(patch.followUpCount, 3);
    assert.equal(patch.lastFollowUp, NOW.toISOString());
    assert.equal(patch.lastUpdated, NOW.toISOString());
  });
}

test("No further follow-up clears date and increments completion count", () => {
  const patch = buildCompletedFollowUpPatch(
    { followUpCount: 4 },
    "none",
    { now: NOW }
  );

  assert.equal(patch.followUpDate, "");
  assert.equal(patch.followUpCount, 5);
  assert.equal(patch.lastFollowUp, NOW.toISOString());
});

test("first scheduling does not pretend a follow-up happened", () => {
  const patch = buildScheduleFollowUpPatch(7, { now: NOW });

  assert.deepEqual(patch, {
    followUpDate: "2026-09-12",
    lastUpdated: NOW.toISOString(),
  });
});

test("unsupported follow-up choices are rejected", () => {
  assert.throws(
    () => buildCompletedFollowUpPatch({}, 5, { now: NOW }),
    /Unsupported follow-up action/
  );
  assert.throws(
    () => buildScheduleFollowUpPatch(5, { now: NOW }),
    /Unsupported follow-up schedule/
  );
});
