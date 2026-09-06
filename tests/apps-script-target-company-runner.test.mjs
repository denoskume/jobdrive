import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("discovery audit lifecycle seeds and refreshes target-company coverage", () => {
  const source = fs.readFileSync("apps-script/DiscoveryCoverage.gs", "utf8");
  assert.match(source, /seedTargetCompanies_/);
  assert.match(source, /refreshTargetCompanyCoverage_/);
  assert.doesNotMatch(source, /newTrigger\(["']refreshTargetCompanyCoverage_/);
});
