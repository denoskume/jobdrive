import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeCompanyName,
  findSeedIdentity,
} from "../src/companyIdentity/companyIdentity.mjs";


test("normalizeCompanyName removes accents and punctuation", () => {
  assert.equal(
    normalizeCompanyName("Société Générale S.A."),
    "societe generale s a"
  );
});


test("normalizeCompanyName collapses whitespace", () => {
  assert.equal(
    normalizeCompanyName(
      "  Parfums   Christian   Dior "
    ),
    "parfums christian dior"
  );
});


test("findSeedIdentity resolves Dior alias", () => {
  assert.deepEqual(
    findSeedIdentity(
      "Parfums Christian Dior"
    ),
    {
      domain: "dior.com",
      source: "seed",
      confidence: "medium",
    }
  );
});


test("findSeedIdentity resolves accented alias", () => {
  assert.deepEqual(
    findSeedIdentity(
      "Dassault Systèmes"
    ),
    {
      domain: "3ds.com",
      source: "seed",
      confidence: "medium",
    }
  );
});


test("findSeedIdentity resolves IFPEN alias", () => {
  assert.deepEqual(
    findSeedIdentity(
      "IFP Energies nouvelles"
    ),
    {
      domain:
        "ifpenergiesnouvelles.com",
      source: "seed",
      confidence: "medium",
    }
  );
});


test("findSeedIdentity resolves FBK alias", () => {
  assert.deepEqual(
    findSeedIdentity(
      "Fondazione Bruno Kessler (FBK)"
    ),
    {
      domain: "fbk.eu",
      source: "seed",
      confidence: "medium",
    }
  );
});


test("findSeedIdentity returns null for unknown company", () => {
  assert.equal(
    findSeedIdentity(
      "Example Industrial AI"
    ),
    null
  );
});

import {
  normalizeDomain,
  extractOfficialDomain,
} from "../src/companyIdentity/companyIdentitySources.mjs";


test("normalizeDomain removes www prefix", () => {
  assert.equal(
    normalizeDomain("www.airbus.com"),
    "airbus.com"
  );
});


test("normalizeDomain removes careers subdomain", () => {
  assert.equal(
    normalizeDomain("careers.airbus.com"),
    "airbus.com"
  );
});


test("normalizeDomain removes jobs subdomain", () => {
  assert.equal(
    normalizeDomain("jobs.alstom.com"),
    "alstom.com"
  );
});


test("extractOfficialDomain resolves direct official URL", () => {
  assert.deepEqual(
    extractOfficialDomain(
      "https://careers.airbus.com/job/123"
    ),
    {
      domain: "airbus.com",
      source: "offer-domain",
      confidence: "high",
    }
  );
});


test("extractOfficialDomain resolves jobs subdomain", () => {
  assert.deepEqual(
    extractOfficialDomain(
      "https://jobs.alstom.com/job/Paris-Internship/123"
    ),
    {
      domain: "alstom.com",
      source: "offer-domain",
      confidence: "high",
    }
  );
});


test("extractOfficialDomain rejects LinkedIn", () => {
  assert.equal(
    extractOfficialDomain(
      "https://www.linkedin.com/jobs/view/123"
    ),
    null
  );
});


test("extractOfficialDomain rejects Indeed", () => {
  assert.equal(
    extractOfficialDomain(
      "https://fr.indeed.com/viewjob?jk=123"
    ),
    null
  );
});


test("extractOfficialDomain rejects Greenhouse intermediary", () => {
  assert.equal(
    extractOfficialDomain(
      "https://boards.greenhouse.io/example/jobs/123"
    ),
    null
  );
});


test("extractOfficialDomain rejects malformed URLs", () => {
  assert.equal(
    extractOfficialDomain(
      "not-a-valid-url"
    ),
    null
  );
});
