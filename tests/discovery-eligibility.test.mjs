import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEligibility, isFranceCompatible, isInternshipCompatible, technicalAlignment } from "../src/discovery/eligibility.mjs";

const base = {
  company: "Example AI",
  role: "Machine Learning Intern",
  location: "Paris, France",
  country: "France",
  contract: "Internship",
  descriptionRaw: "Final-year internship. Build PyTorch deep learning models for computer vision.",
  link: "https://jobs.example.com/1",
};

test("accepts France internship with DASSIP alignment", () => {
  assert.equal(isFranceCompatible(base), true);
  assert.equal(isInternshipCompatible(base), true);
  assert.equal(evaluateEligibility(base).accepted, true);
});

test("rejects outside-France-only roles", () => {
  assert.equal(isFranceCompatible({ ...base, location: "Berlin, Germany", country: "Germany" }), false);
});

test("rejects alternance permanent PhD and pure BI", () => {
  assert.equal(isInternshipCompatible({ ...base, role: "Machine Learning Alternance", contract: "Apprenticeship" }), false);
  assert.equal(isInternshipCompatible({ ...base, role: "Machine Learning Engineer CDI", contract: "Permanent" }), false);
  assert.equal(isInternshipCompatible({ ...base, role: "PhD Candidate in Computer Vision" }), false);
  assert.equal(technicalAlignment({ ...base, role: "Business Intelligence Intern", descriptionRaw: "Build Power BI dashboards and reports." }).accepted, false);
});
