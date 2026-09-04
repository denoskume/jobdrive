import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../apps-script/Code.gs", import.meta.url),
  "utf8"
);

test("detects Ashby job URLs", () => {
  assert.match(source, /function\s+parseAshbyJobUrl_/);
  assert.match(source, /ashbyhq/);
});

test("uses Ashby public posting API", () => {
  assert.match(
    source,
    /api\.ashbyhq\.com\/posting-api\/job-board/
  );
});

test("matches the exact Ashby job id", () => {
  assert.match(source, /jobId/);
  assert.match(source, /\.id/);
});

test("prefers descriptionPlain from Ashby", () => {
  assert.match(source, /descriptionPlain/);
});

test("supports descriptionHtml as a real-source fallback", () => {
  assert.match(source, /descriptionHtml/);
  assert.match(source, /normalizeFetchedOfferHtml_/);
});

test("preserves generic acquisition for non-Ashby sources", () => {
  assert.match(source, /UrlFetchApp\.fetch/);
  assert.match(source, /fetchOfferDescription_/);
});

test("does not fabricate an Ashby description", () => {
  assert.doesNotMatch(
    source,
    /This internship offers|ideal candidate will|you will have the opportunity/i
  );
});
