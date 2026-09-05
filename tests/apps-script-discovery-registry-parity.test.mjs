import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { DISCOVERY_SOURCES } from "../src/discovery/sourceRegistry.mjs";

function loadAppsScriptSources() {
  const code = fs.readFileSync("apps-script/Discovery.gs", "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(code.split("function discoveryText_")[0], context);
  return context.JOBDRIVE_DISCOVERY_SOURCES_;
}

const identity = (source) => ({
  key: source.key,
  company: source.company,
  type: source.type,
  tenant: source.tenant || "",
  endpoint: source.endpoint || "",
  active: Boolean(source.active),
  verifiedAt: source.verifiedAt || "",
  verificationStatus: source.verificationStatus || "",
});

test("browser and Apps Script discovery registries are identical", () => {
  assert.deepEqual(loadAppsScriptSources().map(identity), DISCOVERY_SOURCES.map(identity));
});
