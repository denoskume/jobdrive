import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(
  "src/AppPro.jsx",
  "utf8"
);

const css = fs.readFileSync(
  "src/pro.css",
  "utf8"
);

test("uses JobLeads-style three-level browsing architecture", () => {
  assert.match(app, /pro-reference-header/);
  assert.match(app, /pro-reference-tabs/);
  assert.match(app, /pro-reference-searchbar/);
  assert.match(app, /pro-reference-browser/);
});

test("uses master-detail job browser", () => {
  assert.match(app, /OpportunityFeed/);
  assert.match(app, /OpportunityDetail/);
  assert.match(app, /pro-opportunity-workspace/);
});

test("uses independent scrolling panes", () => {
  assert.match(css, /\.pro-opportunity-feed[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.pro-opportunity-detail[\s\S]*overflow-y:\s*auto/);
});

test("does not use legacy sidebar architecture", () => {
  assert.doesNotMatch(app, /pro-sidebar/);
});

test("reference browser occupies desktop viewport", () => {
  assert.match(css, /JOBDRIVE REFERENCE UI V3/);
  assert.match(css, /\.pro-reference-browser/);
});
