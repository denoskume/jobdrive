import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Companies navigation activates the companies view", () => {
  const dashboard = fs.readFileSync("src/JobDriveDashboard.jsx", "utf8");
  assert.match(dashboard, /onViewChange\("companies"\)/);
  assert.match(dashboard, /view === "companies"/);
});

test("AppPro loads target companies without coupling failure to jobs", () => {
  const app = fs.readFileSync("src/AppPro.jsx", "utf8");
  assert.match(app, /readTargetCompanies/);
  assert.match(app, /normalizeTargetCompanyRows/);
  assert.match(app, /targetCompaniesError/);
  assert.match(app, /TargetCompaniesView/);
  assert.match(app, /targetCompanyRead[\s\S]*catch\(\(readError\)/);
});

test("company names open official careers destinations in a safe new tab", () => {
  const view = fs.readFileSync("src/companies/TargetCompaniesView.jsx", "utf8");
  assert.match(view, /href=\{company\.careersUrl\}/);
  assert.match(view, /target="_blank"/);
  assert.match(view, /rel="noopener noreferrer"/);
  assert.match(view, /company\.companyName/);
});
