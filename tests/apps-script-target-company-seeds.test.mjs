import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { TARGET_COMPANY_CAREER_URLS } from "../src/companies/targetCompanyCareerUrls.mjs";
import { TARGET_COMPANY_CAREER_URL_OVERRIDES } from "../src/companies/targetCompanyCareerUrlOverrides.mjs";

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
    assert.ok(["verified", "probable"].includes(row.francePresence));
  }
});

test("all 200 target companies have a secure resolved recruitment destination", () => {
  const rows = loadSeeds();
  const resolved = {
    ...TARGET_COMPANY_CAREER_URLS,
    ...TARGET_COMPANY_CAREER_URL_OVERRIDES,
  };
  assert.equal(Object.keys(resolved).length, 200);
  for (const row of rows) {
    assert.match(
      String(resolved[row.companyKey] || ""),
      /^https:\/\//,
      `${row.companyName} is missing an HTTPS recruitment URL`
    );
  }
});

test("known stale recruitment routes are replaced by current destinations", () => {
  assert.equal(TARGET_COMPANY_CAREER_URL_OVERRIDES.servier, "https://jobs.servier.com/");
  assert.equal(TARGET_COMPANY_CAREER_URL_OVERRIDES.alteia, "https://careers.alteia.com/");
  assert.match(TARGET_COMPANY_CAREER_URL_OVERRIDES.audionamix, /^https:\/\/www\.linkedin\.com\/company\/audionamix\/jobs\//);
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
