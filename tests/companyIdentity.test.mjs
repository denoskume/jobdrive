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

import {
  inferAtsIdentity,
} from "../src/companyIdentity/companyIdentitySources.mjs";


test("inferAtsIdentity extracts Greenhouse tenant", () => {
  assert.deepEqual(
    inferAtsIdentity(
      "https://boards.greenhouse.io/examplecompany/jobs/123"
    ),
    {
      tenant: "examplecompany",
      source: "ats",
      confidence: "low",
    }
  );
});


test("inferAtsIdentity extracts Lever tenant", () => {
  assert.deepEqual(
    inferAtsIdentity(
      "https://jobs.lever.co/examplecompany/123"
    ),
    {
      tenant: "examplecompany",
      source: "ats",
      confidence: "low",
    }
  );
});


test("inferAtsIdentity extracts SmartRecruiters tenant", () => {
  assert.deepEqual(
    inferAtsIdentity(
      "https://jobs.smartrecruiters.com/examplecompany/123"
    ),
    {
      tenant: "examplecompany",
      source: "ats",
      confidence: "low",
    }
  );
});


test("inferAtsIdentity extracts Teamtailor tenant", () => {
  assert.deepEqual(
    inferAtsIdentity(
      "https://examplecompany.teamtailor.com/jobs/123"
    ),
    {
      tenant: "examplecompany",
      source: "ats",
      confidence: "low",
    }
  );
});


test("inferAtsIdentity rejects LinkedIn", () => {
  assert.equal(
    inferAtsIdentity(
      "https://linkedin.com/jobs/view/123"
    ),
    null
  );
});


test("inferAtsIdentity rejects malformed URL", () => {
  assert.equal(
    inferAtsIdentity(
      "not-a-url"
    ),
    null
  );
});

import {
  resolveCompanyIdentity,
} from "../src/companyIdentity/companyIdentity.mjs";


function createIdentityStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.has(key)
        ? data.get(key)
        : null;
    },

    setItem(key, value) {
      data.set(
        key,
        String(value)
      );
    },
  };
}


test("resolveCompanyIdentity gives explicit logoUrl highest priority", () => {
  const result =
    resolveCompanyIdentity({
      company: "Example Company",
      logoUrl:
        "https://cdn.example.com/logo.svg",
      companyDomain:
        "example.org",
      link:
        "https://careers.example.com/jobs/1",
    });

  assert.equal(
    result.logoUrl,
    "https://cdn.example.com/logo.svg"
  );

  assert.equal(
    result.domain,
    "example.org"
  );

  assert.equal(
    result.source,
    "explicit-logo"
  );

  assert.equal(
    result.confidence,
    "high"
  );

  assert.equal(
    result.resolved,
    true
  );
});


test("resolveCompanyIdentity uses explicit companyDomain before URL inference", () => {
  const result =
    resolveCompanyIdentity({
      company: "Example Company",
      companyDomain:
        "example.org",
      link:
        "https://careers.example.com/jobs/1",
    });

  assert.equal(
    result.domain,
    "example.org"
  );

  assert.equal(
    result.source,
    "explicit-domain"
  );

  assert.equal(
    result.resolved,
    true
  );
});


test("resolveCompanyIdentity uses cached identity before URL inference", () => {
  const storage =
    createIdentityStorage();

  const cache = {
    "example company": {
      domain:
        "cached-example.com",
      logoUrl: "",
      source:
        "cache-seed",
      confidence:
        "medium",
      resolved:
        true,
      updatedAt:
        new Date().toISOString(),
    },
  };

  storage.setItem(
    "jobdrive.companyIdentity.v2",
    JSON.stringify(cache)
  );

  const result =
    resolveCompanyIdentity(
      {
        company:
          "Example Company",
        link:
          "https://careers.example.com/jobs/1",
      },
      {
        storage,
      }
    );

  assert.equal(
    result.domain,
    "cached-example.com"
  );

  assert.equal(
    result.source,
    "cache"
  );
});


