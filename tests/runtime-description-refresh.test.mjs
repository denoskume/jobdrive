import test from "node:test";
import assert from "node:assert/strict";

import {
  refreshOfferDescription,
} from "../src/offerDescription/runtimeDescriptionRefresh.mjs";


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


test("skips refresh when stored live description is already valid", async () => {
  let fetched = false;
  let persisted = false;

  const job = {
    ...baseJob,
    descriptionRaw: "Existing real description",
    descriptionStatus: "live",
  };

  const result = await refreshOfferDescription({
    job,
    fetchDescription: async () => {
      fetched = true;
      return {};
    },
    persistDescription: async () => {
      persisted = true;
    },
    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(fetched, false);
  assert.equal(persisted, false);
  assert.deepEqual(result, job);
});


test("discovery description has priority over remote acquisition", async () => {
  let fetched = false;
  let persistedPatch = null;

  const discoveryDescription = `
About
Industrial AI company.

Role & mission
Develop computer vision models.

Expectations
Work with the ML engineering team.

Must-have skills
Python and PyTorch.
  `.trim();

  const result = await refreshOfferDescription({
    job: baseJob,
    discoveryDescription,
    fetchDescription: async () => {
      fetched = true;
      return {
        success: true,
        description: "Remote text must not be used",
      };
    },
    persistDescription: async (patch) => {
      persistedPatch = patch;
    },
    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(fetched, false);
  assert.equal(
    result.descriptionRaw,
    discoveryDescription
  );
  assert.equal(
    result.about,
    "Industrial AI company."
  );
  assert.equal(
    result.roleMission,
    "Develop computer vision models."
  );
  assert.equal(
    result.descriptionStatus,
    "live"
  );
  assert.equal(
    persistedPatch.descriptionRaw,
    discoveryDescription
  );
});


test("uses fetched official description when discovery text is absent", async () => {
  let persistedPatch = null;

  const fetchedDescription = `
About
A mobility technology company.

Role & mission
Build perception algorithms.

Expectations
Collaborate with embedded teams.

Must-have skills
Python, C++ and computer vision.
  `.trim();

  const result = await refreshOfferDescription({
    job: baseJob,
    fetchDescription: async () => ({
      success: true,
      description: fetchedDescription,
      source: "https://company.example/jobs/123",
      fetchedAt: "2026-09-04T12:00:00Z",
    }),
    persistDescription: async (patch) => {
      persistedPatch = patch;
    },
    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(
    result.descriptionRaw,
    fetchedDescription
  );
  assert.equal(
    result.descriptionSource,
    "https://company.example/jobs/123"
  );
  assert.equal(
    result.descriptionFetchedAt,
    "2026-09-04T12:00:00Z"
  );
  assert.equal(
    persistedPatch.descriptionStatus,
    "live"
  );
});


test("failed acquisition preserves an existing valid snapshot", async () => {
  let persistedPatch = null;

  const job = {
    ...baseJob,
    descriptionRaw: "Previously stored real description",
    about: "Existing company description",
    roleMission: "Existing mission",
    expectations: "Existing expectations",
    mustHaveSkills: "Existing skills",
    descriptionSource: "https://company.example/jobs/123",
    descriptionFetchedAt: "2026-09-01T12:00:00Z",
    descriptionStatus: "cached",
  };

  const result = await refreshOfferDescription({
    job,
    fetchDescription: async () => ({
      success: false,
      description: "",
      error: "HTTP 404",
    }),
    persistDescription: async (patch) => {
      persistedPatch = patch;
    },
    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(
    result.descriptionRaw,
    "Previously stored real description"
  );
  assert.equal(
    result.about,
    "Existing company description"
  );
  assert.equal(
    result.descriptionStatus,
    "cached"
  );

  assert.equal(
    persistedPatch,
    null
  );
});


test("persists when the resulting snapshot changes", async () => {
  let persistCalls = 0;

  const result = await refreshOfferDescription({
    job: baseJob,
    fetchDescription: async () => ({
      success: true,
      description: `
About
Company.

Role & mission
Build models.

Expectations
Collaborate.

Must-have skills
Python.
      `.trim(),
      source: "https://company.example/jobs/123",
      fetchedAt: "2026-09-04T12:00:00Z",
    }),
    persistDescription: async () => {
      persistCalls += 1;
    },
    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(persistCalls, 1);
  assert.equal(
    result.descriptionStatus,
    "live"
  );
});


test("does not persist when snapshot fields are unchanged", async () => {
  let persistCalls = 0;

  const job = {
    ...baseJob,
    descriptionRaw: "Same description",
    about: "About company",
    roleMission: "Mission",
    expectations: "Expectations",
    mustHaveSkills: "Skills",
    descriptionSource: "source",
    descriptionFetchedAt: "2026-09-04T12:00:00Z",
    descriptionStatus: "cached",
  };

  const result = await refreshOfferDescription({
    job,
    fetchDescription: async () => ({
      success: false,
      description: "",
      error: "temporary failure",
    }),
    persistDescription: async () => {
      persistCalls += 1;
    },
    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(persistCalls, 0);
  assert.equal(
    result.descriptionRaw,
    job.descriptionRaw
  );
});


test("expired job with stored description is not fetched destructively", async () => {
  let fetchCalls = 0;

  const job = {
    ...baseJob,
    status: "Expiré",
    descriptionRaw: "Stored expired offer description",
    descriptionStatus: "cached",
  };

  const result = await refreshOfferDescription({
    job,
    fetchDescription: async () => {
      fetchCalls += 1;
      return {};
    },
    persistDescription: async () => {},
    now: "2026-09-04T12:00:00Z",
  });

  assert.equal(fetchCalls, 0);
  assert.equal(
    result.descriptionRaw,
    "Stored expired offer description"
  );
});
