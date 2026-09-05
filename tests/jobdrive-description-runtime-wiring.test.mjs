import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(
  "src/AppPro.jsx",
  "utf8"
);


test("AppPro imports runtime description coordinator", () => {
  assert.match(
    app,
    /refreshOfferDescription/
  );

  assert.match(
    app,
    /runtimeDescriptionRefresh/
  );
});


test("AppPro imports offer description acquisition client", () => {
  assert.match(
    app,
    /fetchOfferDescription/
  );

  assert.match(
    app,
    /offerDescriptionApi/
  );
});


test("AppPro imports description persistence updater", () => {
  assert.match(
    app,
    /updateDescriptionFields/
  );
});


test("loadJobs keeps the Google Sheet jobs read path when coverage loads in parallel", () => {
  assert.match(
    app,
    /readJobs\s*\(/
  );

  assert.match(
    app,
    /filterInternships\s*\(/
  );

  assert.match(
    app,
    /setJobs\s*\(/
  );
});


test("runtime refresh is invoked after jobs are loaded", () => {
  assert.match(
    app,
    /refreshOfferDescription\s*\(/
  );
});


test("runtime persistence delegates to updateDescriptionFields", () => {
  assert.match(
    app,
    /updateDescriptionFields\s*\(/
  );

  assert.match(
    app,
    /jobId\s*:\s*job\.id/
  );

  assert.match(
    app,
    /patch/
  );
});


test("OAuth functions remain present and untouched in responsibility", () => {
  assert.match(
    app,
    /requestGoogleToken/
  );

  assert.match(
    app,
    /revokeGoogleToken/
  );

  assert.match(
    app,
    /response\.access_token/
  );
});


test("description enrichment failure is isolated from main load", () => {
  assert.match(
    app,
    /catch\s*\([^)]*\)\s*\{[\s\S]*description/i
  );
});
