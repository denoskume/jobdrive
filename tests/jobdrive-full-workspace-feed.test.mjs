import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(
  "src/jobdrive-dashboard.css",
  "utf8"
);

test("dashboard uses dynamic viewport height", () => {
  assert.match(
    css,
    /\.jd-main\s*\{[\s\S]*?height:\s*100dvh/
  );
});

test("internship workspace consumes remaining dashboard space", () => {
  assert.match(
    css,
    /\.jd-workspace\.jd-internship-stage\s*\{[\s\S]*?flex:\s*1 1 auto/
  );
});

test("internship list owns remaining vertical feed space", () => {
  assert.match(
    css,
    /\.jd-internship-stage \.jd-job-list\s*\{[\s\S]*?flex:\s*1 1 0/
  );

  assert.match(
    css,
    /\.jd-internship-stage \.jd-job-list\s*\{[\s\S]*?overflow-y:\s*auto/
  );
});

test("internship rows grow from their real content", () => {
  assert.match(
    css,
    /grid-auto-rows:\s*max-content/
  );
});

test("internship cards are not fixed-height clipped", () => {
  assert.match(
    css,
    /\.jd-internship-stage \.jd-job-card\s*\{[\s\S]*?height:\s*auto/
  );

  assert.match(
    css,
    /\.jd-internship-stage \.jd-job-card\s*\{[\s\S]*?overflow:\s*visible/
  );
});

test("short laptop viewports receive compact geometry", () => {
  assert.match(
    css,
    /@media \(max-height:\s*800px\)/
  );
});
