import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const code = fs.readFileSync("apps-script/Discovery.gs", "utf8");

test("runner defines a practical Apps Script runtime budget", () => {
  assert.match(code, /DISCOVERY_RUNTIME_BUDGET_MS/);
  assert.match(code, /runtimeBudgetMs/);
  assert.match(code, /runtimeBudgetReached/);
  assert.match(code, /sourcesSkippedByBudget/);
});

test("runner checks budget before starting each source", () => {
  assert.match(code, /Date\.now\(\)\s*-\s*startedMs/);
  assert.match(code, /sourcesSkippedByBudget/);
  assert.match(code, /finishedAt/);
});
