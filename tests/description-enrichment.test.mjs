import test from "node:test";
import assert from "node:assert/strict";

import {
  enrichOfferDescription,
} from "../src/offerDescription/descriptionEnrichment.mjs";

test("supplied discovery description has highest priority", () => {
  const result = enrichOfferDescription({
    existing: {
      descriptionRaw: "Old stored description",
      about: "Old about",
      descriptionStatus: "cached",
    },
    discoveryDescription: `
About
Dior is a luxury company.

Role & mission
Build machine learning models for business use cases.

Expectations
Work with the Data Science team and deliver production-ready analyses.

Must-have skills
Python, machine learning, SQL.
`,
    fetchedDescription: `
About
This fetched version must not win.
`,
    source: "discovery",
    fetchedAt: "2026-09-04T10:00:00Z",
  });

  assert.match(result.descriptionRaw, /Dior is a luxury company/);
  assert.match(result.roleMission, /Build machine learning models/);
  assert.match(result.expectations, /Data Science team/);
  assert.match(result.mustHaveSkills, /Python/);
  assert.equal(result.descriptionSource, "discovery");
  assert.equal(result.descriptionStatus, "live");
});

test("fetched official description is used when discovery has no description", () => {
  const result = enrichOfferDescription({
    existing: {},
    discoveryDescription: "",
    fetchedDescription: `
About
ASML develops advanced semiconductor systems.

Role & mission
Develop reinforcement learning methods.

Expectations
Collaborate with research and engineering teams.

Must-have skills
Python, reinforcement learning, deep learning.
`,
    source: "official",
    fetchedAt: "2026-09-04T11:00:00Z",
  });

  assert.match(result.descriptionRaw, /ASML develops/);
  assert.match(result.roleMission, /reinforcement learning/);
  assert.equal(result.descriptionSource, "official");
  assert.equal(result.descriptionStatus, "live");
});

test("existing stored snapshot is preserved when new retrieval fails", () => {
  const result = enrichOfferDescription({
    existing: {
      descriptionRaw: "Previously stored real description",
      about: "Previously stored company context",
      roleMission: "Previously stored mission",
      expectations: "Previously stored expectations",
      mustHaveSkills: "Python, ML",
      descriptionSource: "official",
      descriptionFetchedAt: "2026-09-03T10:00:00Z",
      descriptionStatus: "live",
    },
    discoveryDescription: "",
    fetchedDescription: "",
    fetchFailed: true,
    fetchedAt: "2026-09-04T12:00:00Z",
  });

  assert.equal(
    result.descriptionRaw,
    "Previously stored real description"
  );
  assert.equal(
    result.roleMission,
    "Previously stored mission"
  );
  assert.equal(result.descriptionStatus, "cached");
});

test("offer without any real description becomes unavailable", () => {
  const result = enrichOfferDescription({
    existing: {},
    discoveryDescription: "",
    fetchedDescription: "",
    fetchFailed: true,
    fetchedAt: "2026-09-04T12:00:00Z",
  });

  assert.equal(result.descriptionRaw, "");
  assert.equal(result.descriptionStatus, "unavailable");
});

test("pipeline never replaces real missing sections with invented claims", () => {
  const result = enrichOfferDescription({
    existing: {},
    discoveryDescription: `
About
A technology company working on computer vision.
`,
    fetchedDescription: "",
    source: "discovery",
    fetchedAt: "2026-09-04T13:00:00Z",
  });

  assert.match(result.about, /computer vision/i);
  assert.doesNotMatch(result.roleMission, /develop|build|design/i);
  assert.doesNotMatch(result.expectations, /collaborate|deliver/i);
  assert.doesNotMatch(result.mustHaveSkills, /python|pytorch|tensorflow/i);
});

test("expired offer preserves its last real snapshot", () => {
  const result = enrichOfferDescription({
    existing: {
      descriptionRaw: "Last known official description",
      about: "Real company context",
      roleMission: "Real role mission",
      expectations: "Real expectations",
      mustHaveSkills: "Python",
      descriptionSource: "official",
      descriptionFetchedAt: "2026-09-03T09:00:00Z",
      descriptionStatus: "live",
    },
    discoveryDescription: "",
    fetchedDescription: "",
    expired: true,
    fetchedAt: "2026-09-04T14:00:00Z",
  });

  assert.equal(
    result.descriptionRaw,
    "Last known official description"
  );
  assert.equal(result.descriptionStatus, "cached");
});
