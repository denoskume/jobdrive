import test from "node:test";
import assert from "node:assert/strict";
import { DISCOVERY_SOURCES, activeDiscoverySources } from "../src/discovery/sourceRegistry.mjs";

test("discovery registry keys are unique", () => {
  const keys = DISCOVERY_SOURCES.map((source) => source.key);
  assert.equal(new Set(keys).size, keys.length);
});

test("every active source is explicitly verified", () => {
  for (const source of activeDiscoverySources()) {
    assert.equal(source.active, true);
    assert.equal(source.verificationStatus, "verified");
    assert.match(source.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(source.tenant || source.endpoint);
  }
});

test("unverified sources can never be returned as active", () => {
  assert.ok(DISCOVERY_SOURCES.some((source) => source.verificationStatus !== "verified"));
  assert.ok(activeDiscoverySources().every((source) => source.verificationStatus === "verified"));
});

test("registry keeps at least four supported ATS families represented", () => {
  const types = new Set(DISCOVERY_SOURCES.map((source) => source.type));
  for (const type of ["ashby", "greenhouse", "lever", "smartrecruiters"]) assert.ok(types.has(type));
});
