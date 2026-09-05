import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCandidate,
  normalizeOfficialUrl,
} from "../src/discovery/candidateNormalizer.mjs";

test("normalizes a raw ATS job into the canonical candidate", () => {
  const candidate = normalizeCandidate(
    {
      id: "job-123",
      title: "Machine Learning Intern",
      location: "Paris, France",
      absoluteUrl: "https://jobs.example.com/job-123",
      publishedAt: "2026-09-05T08:00:00Z",
      descriptionPlain: "Final-year internship in deep learning.",
      employmentType: "Internship",
    },
    { key: "example-ashby", company: "Example AI", type: "ashby" },
    "2026-09-05T09:00:00Z"
  );

  assert.equal(candidate.sourceKey, "example-ashby");
  assert.equal(candidate.externalId, "job-123");
  assert.equal(candidate.company, "Example AI");
  assert.equal(candidate.role, "Machine Learning Intern");
  assert.equal(candidate.location, "Paris, France");
  assert.equal(candidate.link, "https://jobs.example.com/job-123");
  assert.equal(candidate.descriptionRaw, "Final-year internship in deep learning.");
  assert.equal(candidate.contract, "Internship");
  assert.equal(candidate.detectedAt, "2026-09-05T09:00:00Z");
});

test("rejects malformed official URLs", () => {
  assert.equal(normalizeOfficialUrl("javascript:alert(1)"), "");
  assert.equal(normalizeOfficialUrl(""), "");
});
