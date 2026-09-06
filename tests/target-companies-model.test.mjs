import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTargetCompanyRows,
  targetCompanyMetrics,
  filterTargetCompanies,
} from "../src/companies/targetCompanies.mjs";

test("target company counters separate covered partial and uncovered", () => {
  const companies = [
    { companyKey: "a", coverageStatus: "covered", priorityTier: 1, activeInternshipCount: 2 },
    { companyKey: "b", coverageStatus: "partial", priorityTier: 1, activeInternshipCount: 1 },
    { companyKey: "c", coverageStatus: "uncovered", priorityTier: 2, activeInternshipCount: 0 },
  ];
  assert.deepEqual(targetCompanyMetrics(companies), {
    total: 3,
    covered: 1,
    partial: 1,
    uncovered: 1,
    activeInternships: 3,
    tier1Total: 2,
    tier1Covered: 1,
    tier1CoveredPercent: 50,
  });
});

test("filters support class tier specialization coverage and search", () => {
  const companies = [
    { companyName: "Mistral AI", companyClass: "recognized", priorityTier: 1, specializations: ["machine-learning"], coverageStatus: "covered" },
    { companyName: "Airbus", companyClass: "giant", priorityTier: 1, specializations: ["signal-processing"], coverageStatus: "uncovered" },
  ];
  assert.equal(filterTargetCompanies(companies, { companyClass: "giant" }).length, 1);
  assert.equal(filterTargetCompanies(companies, { specialization: "machine-learning" }).length, 1);
  assert.equal(filterTargetCompanies(companies, { coverageStatus: "covered" }).length, 1);
  assert.equal(filterTargetCompanies(companies, { search: "air" })[0].companyName, "Airbus");
});

test("normalizer reads headers dynamically and adds the mapped recruitment destination", () => {
  const values = [
    ["companyName","companyKey","specializations","priorityTier","coverageStatus","activeInternshipCount","companyClass"],
    ["Mistral AI","mistral-ai","machine-learning,deep-learning","1","covered","2","recognized"],
  ];
  const [company] = normalizeTargetCompanyRows(values);
  assert.equal(company.companyKey, "mistral-ai");
  assert.deepEqual(company.specializations, ["machine-learning","deep-learning"]);
  assert.equal(company.priorityTier, 1);
  assert.equal(company.activeInternshipCount, 2);
  assert.match(company.careersUrl, /^https:\/\//);
});

test("an explicit careers URL from the registry overrides the built-in fallback", () => {
  const values = [
    ["companyName","companyKey","careersUrl"],
    ["Mistral AI","mistral-ai","https://example.com/custom-careers"],
  ];
  const [company] = normalizeTargetCompanyRows(values);
  assert.equal(company.careersUrl, "https://example.com/custom-careers");
});

test("default filtering order prioritizes tier then uncovered partial covered", () => {
  const companies = [
    { companyName: "B", priorityTier: 1, coverageStatus: "covered", specializations: [] },
    { companyName: "A", priorityTier: 1, coverageStatus: "uncovered", specializations: [] },
    { companyName: "C", priorityTier: 2, coverageStatus: "uncovered", specializations: [] },
  ];
  assert.deepEqual(filterTargetCompanies(companies, {}).map((c) => c.companyName), ["A","B","C"]);
});
