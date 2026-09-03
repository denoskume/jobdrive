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
