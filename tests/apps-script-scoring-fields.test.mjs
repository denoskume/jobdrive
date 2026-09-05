import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const discovery = fs.readFileSync("apps-script/Discovery.gs", "utf8");
const sheet = fs.readFileSync("apps-script/DiscoverySheet.gs", "utf8");
const api = fs.readFileSync("apps-script/Code.gs", "utf8");

test("discovery delegates weighted scoring to the Phase 2B scorer", () => {
  assert.match(discovery, /scoreInternshipCandidate_\s*\(/);
  assert.doesNotMatch(discovery, /function\s+scoreDiscoveryCandidate_\s*\(/);
  assert.match(discovery, /scored\.fitScore\s*<\s*75/);
});

test("discovery keeps France as a mandatory orchestration gate", () => {
  assert.match(discovery, /france\|paris\|nantes\|lyon\|toulouse\|bordeaux/i);
  assert.match(discovery, /reason\s*:\s*["']country["']/);
  assert.match(discovery, /rejectedByCountry/);
});

test("discovery keeps explicit internship-positive gating before scoring", () => {
  assert.match(
    discovery,
    /intern\|internship\|stage\|stagiaire\|final\.\?year\|fin d\[/
  );
  assert.match(discovery, /reason\s*:\s*["']internship_type["']/);
});

test("Sheet insert expands to AI:AN without taking ownership of tracking fields", () => {
  assert.match(sheet, /Array\(40\)\.fill\(["']{2}\)/);
  assert.match(sheet, /row\[34\]\s*=\s*scored\.grade/);
  assert.match(sheet, /row\[35\]\s*=\s*JSON\.stringify\(scored\.scoreBreakdown/);
  assert.match(sheet, /row\[36\]\s*=\s*JSON\.stringify\(scored\.strengths/);
  assert.match(sheet, /row\[37\]\s*=\s*JSON\.stringify\(scored\.weaknesses/);
  assert.match(sheet, /row\[38\]\s*=\s*scored\.scoringVersion/);
  assert.match(sheet, /row\[39\]\s*=/);

  assert.doesNotMatch(sheet, /row\[18\]\s*=\s*scored/);
  assert.doesNotMatch(sheet, /row\[19\]\s*=\s*scored/);
  assert.doesNotMatch(sheet, /row\[20\]\s*=\s*scored/);
  assert.doesNotMatch(sheet, /row\[21\]\s*=\s*scored/);
  assert.doesNotMatch(sheet, /row\[22\]\s*=\s*scored/);
});

test("Apps Script defines exact scoring headers in AI through AN", () => {
  assert.match(sheet, /function\s+ensureDiscoveryScoringHeaders_/);
  for (const header of [
    "scoreGrade",
    "scoreBreakdown",
    "scoringStrengths",
    "scoringWeaknesses",
    "scoringVersion",
    "scoringUpdatedAt",
  ]) {
    assert.match(sheet, new RegExp(`["]${header}["]`));
  }
  assert.match(sheet, /getRange\(1\s*,\s*35\s*,\s*1\s*,\s*6\)/);
});

test("discovery initializes scoring headers without changing the trigger contract", () => {
  assert.match(discovery, /ensureDiscoveryScoringHeaders_\(sheet\)/);
  assert.match(discovery, /everyHours\(12\)/);
  assert.match(discovery, /runJobDriveDiscovery/);
});

test("Apps Script read API exposes persisted scoring metadata", () => {
  assert.match(api, /scoreGrade\s*:\s*row\[34\]/);
  assert.match(api, /scoreBreakdown\s*:\s*row\[35\]/);
  assert.match(api, /scoringStrengths\s*:\s*row\[36\]/);
  assert.match(api, /scoringWeaknesses\s*:\s*row\[37\]/);
  assert.match(api, /scoringVersion\s*:\s*row\[38\]/);
  assert.match(api, /scoringUpdatedAt\s*:\s*row\[39\]/);
});
