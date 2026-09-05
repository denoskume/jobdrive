import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const code=fs.readFileSync("apps-script/Discovery.gs","utf8");
test("defines browser-independent runner",()=>assert.match(code,/function runJobDriveDiscovery\(\)/));
test("isolates source errors",()=>{assert.match(code,/sourceErrors/);assert.match(code,/try\s*{/);});
test("installs twice-daily trigger",()=>{assert.match(code,/function installJobDriveDiscoveryTrigger\(\)/);assert.match(code,/everyHours\(12\)/);});
