import {
  COMPANY_IDENTITY_SEEDS,
} from "./companyIdentitySeeds.mjs";

import {
  extractOfficialDomain,
  inferAtsIdentity,
  normalizeDomain,
} from "./companyIdentitySources.mjs";

import {
  getCachedCompanyIdentity,
  setCachedCompanyIdentity,
} from "./companyIdentityCache.mjs";


export function normalizeCompanyName(
  company = ""
) {
  return String(company)
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


export function findSeedIdentity(
  company = ""
) {
  const normalized =
    normalizeCompanyName(company);

  if (!normalized) {
    return null;
  }

  const match =
    Object.entries(
      COMPANY_IDENTITY_SEEDS
    )
      .sort(
        ([aliasA], [aliasB]) =>
          aliasB.length -
          aliasA.length
      )
      .find(([alias]) =>
        normalized.includes(
          normalizeCompanyName(alias)
        )
      );

  if (!match) {
    return null;
  }

  return {
    domain: match[1],
    source: "seed",
    confidence: "medium",
  };
}


function baseIdentity(
  company
) {
  return {
    company:
      String(company || ""),

    normalizedCompany:
      normalizeCompanyName(
        company
      ),

    domain: "",
    logoUrl: "",
    source:
      "fallback",
    confidence:
      "none",
    resolved:
      false,
  };
}


export function resolveCompanyIdentity(
  {
    company = "",
    link = "",
    source = "",
    companyDomain = "",
    logoUrl = "",
  } = {},
  {
    storage,
  } = {}
) {
  const base =
    baseIdentity(company);


  // ---------------------------------------------------------
  // 1. Explicit logo URL
  // ---------------------------------------------------------

  if (logoUrl) {
    const domain =
      normalizeDomain(
        companyDomain
      );

    return {
      ...base,
      domain,
      logoUrl:
        String(logoUrl),
      source:
        "explicit-logo",
      confidence:
        "high",
      resolved:
        true,
    };
  }


  // ---------------------------------------------------------
  // 2. Explicit company domain
  // ---------------------------------------------------------

  if (companyDomain) {
    const domain =
      normalizeDomain(
        companyDomain
      );

    if (domain) {
      const identity = {
        ...base,
        domain,
        source:
          "explicit-domain",
        confidence:
          "high",
        resolved:
          true,
      };

      setCachedCompanyIdentity(
        company,
        identity,
        storage
      );

      return identity;
    }
  }


  // ---------------------------------------------------------
  // 3. Cache
  // ---------------------------------------------------------

  const cached =
    getCachedCompanyIdentity(
      company,
      storage
    );

  if (
    cached &&
    cached.resolved
  ) {
    return {
      ...base,
      ...cached,
      source:
        "cache",
      resolved:
        true,
    };
  }


  // ---------------------------------------------------------
  // 4. Official offer URL
  // ---------------------------------------------------------

  const official =
    extractOfficialDomain(
      link
    );

  if (official) {
    const identity = {
      ...base,
      domain:
        official.domain,
      source:
        official.source,
      confidence:
        official.confidence,
      resolved:
        true,
    };

    setCachedCompanyIdentity(
      company,
      identity,
      storage
    );

    return identity;
  }


  // ---------------------------------------------------------
  // 5. ATS metadata
  // ---------------------------------------------------------

  const ats =
    inferAtsIdentity(
      link
    );

  if (ats) {
    return {
      ...base,
      tenant:
        ats.tenant,
      source:
        ats.source,
      confidence:
        ats.confidence,
      resolved:
        false,
    };
  }


  // ---------------------------------------------------------
  // 6. Seed alias
  // ---------------------------------------------------------

  const seed =
    findSeedIdentity(
      company
    );

  if (seed) {
    const identity = {
      ...base,
      domain:
        seed.domain,
      source:
        seed.source,
      confidence:
        seed.confidence,
      resolved:
        true,
    };

    setCachedCompanyIdentity(
      company,
      identity,
      storage
    );

    return identity;
  }


  // ---------------------------------------------------------
  // 7. Safe fallback
  // ---------------------------------------------------------

  return base;
}
