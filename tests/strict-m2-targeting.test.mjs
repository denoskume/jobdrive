import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

import { evaluateEligibility as evaluateDiscoveryEligibility } from "../src/discovery/eligibility.mjs";
import { scoreInternship } from "../src/scoring/scoringEngine.mjs";
import { filterInternships } from "../src/utils/jobDrive.mjs";

function baseCandidate(overrides = {}) {
  return {
    company: "Target AI Company",
    role: "Machine Learning Research Intern",
    location: "Paris, France",
    country: "France",
    contract: "Internship - 6 months",
    type: "Stage M2",
    postedDate: "2026-09-03",
    deadline: "2026-10-15",
    compensation: "",
    link: "https://example.com/jobs/ml-research-intern",
    source: "ashby",
    descriptionRaw:
      "Six-month final-year internship. Train and evaluate machine learning models with Python and PyTorch for an industrial AI product.",
    roleMission:
      "Train, benchmark and evaluate machine learning models for production use.",
    expectations:
      "Final-year MSc student available for six months in France.",
    mustHaveSkills: "Python, PyTorch, machine learning",
    domain: "Machine Learning",
    whyRelevant: "Strong Machine Learning alignment",
    ...overrides,
  };
}

const customerSuccess = baseCandidate({
  role: "Founding Customer Success Manager",
  contract: "Full-time",
  descriptionRaw:
    "Join an international generative AI company. Work with internal teams and customers from our Paris office on adoption and account success.",
  roleMission:
    "Own customer onboarding, adoption, retention and commercial success.",
  mustHaveSkills:
    "Customer success, account management, communication, stakeholder management",
  domain: "Generative AI",
  whyRelevant: "Strong Generative AI alignment",
  link: "https://example.com/jobs/customer-success",
});

const fullStack = baseCandidate({
  role: "Member of Engineering (Interfaces - Full Stack)",
  location: "Remote (EMEA/East Coast)",
  country: "",
  contract: "Full-time",
  descriptionRaw:
    "Build product interfaces for a machine learning company with an international team including colleagues in Paris. Develop internal web tooling.",
  roleMission:
    "Build frontend and backend product interfaces, APIs and web applications.",
  mustHaveSkills: "TypeScript, React, frontend, backend, full-stack engineering",
  domain: "Machine Learning",
  whyRelevant: "Strong Machine Learning alignment",
  link: "https://example.com/jobs/full-stack",
});

const customerSuccessIntern = baseCandidate({
  role: "Customer Success Intern",
  contract: "Internship - 6 months",
  descriptionRaw:
    "Six-month internship at a generative AI company supporting customer onboarding and adoption.",
  roleMission: "Own customer onboarding, adoption and account success.",
  mustHaveSkills: "Customer success, communication, account management",
  domain: "Generative AI",
  whyRelevant: "Strong Generative AI alignment",
});

const fullStackIntern = baseCandidate({
  role: "Full Stack Engineering Intern",
  contract: "Internship - 6 months",
  descriptionRaw:
    "Six-month internship building interfaces for a machine learning company.",
  roleMission: "Build React frontend, backend APIs and web applications.",
  mustHaveSkills: "TypeScript, React, frontend, backend, full-stack engineering",
  domain: "Machine Learning",
  whyRelevant: "Strong Machine Learning alignment",
});

const shortInternship = baseCandidate({
  contract: "Internship - 3 months",
  descriptionRaw:
    "Three-month machine learning internship in Paris. Train and evaluate PyTorch models.",
  expectations: "Master student available for three months.",
});

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadAppsScript(path) {
  const context = { console, Date };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path, "utf8"), context, { filename: path });
  return context;
}

test("discovery gate does not treat 'international' or 'internal' as internship evidence", () => {
  const result = evaluateDiscoveryEligibility(customerSuccess);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "internship_type");
});

test("discovery gate uses actual location instead of company-description mentions", () => {
  const result = evaluateDiscoveryEligibility(fullStack);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "country");
});

