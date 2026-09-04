import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync(
  "src/JobDriveDashboard.jsx",
  "utf8"
);

const css = fs.readFileSync(
  "src/jobdrive-dashboard.css",
  "utf8"
);


function cssRule(selector) {
  const escaped =
    selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return (
    css.match(
      new RegExp(`${escaped}\\s*\\{([^}]*)\\}`)
    )?.[1] || ""
  );
}


test("popup defines the exact four semantic offer sections", () => {
  assert.match(
    dashboard,
    /title:\s*"About"/
  );

  assert.match(
    dashboard,
    /title:\s*"Role & mission"/
  );

  assert.match(
    dashboard,
    /title:\s*"Expectations"/
  );

  assert.match(
    dashboard,
    /title:\s*"Must-have skills"/
  );
});


test("popup uses persisted structured description fields", () => {
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


test("structured offer fields take precedence over fallback", () => {
  assert.match(
    dashboard,
    /clean\(job\.about\)\s*\|\|\s*fallback/
  );

  assert.match(
    dashboard,
    /clean\(job\.roleMission\)\s*\|\|\s*fallback/
  );

  assert.match(
    dashboard,
    /clean\(job\.expectations\)\s*\|\|\s*fallback/
  );

  assert.match(
    dashboard,
    /clean\(job\.mustHaveSkills\)\s*\|\|\s*fallback/
  );
});


test("offer summary is a single full-width column", () => {
  const rule =
    cssRule(".jd-offer-summary-grid");

  assert.match(
    rule,
    /grid-template-columns:\s*1fr/
  );

  assert.doesNotMatch(
    rule,
    /repeat\(2/
  );
});


test("offer summary items grow naturally without fixed clipping", () => {
  const rule =
    cssRule(".jd-offer-summary-item");

  assert.match(
    rule,
    /min-width:\s*0/
  );

  assert.doesNotMatch(
    rule,
    /(?:^|[\s;])height:\s*\d+px/
  );
});


test("official offer remains directly accessible", () => {
  assert.match(
    dashboard,
    /Open official offer/
  );

  assert.match(
    dashboard,
    /href=\{job\.link\}/
  );
});


test("popup keeps existing decision context", () => {
  assert.match(
    dashboard,
    /Why this matches/
  );

  assert.match(
    dashboard,
    /Job details/
  );

  assert.match(
    dashboard,
    /Your tracking/
  );
});


test("popup does not fabricate generic offer content", () => {
  assert.doesNotMatch(
    dashboard,
    /You will work on exciting projects/
  );

  assert.doesNotMatch(
    dashboard,
    /Excellent opportunity to develop your career/
  );
});
