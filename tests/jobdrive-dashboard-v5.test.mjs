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

test("uses isolated jd namespace", () => {
  assert.match(dashboard, /jd-shell/);
  assert.match(dashboard, /jd-sidebar/);
  assert.match(dashboard, /jd-kpis/);
  assert.match(dashboard, /jd-feed/);
  assert.match(dashboard, /jd-detail/);
});

test("uses SVG icons instead of symbol characters", () => {
  assert.match(dashboard, /function Icon/);
  assert.match(dashboard, /<svg/);
  assert.match(dashboard, /viewBox="0 0 24 24"/);
});

test("renders company logos through reusable CompanyLogo", () => {
  assert.match(
    dashboard,
    /import CompanyLogo from "\.\/components\/CompanyLogo\.jsx"/
  );

  assert.match(
    dashboard,
    /<CompanyLogo/
  );
});

test("renders complete dashboard structure", () => {
  assert.match(dashboard, /TOTAL INTERNSHIPS/);
  assert.match(dashboard, /HIGH MATCH/);
  assert.match(dashboard, /APPLIED/);
  assert.match(dashboard, /INTERVIEWS/);
  assert.match(dashboard, /OFFERS/);
  assert.match(dashboard, /Why this matches/);
  assert.match(dashboard, /Job details/);
  assert.match(dashboard, /Your tracking/);
  assert.match(dashboard, /Skills & technologies/);
});

test("matches reference desktop geometry", () => {
  assert.match(css, /--jd-sidebar-width:\s*204px/);
  assert.match(css, /grid-template-columns:\s*37%\s+63%/);
  assert.match(css, /--jd-topbar-height:\s*68px/);
});