test("resolveCompanyIdentity infers domain from official offer URL", () => {
  const result =
    resolveCompanyIdentity({
      company:
        "Airbus",
      link:
        "https://careers.airbus.com/job/123",
    });

  assert.equal(
    result.domain,
    "airbus.com"
  );

  assert.equal(
    result.source,
    "offer-domain"
  );

  assert.equal(
    result.confidence,
    "high"
  );

  assert.equal(
    result.resolved,
    true
  );
});


test("resolveCompanyIdentity returns ATS metadata without inventing domain", () => {
  const result =
    resolveCompanyIdentity({
      company:
        "Example Company",
      link:
        "https://jobs.lever.co/examplecompany/123",
    });

  assert.equal(
    result.domain,
    ""
  );

  assert.equal(
    result.source,
    "ats"
  );

  assert.equal(
    result.confidence,
    "low"
  );

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.tenant,
    "examplecompany"
  );
});


test("resolveCompanyIdentity falls back to seed alias", () => {
  const result =
    resolveCompanyIdentity({
      company:
        "Parfums Christian Dior",
      link: "",
    });

  assert.equal(
    result.domain,
    "dior.com"
  );

  assert.equal(
    result.source,
    "seed"
  );

  assert.equal(
    result.resolved,
    true
  );
});


test("resolveCompanyIdentity safely returns unresolved identity", () => {
  const result =
    resolveCompanyIdentity({
      company:
        "Completely Unknown Organisation",
      link: "",
    });

  assert.deepEqual(
    result,
    {
      company:
        "Completely Unknown Organisation",
      normalizedCompany:
        "completely unknown organisation",
      domain: "",
      logoUrl: "",
      source:
        "fallback",
      confidence:
        "none",
      resolved:
        false,
    }
  );
});


test("resolveCompanyIdentity caches official URL resolution", () => {
  const storage =
    createIdentityStorage();

  const result =
    resolveCompanyIdentity(
      {
        company:
          "Airbus",
        link:
          "https://careers.airbus.com/job/123",
      },
      {
        storage,
      }
    );

  assert.equal(
    result.domain,
    "airbus.com"
  );

  const raw =
    storage.getItem(
      "jobdrive.companyIdentity.v2"
    );

  assert.ok(raw);

  const parsed =
    JSON.parse(raw);

  assert.equal(
    parsed.airbus.domain,
    "airbus.com"
  );
});

import {
  buildLogoCandidates,
} from "../src/companyIdentity/companyIdentitySources.mjs";


test("buildLogoCandidates puts explicit logo before favicon", () => {
  assert.deepEqual(
    buildLogoCandidates({
      logoUrl:
        "https://cdn.example.com/logo.svg",
      domain:
        "example.com",
    }),
    [
      "https://cdn.example.com/logo.svg",
      "https://www.google.com/s2/favicons?domain_url=https://example.com&sz=128",
    ]
  );
});


test("buildLogoCandidates creates favicon from domain", () => {
  assert.deepEqual(
    buildLogoCandidates({
      domain:
        "airbus.com",
    }),
    [
      "https://www.google.com/s2/favicons?domain_url=https://airbus.com&sz=128",
    ]
  );
});


test("buildLogoCandidates removes duplicate candidates", () => {
  const url =
    "https://cdn.example.com/logo.svg";

  assert.deepEqual(
    buildLogoCandidates({
      logoUrl: url,
      logoCandidates: [
        url,
        url,
      ],
    }),
    [
      url,
    ]
  );
});


test("buildLogoCandidates tolerates empty identity", () => {
  assert.deepEqual(
    buildLogoCandidates({}),
    []
  );
});


test("buildLogoCandidates never creates initials", () => {
  const result =
    buildLogoCandidates({
      domain: "",
      logoUrl: "",
    });

  assert.deepEqual(
    result,
    []
  );
});
