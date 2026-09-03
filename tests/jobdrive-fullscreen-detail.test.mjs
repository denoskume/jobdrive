import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(
  "src/JobDriveDashboard.jsx",
  "utf8"
);

const css = fs.readFileSync(
  "src/jobdrive-dashboard.css",
  "utf8"
);

test("internship feed uses full workspace", () => {
  assert.match(app, /jd-internship-stage/);
  assert.match(css, /\.jd-internship-stage/);
  assert.match(css, /grid-template-columns:\s*1fr/);
});

test("job details open in fullscreen modal", () => {
  assert.match(app, /jd-detail-modal/);
  assert.match(app, /jd-detail-backdrop/);
  assert.match(app, /jd-detail-close/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /inset:\s*0/);
});

test("fullscreen detail supports escape close", () => {
  assert.match(app, /event\.key === "Escape"/);
});

test("internship list uses spacious desktop cards", () => {
  assert.match(
    css,
    /\.jd-job-list[\s\S]*grid-template-columns:\s*repeat\(2/
  );
});

test("imports React hooks required by fullscreen details", () => {
  assert.match(
    app,
    /import\s*{[\s\S]*useEffect[\s\S]*useState[\s\S]*}\s*from\s*"react"/
  );
});
