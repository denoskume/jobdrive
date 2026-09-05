import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const code = fs.readFileSync("apps-script/Discovery.gs", "utf8");

test("run summary exposes per-source health details", () => {
  assert.match(code, /sourceHealth/);
  assert.match(code, /elapsedMs/);
  assert.match(code, /jobsFound/);
  for (const status of ["ok", "empty", "fetch_error", "unsupported", "inactive"]) {
    assert.match(code, new RegExp(status));
  }
});

test("source health preserves aggregate sourceErrors compatibility", () => {
  assert.match(code, /sourceErrors/);
});
