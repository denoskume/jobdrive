import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  shouldRefreshDescription,
} from "../src/offerDescription/descriptionRefreshPolicy.mjs";

import {
  refreshOfferDescription,
} from "../src/offerDescription/runtimeDescriptionRefresh.mjs";


const app = fs.readFileSync(
  "src/AppPro.jsx",
  "utf8"
);

const dashboard = fs.readFileSync(
  "src/JobDriveDashboard.jsx",
  "utf8"
);

const sheetsApi = fs.readFileSync(
  "src/services/sheetsApi.js",
  "utf8"
);


const baseJob = {
  id: "job-1",
  link: "https://company.example/jobs/123",
  status: "Nouveau",
  descriptionRaw: "",
  about: "",
  roleMission: "",
  expectations: "",
  mustHaveSkills: "",
  descriptionSource: "",
  descriptionFetchedAt: "",
  descriptionStatus: "",
};


test("historical job without description is eligible for acquisition", () => {
  assert.equal(
    shouldRefreshDescription(baseJob),
    true
  );
});


test("successful acquisition becomes a structured persisted snapshot", async () => {
  let persistedPatch = null;

  const raw = `
About
Industrial computer vision company.

Role & mission
Develop perception models.

Expectations
Collaborate with ML and embedded teams.

Must-have skills
Python, PyTorch and computer vision.
  `.trim();

  const result = await refreshOfferDescription({
    job: baseJob,

    fetchDescription: async () => ({
      success: true,
      description: raw,
      source: baseJob.link,
      fetchedAt: "2026-09-04T12:00:00Z",
    }),

    persistDescription: async (patch) => {
      persistedPatch = patch;
    },

    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(result.descriptionRaw, raw);
  assert.equal(
    result.about,
    "Industrial computer vision company."
  );
  assert.equal(
    result.roleMission,
    "Develop perception models."
  );
  assert.equal(
    result.expectations,
    "Collaborate with ML and embedded teams."
  );
  assert.equal(
    result.mustHaveSkills,
    "Python, PyTorch and computer vision."
  );
  assert.equal(result.descriptionStatus, "live");

  assert.deepEqual(
    persistedPatch,
    {
      descriptionRaw: raw,
      about: "Industrial computer vision company.",
      roleMission: "Develop perception models.",
      expectations:
        "Collaborate with ML and embedded teams.",
      mustHaveSkills:
        "Python, PyTorch and computer vision.",
      descriptionSource:
        "https://company.example/jobs/123",
      descriptionFetchedAt:
        "2026-09-04T12:00:00Z",
      descriptionStatus: "live",
    }
  );
});


test("live stored description avoids unnecessary acquisition", async () => {
  let fetchCalls = 0;

  const job = {
    ...baseJob,
    descriptionRaw: "Stored real description",
    descriptionStatus: "live",
  };

  await refreshOfferDescription({
    job,

    fetchDescription: async () => {
      fetchCalls += 1;
      return {};
    },

    persistDescription: async () => {},
  });

  assert.equal(fetchCalls, 0);
});


test("failed refresh preserves an existing cached snapshot", async () => {
  const job = {
    ...baseJob,
    descriptionRaw: "Stored description",
    about: "Stored about",
    roleMission: "Stored mission",
    expectations: "Stored expectations",
    mustHaveSkills: "Stored skills",
    descriptionSource: baseJob.link,
    descriptionFetchedAt:
      "2026-09-01T12:00:00Z",
    descriptionStatus: "cached",
  };

  let persistCalls = 0;

  const result = await refreshOfferDescription({
    job,

    fetchDescription: async () => ({
      success: false,
      description: "",
      error: "HTTP 404",
    }),

    persistDescription: async () => {
      persistCalls += 1;
    },
  });

  assert.equal(
    result.descriptionRaw,
    "Stored description"
  );
  assert.equal(
    result.descriptionStatus,
    "cached"
  );
  assert.equal(persistCalls, 0);
});


test("expired stored description is not destructively refreshed", async () => {
  let fetchCalls = 0;

  const job = {
    ...baseJob,
    status: "Expiré",
    descriptionRaw:
      "Stored expired description",
    descriptionStatus: "cached",
  };

  const result = await refreshOfferDescription({
    job,

    fetchDescription: async () => {
      fetchCalls += 1;
      return {};
    },

    persistDescription: async () => {},
  });

  assert.equal(fetchCalls, 0);
  assert.equal(
    result.descriptionRaw,
    "Stored expired description"
  );
});


test("Google Sheets persistence maps descriptions to AA through AH", () => {
  assert.match(
    sheetsApi,
    /descriptionRaw:\s*"AA"/
  );
  assert.match(
    sheetsApi,
    /about:\s*"AB"/
  );
  assert.match(
    sheetsApi,
    /roleMission:\s*"AC"/
  );
  assert.match(
    sheetsApi,
    /expectations:\s*"AD"/
  );
  assert.match(
    sheetsApi,
    /mustHaveSkills:\s*"AE"/
  );
  assert.match(
    sheetsApi,
    /descriptionSource:\s*"AF"/
  );
  assert.match(
    sheetsApi,
    /descriptionFetchedAt:\s*"AG"/
  );
  assert.match(
    sheetsApi,
    /descriptionStatus:\s*"AH"/
  );
});


test("AppPro runtime uses acquisition coordinator and persistence", () => {
  assert.match(
    app,
    /refreshOfferDescription/
  );

  assert.match(
    app,
    /fetchOfferDescription/
  );

  assert.match(
    app,
    /updateDescriptionFields/
  );
});


test("popup consumes all four persisted structured fields", () => {
  assert.match(
    dashboard,
    /clean\(job\.about\)/
  );

  assert.match(
    dashboard,
    /clean\(job\.roleMission\)/
  );

  assert.match(
    dashboard,
    /clean\(job\.expectations\)/
  );

  assert.match(
    dashboard,
    /clean\(job\.mustHaveSkills\)/
  );
});


test("official offer link remains available", () => {
  assert.match(
    dashboard,
    /href=\{job\.link\}/
  );

  assert.match(
    dashboard,
    /Open official offer/
  );
});
