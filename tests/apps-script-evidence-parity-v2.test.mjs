import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { scoreInternship } from "../src/scoring/scoringEngine.mjs";

function loadAppsScript() {
  const context = {console};
  vm.createContext(context);
  for (const file of ["apps-script/Scoring.gs", "apps-script/ScoringEvidenceV2.gs", "apps-script/Discovery.gs"]) {
    vm.runInContext(fs.readFileSync(file, "utf8"), context, {filename:file});
  }
  return context;
}

const base = {
  company:"Industrial Robotics SAS",
  location:"Lyon, France",
  country:"France",
  link:"https://careers.example.com/jobs/1",
};

test("Apps Script Phase 2D scorer matches browser on strong atypical internship", () => {
  const context = loadAppsScript();
  const candidate = {
    ...base,
    role:"Algorithms Intern",
    contract:"Internship",
    postedDate:"2026-09-04T10:00:00Z",
    compensation:"Paid internship",
    descriptionRaw:"Final-year Master internship for 6 months in an industrial R&D engineering team. Develop machine learning models and algorithms for sensor fusion, train and benchmark them in Python and PyTorch, run experiments and validation, then deploy the resulting pipeline into a real-world production system with team mentorship.",
  };
  const browser = scoreInternship(candidate, {now:new Date("2026-09-05T12:00:00Z")});
  const apps = JSON.parse(JSON.stringify(context.scoreInternshipCandidateEvidence_(candidate, "2026-09-05T12:00:00Z")));
  assert.equal(apps.accepted, browser.accepted);
  assert.equal(apps.fitScore, browser.fitScore);
  assert.equal(apps.domain, browser.domain);
});

test("Apps Script Discovery accepts internship evidence from description", () => {
  const context = loadAppsScript();
  const result = context.evaluateDiscoveryCandidate_({
    ...base,
    role:"Applied Scientist",
    contract:"",
    descriptionRaw:"This is a 6-month internship focused on computer vision model training and evaluation."
  });
  assert.equal(result.accepted, true);
});

test("Apps Script evidence scorer still rejects off-target and defense roles", () => {
  const context = loadAppsScript();
  const cases = [
    {role:"Customer Success Intern", contract:"Internship", descriptionRaw:"Support LLM customers for 6 months."},
    {role:"Signal Processing Intern", company:"Defense Systems SAS", contract:"Internship", descriptionRaw:"Radar signal processing for missile guidance. 6 months."},
  ];
  for (const item of cases) {
    const result = context.scoreInternshipCandidateEvidence_({...base, ...item}, "2026-09-05T12:00:00Z");
    assert.equal(result.accepted, false, item.role);
  }
});
