import test from "node:test";
import assert from "node:assert/strict";

import { evaluateEligibility } from "../src/discovery/eligibility.mjs";

test("full-time wording does not reject a genuine six-month internship", () => {
  const result = evaluateEligibility({
    company: "Industrial AI Company",
    role: "Machine Learning Intern",
    location: "Paris, France",
    country: "France",
    contract: "Full-time Internship - 6 months",
    link: "https://example.com/ml-intern",
    descriptionRaw: "Train machine learning models with Python and PyTorch.",
    mustHaveSkills: "Python, PyTorch, machine learning",
  });

  assert.equal(result.accepted, true);
});
