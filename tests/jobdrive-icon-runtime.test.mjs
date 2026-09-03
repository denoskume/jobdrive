import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(
  "src/JobDriveDashboard.jsx",
  "utf8"
);

test("dashboard defines Icon before using it", () => {
  assert.match(
    app,
    /function Icon\s*\(/
  );

  const definition =
    app.indexOf("function Icon");

  const firstUsage =
    app.indexOf("<Icon");

  assert.ok(definition >= 0);
  assert.ok(firstUsage >= 0);
  assert.ok(definition < firstUsage);
});
