import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const code = fs.readFileSync(
  "apps-script/Code.gs",
  "utf8"
);


test("preserves existing jobs read endpoint", () => {
  assert.match(
    code,
    /function\s+doGet\s*\(/
  );

  assert.match(
    code,
    /SpreadsheetApp\.openById/
  );

  assert.match(
    code,
    /jsonResponse\s*\(/
  );
});


test("defines server-side offer description acquisition", () => {
  assert.match(
    code,
    /function\s+fetchOfferDescription_\s*\(\s*url\s*\)/
  );

  assert.match(
    code,
    /UrlFetchApp\.fetch/
  );
});


test("defines fetched html normalization", () => {
  assert.match(
    code,
    /function\s+normalizeFetchedOfferHtml_\s*\(\s*html\s*\)/
  );

  assert.match(
    code,
    /script\|style\|noscript/i
  );
});


test("uses muted HTTP exceptions for non-fatal acquisition", () => {
  assert.match(
    code,
    /muteHttpExceptions\s*:\s*true/
  );
});


test("validates offer URLs before fetching", () => {
  assert.equal(
    code.includes(
      String.raw`/^https?:\/\//i.test(source)`
    ),
    true
  );

  assert.match(
    code,
    /linkedin|indeed/i
  );
});


test("returns structured acquisition metadata", () => {
  assert.match(
    code,
    /success\s*:/
  );

  assert.match(
    code,
    /description\s*:/
  );

  assert.match(
    code,
    /source\s*:/
  );

  assert.match(
    code,
    /fetchedAt\s*:/
  );
});


test("routes description acquisition without removing normal doGet behavior", () => {
  assert.match(
    code,
    /e\.parameter/
  );

  assert.match(
    code,
    /fetchOfferDescription_/
  );

  assert.match(
    code,
    /SpreadsheetApp\.openById/
  );
});


test("does not introduce fabricated generic offer copy", () => {
  assert.doesNotMatch(
    code,
    /exciting projects/i
  );

  assert.doesNotMatch(
    code,
    /excellent opportunity/i
  );

  assert.doesNotMatch(
    code,
    /develop your career/i
  );
});
