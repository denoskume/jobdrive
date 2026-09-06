import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadSeeds() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("apps-script/TargetCompanySeeds.gs", "utf8"),
    context
  );
  return context.targetCompanySeedRows_();
}

test("target company seed contains exactly 200 unique valid employers", () => {
  const rows = loadSeeds();
  assert.equal(rows.length, 200);
  assert.equal(new Set(rows.map((row) => row.companyKey)).size, 200);
  for (const row of rows) {
    assert.match(row.companyKey, /^[a-z0-9-]+$/);
    assert.ok(["giant", "recognized"].includes(row.companyClass));
    assert.ok([1, 2, 3].includes(Number(row.priorityTier)));
    assert.ok(String(row.specializations || "").trim());
    assert.ok(["verified", "probable", "unknown"].includes(row.francePresence));
  }
});

test("target company seed excludes academic and defense-first organizations", () => {
  const text = JSON.stringify(loadSeeds()).toLowerCase();
  for (const forbidden of [
    "université", "universite", "cnrs", "inserm", "inria", "research laboratory",
    "naval group", "mbda", "dassault aviation"
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});