test("discovery gate rejects explicitly incompatible internship durations", () => {
  const result = evaluateDiscoveryEligibility(shortInternship);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "internship_duration");
});

test("discovery gate keeps a real six-month M2 machine-learning internship", () => {
  const result = evaluateDiscoveryEligibility(baseCandidate());
  assert.equal(result.accepted, true);
});

test("scoring hard gate rejects off-target internships despite AI company text", () => {
  for (const fixture of [customerSuccessIntern, fullStackIntern]) {
    const scored = scoreInternship(fixture, { now: new Date("2026-09-05T12:00:00Z") });
    assert.equal(scored.accepted, false, fixture.role);
    assert.equal(scored.rejectionReason, "technical_alignment", fixture.role);
  }
});

test("scoring hard gate rejects non-internship contracts and incompatible durations", () => {
  const nonIntern = scoreInternship(customerSuccess, { now: new Date("2026-09-05T12:00:00Z") });
  assert.equal(nonIntern.accepted, false);
  assert.equal(nonIntern.rejectionReason, "internship_type");

  const tooShort = scoreInternship(shortInternship, { now: new Date("2026-09-05T12:00:00Z") });
  assert.equal(tooShort.accepted, false);
  assert.equal(tooShort.rejectionReason, "internship_duration");
});

test("dashboard hides legacy rows that were mislabeled Stage M2", () => {
  const visible = filterInternships([
    { ...customerSuccess, id: "BAD-CS", type: "Stage M2", fitScore: 75 },
    { ...fullStack, id: "BAD-FS", type: "Stage M2", fitScore: 75 },
    { ...baseCandidate(), id: "GOOD-ML", type: "Stage M2", fitScore: 90 },
  ]);

  assert.deepEqual(visible.map((job) => job.id), ["GOOD-ML"]);
});

test("Apps Script discovery and scoring enforce the same strict gates", () => {
  const discovery = loadAppsScript("apps-script/Discovery.gs");
  const scoring = loadAppsScript("apps-script/Scoring.gs");

  const customerDiscovery = plain(discovery.evaluateDiscoveryCandidate_(customerSuccess));
  const fullStackDiscovery = plain(discovery.evaluateDiscoveryCandidate_(fullStack));
  const shortDiscovery = plain(discovery.evaluateDiscoveryCandidate_(shortInternship));
  const goodDiscovery = plain(discovery.evaluateDiscoveryCandidate_(baseCandidate()));

  assert.equal(customerDiscovery.accepted, false);
  assert.equal(customerDiscovery.reason, "internship_type");
  assert.equal(fullStackDiscovery.accepted, false);
  assert.equal(fullStackDiscovery.reason, "country");
  assert.equal(shortDiscovery.accepted, false);
  assert.equal(shortDiscovery.reason, "internship_duration");
  assert.equal(goodDiscovery.accepted, true);

  const customerScore = plain(scoring.scoreInternshipCandidate_(customerSuccess, "2026-09-05T12:00:00Z"));
  const customerInternScore = plain(scoring.scoreInternshipCandidate_(customerSuccessIntern, "2026-09-05T12:00:00Z"));
  const fullStackInternScore = plain(scoring.scoreInternshipCandidate_(fullStackIntern, "2026-09-05T12:00:00Z"));
  const shortScore = plain(scoring.scoreInternshipCandidate_(shortInternship, "2026-09-05T12:00:00Z"));
  const goodScore = plain(scoring.scoreInternshipCandidate_(baseCandidate(), "2026-09-05T12:00:00Z"));

  assert.equal(customerScore.accepted, false);
  assert.equal(customerScore.rejectionReason, "internship_type");
  assert.equal(customerInternScore.accepted, false);
  assert.equal(customerInternScore.rejectionReason, "technical_alignment");
  assert.equal(fullStackInternScore.accepted, false);
  assert.equal(fullStackInternScore.rejectionReason, "technical_alignment");
  assert.equal(shortScore.accepted, false);
  assert.equal(shortScore.rejectionReason, "internship_duration");
  assert.equal(goodScore.accepted, true);
});
