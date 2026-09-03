import {
  COMPANY_IDENTITY_SEEDS,
} from "./companyIdentitySeeds.mjs";


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
