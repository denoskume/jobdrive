import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "src/services/sheetsApi.js",
  "utf8"
);

test("description persistence maps fields to AA through AH", () => {
  assert.match(
    source,
    /descriptionRaw:\s*"AA"/
  );

  assert.match(
    source,
    /about:\s*"AB"/
  );

  assert.match(
    source,
    /roleMission:\s*"AC"/
  );

  assert.match(
    source,
    /expectations:\s*"AD"/
  );

  assert.match(
    source,
    /mustHaveSkills:\s*"AE"/
  );

  assert.match(
    source,
    /descriptionSource:\s*"AF"/
  );

  assert.match(
    source,
    /descriptionFetchedAt:\s*"AG"/
  );

  assert.match(
    source,
    /descriptionStatus:\s*"AH"/
  );
});


test("description persistence exposes dedicated updater", () => {
  assert.match(
    source,
    /export async function updateDescriptionFields/
  );
});


test("tracking column mappings remain unchanged", () => {
  assert.match(source, /status:\s*"L"/);
  assert.match(source, /favorite:\s*"S"/);
  assert.match(source, /appliedDate:\s*"T"/);
  assert.match(source, /followUpDate:\s*"U"/);
  assert.match(source, /notes:\s*"V"/);
  assert.match(source, /lastUpdated:\s*"W"/);
});
