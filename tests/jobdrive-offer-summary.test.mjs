import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync(
  "src/JobDriveDashboard.jsx",
  "utf8"
);

test("popup contains a four-part real offer summary", () => {
  assert.match(
    dashboard,
    /function buildOfferSummary/
  );

  assert.match(
    dashboard,
    /jd-offer-summary/
  );

  assert.match(
    dashboard,
    /Role & company/
  );

  assert.match(
    dashboard,
    /Technical scope/
  );

  assert.match(
    dashboard,
    /Practical details/
  );

  assert.match(
    dashboard,
    /Why it matters for you/
  );
});

test("offer summary is built from actual job metadata", () => {
  for (const field of [
    "job.role",
    "job.company",
    "job.domain",
    "job.location",
    "job.contract",
    "job.compensation",
    "job.postedDate",
    "job.deadline",
    "job.whyRelevant",
  ]) {
    assert.match(
      dashboard,
      new RegExp(
        field.replace(".", "\\.")
      )
    );
  }
});

test("summary does not use fabricated generic fallback claims", () => {
  assert.doesNotMatch(
    dashboard,
    /Excellent opportunity to develop your career/
  );

  assert.doesNotMatch(
    dashboard,
    /You will work on exciting projects/
  );
});

test("official offer remains directly accessible after summary", () => {
  assert.match(
    dashboard,
    /Open official offer/
  );

  assert.match(
    dashboard,
    /href=\{job\.link\}/
  );
});
