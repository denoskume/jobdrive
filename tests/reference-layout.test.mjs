import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/AppPro.jsx", "utf8");
const css = fs.readFileSync("src/pro.css", "utf8");

test("uses reference-style horizontal navigation", () => {
  assert.match(app, /pro-topbar-nav/);
  assert.match(app, /Overview/);
  assert.match(app, /M2 Internships/);
  assert.match(app, /Pipeline/);
  assert.match(app, /Analytics/);
});

test("uses search controls directly below top navigation", () => {
  assert.match(app, /pro-commandbar/);
});

test("uses master-detail opportunity browser", () => {
  assert.match(app, /pro-opportunity-workspace/);
  assert.match(app, /OpportunityFeed/);
  assert.match(app, /OpportunityDetail/);
});

test("does not use legacy sidebar", () => {
  assert.doesNotMatch(app, /<aside className="pro-sidebar"/);
});

test("reference layout has independent feed and detail panes", () => {
  assert.match(css, /\.pro-feed[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.pro-opportunity-detail[\s\S]*overflow-y:\s*auto/);
});
