import test from "node:test";
import assert from "node:assert/strict";

import {
  mergeDescriptionSnapshot,
} from "../src/offerDescription/descriptionSnapshot.mjs";

const existing = {
  descriptionRaw:
    "Stored official description",
  about:
    "Stored company context",
  roleMission:
    "Stored mission",
  expectations:
    "Stored expectations",
  mustHaveSkills:
    "Python; PyTorch",
  descriptionSource:
    "official",
  descriptionFetchedAt:
    "2026-09-01T10:00:00Z",
  descriptionStatus:
    "live",
};


test("stores a valid incoming description on empty snapshot", () => {
  const result =
    mergeDescriptionSnapshot(
      {},
      {
        descriptionRaw:
          "New official description",
        about:
          "New company context",
        roleMission:
          "Develop ML systems",
        expectations:
          "Final-year MSc",
        mustHaveSkills:
          "Python; Git",
        descriptionSource:
          "official",
        descriptionFetchedAt:
          "2026-09-04T12:00:00Z",
        descriptionStatus:
          "live",
      }
    );

  assert.equal(
    result.descriptionRaw,
    "New official description"
  );

  assert.equal(
    result.about,
    "New company context"
  );

  assert.equal(
    result.descriptionStatus,
    "live"
  );
});


test("failed refresh preserves existing description", () => {
  const result =
    mergeDescriptionSnapshot(
      existing,
      {
        descriptionRaw: "",
        descriptionStatus:
          "unavailable",
      }
    );

  assert.equal(
    result.descriptionRaw,
    existing.descriptionRaw
  );

  assert.equal(
    result.about,
    existing.about
  );

  assert.equal(
    result.mustHaveSkills,
    existing.mustHaveSkills
  );

  assert.equal(
    result.descriptionStatus,
    "cached"
  );
});


test("empty incoming description never erases stored snapshot", () => {
  const result =
    mergeDescriptionSnapshot(
      existing,
      {}
    );

  assert.equal(
    result.descriptionRaw,
    existing.descriptionRaw
  );

  assert.equal(
    result.roleMission,
    existing.roleMission
  );

  assert.equal(
    result.descriptionFetchedAt,
    existing.descriptionFetchedAt
  );
});


test("expired offer keeps previous snapshot as cached", () => {
  const result =
    mergeDescriptionSnapshot(
      existing,
      {
        descriptionStatus:
          "expired",
        descriptionRaw: "",
      }
    );

  assert.equal(
    result.descriptionRaw,
    "Stored official description"
  );

  assert.equal(
    result.descriptionStatus,
    "cached"
  );
});


test("first failure without existing snapshot becomes unavailable", () => {
  const result =
    mergeDescriptionSnapshot(
      {},
      {
        descriptionRaw: "",
        descriptionStatus:
          "unavailable",
      }
    );

  assert.equal(
    result.descriptionRaw,
    ""
  );

  assert.equal(result.about, "");
  assert.equal(result.roleMission, "");
  assert.equal(result.expectations, "");
  assert.equal(result.mustHaveSkills, "");

  assert.equal(
    result.descriptionStatus,
    "unavailable"
  );
});
