import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const code = fs.readFileSync(
  "apps-script/Code.gs",
  "utf8"
);


test("Apps Script exposes persisted description fields", () => {
  assert.match(code, /descriptionRaw\s*:\s*row\[26\]/);
  assert.match(code, /about\s*:\s*row\[27\]/);
  assert.match(code, /roleMission\s*:\s*row\[28\]/);
  assert.match(code, /expectations\s*:\s*row\[29\]/);
  assert.match(code, /mustHaveSkills\s*:\s*row\[30\]/);
  assert.match(code, /descriptionSource\s*:\s*row\[31\]/);
  assert.match(code, /descriptionFetchedAt\s*:\s*row\[32\]/);
  assert.match(code, /descriptionStatus\s*:\s*row\[33\]/);
});


test("historical short rows use safe empty fallbacks", () => {
  assert.match(code, /descriptionRaw\s*:\s*row\[26\]\s*\|\|\s*""/);
  assert.match(code, /about\s*:\s*row\[27\]\s*\|\|\s*""/);
  assert.match(code, /roleMission\s*:\s*row\[28\]\s*\|\|\s*""/);
  assert.match(code, /expectations\s*:\s*row\[29\]\s*\|\|\s*""/);
  assert.match(code, /mustHaveSkills\s*:\s*row\[30\]\s*\|\|\s*""/);
  assert.match(code, /descriptionSource\s*:\s*row\[31\]\s*\|\|\s*""/);
  assert.match(code, /descriptionFetchedAt\s*:\s*row\[32\]\s*\|\|\s*""/);
  assert.match(code, /descriptionStatus\s*:\s*row\[33\]\s*\|\|\s*""/);
});


test("existing job fields remain present", () => {
  assert.match(code, /id\s*:\s*row\[0\]/);
  assert.match(code, /company\s*:\s*row\[2\]/);
  assert.match(code, /role\s*:\s*row\[3\]/);
  assert.match(code, /link\s*:\s*row\[15\]/);
  assert.match(code, /source\s*:\s*row\[16\]/);
  assert.match(code, /detectedDate\s*:\s*row\[17\]/);
});
