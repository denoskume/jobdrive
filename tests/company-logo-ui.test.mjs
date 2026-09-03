import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const component =
  fs.readFileSync(
    "src/components/CompanyLogo.jsx",
    "utf8"
  );


test("CompanyLogo uses company identity resolver", () => {
  assert.match(
    component,
    /resolveCompanyIdentity/
  );
});


test("CompanyLogo uses logo candidate builder", () => {
  assert.match(
    component,
    /buildLogoCandidates/
  );
});


test("CompanyLogo resets candidate when identity changes", () => {
  assert.match(
    component,
    /useEffect/
  );

  assert.match(
    component,
    /setCandidateIndex\(0\)/
  );
});


test("CompanyLogo advances to next candidate after image error", () => {
  assert.match(
    component,
    /onError/
  );

  assert.match(
    component,
    /setCandidateIndex/
  );
});


test("CompanyLogo renders neutral fallback", () => {
  assert.match(
    component,
    /jd-company-logo-fallback/
  );
});


test("CompanyLogo never generates company initials", () => {
  assert.doesNotMatch(
    component,
    /companyInitials/
  );
});


test("CompanyLogo accepts company identity inputs", () => {
  assert.match(
    component,
    /companyDomain/
  );

  assert.match(
    component,
    /logoUrl/
  );

  assert.match(
    component,
    /link/
  );

  assert.match(
    component,
    /source/
  );
});
