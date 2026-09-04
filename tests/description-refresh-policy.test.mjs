import test from "node:test";
import assert from "node:assert/strict";

import {
  shouldRefreshDescription,
} from "../src/offerDescription/descriptionRefreshPolicy.mjs";


test("does not refresh a live description with stored raw content", () => {
  const job = {
    descriptionStatus: "live",
    descriptionRaw: "Real offer description",
    status: "Nouveau",
  };

  assert.equal(
    shouldRefreshDescription(job),
    false
  );
});


test("refreshes when description is completely missing", () => {
  const job = {
    descriptionStatus: "",
    descriptionRaw: "",
    status: "Nouveau",
  };

  assert.equal(
    shouldRefreshDescription(job),
    true
  );
});


test("refreshes when description status is unavailable", () => {
  const job = {
    descriptionStatus: "unavailable",
    descriptionRaw: "",
    status: "Nouveau",
  };

  assert.equal(
    shouldRefreshDescription(job),
    true
  );
});


test("does not refresh an expired job with a valid stored description", () => {
  const job = {
    descriptionStatus: "cached",
    descriptionRaw: "Previously stored real description",
    status: "Expiré",
  };

  assert.equal(
    shouldRefreshDescription(job),
    false
  );
});


test("refreshes an expired job only when no valid description exists", () => {
  const job = {
    descriptionStatus: "unavailable",
    descriptionRaw: "",
    status: "Expiré",
  };

  assert.equal(
    shouldRefreshDescription(job),
    true
  );
});


test("treats whitespace-only raw description as missing", () => {
  const job = {
    descriptionStatus: "live",
    descriptionRaw: "   ",
    status: "Nouveau",
  };

  assert.equal(
    shouldRefreshDescription(job),
    true
  );
});


test("tolerates undefined job input", () => {
  assert.equal(
    shouldRefreshDescription(),
    true
  );
});
