import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(
  "src/jobdrive-dashboard.css",
  "utf8"
);

test("matches reference sidebar geometry", () => {
  assert.match(
    css,
    /--jd-sidebar-width:\s*204px/
  );
});

test("matches reference feed detail ratio", () => {
  assert.match(
    css,
    /grid-template-columns:\s*37%\s+63%/
  );
});

test("uses compact reference KPI strip", () => {
  assert.match(
    css,
    /\.jd-kpis[\s\S]*height:\s*110px/
  );

  assert.match(
    css,
    /\.jd-kpi[\s\S]*height:\s*88px/
  );
});

test("job content cannot overflow cards", () => {
  assert.match(
    css,
    /\.jd-job-body[\s\S]*overflow:\s*hidden/
  );

  assert.match(
    css,
    /-webkit-line-clamp:\s*3/
  );
});
