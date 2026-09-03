import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(
  "src/JobDriveDashboard.jsx",
  "utf8"
);

test("fullscreen modal state is declared before use", () => {
  assert.match(
    app,
    /const\s+\[detailJobId,\s*setDetailJobId\]\s*=\s*useState/
  );

  assert.match(
    app,
    /const\s+modalJob\s*=/
  );

  assert.match(
    app,
    /const\s+openJobDetail\s*=/
  );

  assert.match(
    app,
    /const\s+closeJobDetail\s*=/
  );
});
