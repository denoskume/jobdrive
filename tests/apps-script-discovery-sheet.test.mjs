import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const code=fs.readFileSync("apps-script/DiscoverySheet.gs","utf8");
test("keeps tracking fields neutral on inserts",()=>{assert.match(code,/favorite/);assert.match(code,/followUpDate/);assert.match(code,/notes/);assert.match(code,/lastUpdated/);});
test("reserves X Y Z and AA AH blocks",()=>{assert.match(code,/X:Y:Z/);assert.match(code,/AA:AH/);assert.doesNotMatch(code,/row\[26\]\s*=/);});
test("deduplicates by official URL and fingerprint",()=>{assert.match(code,/byUrl/);assert.match(code,/byFingerprint/);});
