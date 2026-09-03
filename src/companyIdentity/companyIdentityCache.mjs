import {
  normalizeCompanyName,
} from "./companyIdentity.mjs";


export const CACHE_KEY =
  "jobdrive.companyIdentity.v1";


function resolveStorage(
  storage
) {
  if (storage) {
    return storage;
  }

  try {
    return globalThis
      .localStorage || null;
  } catch {
    return null;
  }
}


function readCache(
  storage
) {
  const target =
    resolveStorage(storage);

  if (!target) {
    return {};
  }


  try {
    const raw =
      target.getItem(
        CACHE_KEY
      );

    if (!raw) {
      return {};
    }

    const parsed =
      JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed;

  } catch {
    return {};
  }
}


function writeCache(
  cache,
  storage
) {
  const target =
    resolveStorage(storage);

  if (!target) {
    return false;
  }


  try {
    target.setItem(
      CACHE_KEY,
      JSON.stringify(cache)
    );

    return true;

  } catch {
    return false;
  }
}


export function getCachedCompanyIdentity(
  company,
  storage
) {
  const key =
    normalizeCompanyName(
      company
    );

  if (!key) {
    return null;
  }


  const cache =
    readCache(storage);

  const identity =
    cache[key];


  if (
    !identity ||
    typeof identity !==
      "object"
  ) {
    return null;
  }


  return identity;
}


export function setCachedCompanyIdentity(
  company,
  identity,
  storage
) {
  const key =
    normalizeCompanyName(
      company
    );

  if (
    !key ||
    !identity ||
    typeof identity !==
      "object"
  ) {
    return false;
  }


  const cache =
    readCache(storage);


  cache[key] = {
    domain:
      identity.domain || "",

    logoUrl:
      identity.logoUrl || "",

    source:
      identity.source || "",

    confidence:
      identity.confidence || "",

    resolved:
      Boolean(
        identity.resolved
      ),

    updatedAt:
      new Date()
        .toISOString(),
  };


  return writeCache(
    cache,
    storage
  );
}
