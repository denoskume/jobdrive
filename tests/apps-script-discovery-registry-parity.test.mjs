import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { DISCOVERY_SOURCES } from "../src/discovery/sourceRegistry.mjs";

function loadAppsScriptSeed() {
  const code = fs.readFileSync("apps-script/DiscoveryRegistry.gs", "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.discoverySeedSources_();
}

const identity = (source) => ({
  key: source.sourceKey || source.key,
  company: source.company,
  type: source.sourceType || source.type,
  tenant: source.tenant || "",
  active: Boolean(source.active),
  verifiedAt: source.verifiedAt ? String(source.verifiedAt).slice(0, 10) : "",
  verificationStatus: source.verificationStatus || "",
});

test("browser and Apps Script discovery seed registries are identical", () => {
  const actual = JSON.parse(JSON.stringify(loadAppsScriptSeed().map(identity)));
  const expected = DISCOVERY_SOURCES.map(identity);
  assert.deepEqual(actual, expected);
});
