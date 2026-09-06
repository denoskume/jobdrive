import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("sheets API reads Target Companies A:R independently", () => {
  const source = fs.readFileSync("src/services/sheetsApi.js", "utf8");
  assert.match(source, /const TARGET_COMPANIES_SHEET = "Target Companies"/);
  assert.match(source, /export async function readTargetCompanies/);
  assert.ok(source.includes("range: `'${TARGET_COMPANIES_SHEET}'!A:R`"));
});
