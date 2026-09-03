import test from "node:test";
import assert from "node:assert/strict";

import {
  CACHE_KEY,
  getCachedCompanyIdentity,
  setCachedCompanyIdentity,
} from "../src/companyIdentity/companyIdentityCache.mjs";


function createStorage() {
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

    removeItem(key) {
      data.delete(key);
    },
  };
}


test("uses versioned cache key", () => {
  assert.equal(
    CACHE_KEY,
    "jobdrive.companyIdentity.v1"
  );
});


test("cache saves and retrieves company identity", () => {
  const storage =
    createStorage();

  setCachedCompanyIdentity(
    "Airbus",
    {
      domain:
        "airbus.com",
      logoUrl:
        "https://example.com/airbus.svg",
      source:
        "offer-domain",
      confidence:
        "high",
      resolved:
        true,
    },
    storage
  );

  const result =
    getCachedCompanyIdentity(
      "Airbus",
      storage
    );

  assert.equal(
    result.domain,
    "airbus.com"
  );

  assert.equal(
    result.logoUrl,
    "https://example.com/airbus.svg"
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

  assert.equal(
    typeof result.updatedAt,
    "string"
  );

  assert.equal(
    Number.isNaN(
      Date.parse(result.updatedAt)
    ),
    false
  );
});


test("cache keys are normalized", () => {
  const storage =
    createStorage();

  setCachedCompanyIdentity(
    "Société Générale",
    {
      domain:
        "societegenerale.com",
      resolved:
        true,
    },
    storage
  );

  const result =
    getCachedCompanyIdentity(
      "societe generale",
      storage
    );

  assert.equal(
    result.domain,
    "societegenerale.com"
  );
});


test("cache returns null for unknown company", () => {
  const storage =
    createStorage();

  assert.equal(
    getCachedCompanyIdentity(
      "Unknown Company",
      storage
    ),
    null
  );
});


test("cache tolerates corrupted JSON", () => {
  const storage =
    createStorage();

  storage.setItem(
    CACHE_KEY,
    "{bad-json"
  );

  assert.equal(
    getCachedCompanyIdentity(
      "Airbus",
      storage
    ),
    null
  );
});


test("cache write tolerates broken storage", () => {
  const storage = {
    getItem() {
      throw new Error(
        "storage unavailable"
      );
    },

    setItem() {
      throw new Error(
        "storage unavailable"
      );
    },
  };

  assert.doesNotThrow(() => {
    setCachedCompanyIdentity(
      "Airbus",
      {
        domain:
          "airbus.com",
        resolved:
          true,
      },
      storage
    );
  });
});


test("cache read tolerates broken storage", () => {
  const storage = {
    getItem() {
      throw new Error(
        "storage unavailable"
      );
    },
  };

  assert.equal(
    getCachedCompanyIdentity(
      "Airbus",
      storage
    ),
    null
  );
});
