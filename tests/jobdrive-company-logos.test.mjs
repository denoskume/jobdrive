import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard =
  fs.readFileSync(
    "src/JobDriveDashboard.jsx",
    "utf8"
  );


test("dashboard imports reusable CompanyLogo", () => {
  assert.match(
    dashboard,
    /import CompanyLogo from "\.\/components\/CompanyLogo\.jsx";/
  );
});


test("dashboard passes complete identity metadata to CompanyLogo", () => {
  assert.match(
    dashboard,
    /<CompanyLogo[\s\S]*company=\{job\.company\}[\s\S]*link=\{job\.link\}[\s\S]*source=\{job\.source\}[\s\S]*companyDomain=\{job\.companyDomain\}[\s\S]*logoUrl=\{job\.logoUrl\}/
  );
});


test("dashboard no longer contains manual company resolver", () => {
  assert.doesNotMatch(
    dashboard,
    /const COMPANY_DOMAINS/
  );

  assert.doesNotMatch(
    dashboard,
    /function companyKey/
  );

  assert.doesNotMatch(
    dashboard,
    /function companyDomain/
  );

  assert.doesNotMatch(
    dashboard,
    /function CompanyLogo/
  );
});


test("dashboard contains no company-specific logo domains", () => {
  assert.doesNotMatch(
    dashboard,
    /airbus\.com|alstom\.com|dior\.com|mistral\.ai|fbk\.eu/
  );
});
