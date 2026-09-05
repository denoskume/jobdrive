# JobDrive Phase 2B Scoring Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JobDrive's coarse internship score with a deterministic, explainable M2 DASSIP/CORO scoring engine, persist its metadata, and rank eligible opportunities by fit first.

**Architecture:** Add pure ES-module scoring units under `src/scoring/` for evidence collection, hard eligibility, domain classification and weighted scoring. Mirror the same deterministic contract in `apps-script/Scoring.gs`, enforce parity with fixture-driven tests, then make `Discovery.gs` orchestrate the scorer and `DiscoverySheet.gs` persist AI:AN metadata without touching user-owned tracking fields. The React dashboard only reads the new metadata, makes recommended ranking the default, and exposes a compact Fit Intelligence section without changing the offer-description source of truth.

**Tech Stack:** JavaScript ES modules, Google Apps Script, React 19, Google Sheets API, Node.js built-in test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-09-05-phase2b-scoring-engine-design.md`

## Global Constraints

- Scoring weights are exactly 45 / 20 / 15 / 10 / 5 / 5 for alignment, technical quality, company/environment quality, practical fit, freshness/deadline, compensation.
- Hard gates run before weighted scoring; academic/research-lab, explicitly defense/military, wrong employment-type and clearly off-target internships cannot be rescued by score.
- Automatic discovery persists only eligible opportunities with `fitScore >= 75`.
- Grades are A 90–100, B 80–89, C 75–79, D below 75.
- Default application priority is Haute >=85, Moyenne 75–84, Basse below 75; deadline urgency may affect ranking tie-breaks but not `fitScore`.
- Missing compensation and missing publication date are neutral, not hard negatives.
- No paid API, no LLM dependency, no LinkedIn/Indeed scraping, no invented offer facts.
- Existing tracking columns S:W remain user/runtime owned and must never be overwritten by discovery scoring.
- Existing business columns X:Z and description columns AA:AH remain unchanged; new scoring metadata occupies AI:AN.
- Existing discovery source registry and 12-hour trigger handler remain unchanged.
- `npm test`, `npm run build`, and `git diff --check` must pass before merge.

---

### Task 1: Build the pure scoring core with hard gates and domain classification

**Files:**
- Create: `src/scoring/scoringConfig.mjs`
- Create: `src/scoring/scoringEvidence.mjs`
- Create: `src/scoring/domainClassifier.mjs`
- Create: `src/scoring/eligibility.mjs`
- Create: `src/scoring/scoringEngine.mjs`
- Create: `tests/scoring-engine.test.mjs`

**Interfaces:**
- `collectScoringEvidence(candidate)` -> `{ text, organizationText, technicalText, practicalText, compensationText }`.
- `classifyInternshipDomain(evidence)` -> `{ domain, signals, confidence }`.
- `evaluateEligibility(candidate, evidence, classification)` -> `{ accepted, rejectionReason, rejectionSignals }`.
- `scoreInternship(candidate, { now } = {})` -> accepted or rejected contract from the spec.
- `SCORING_VERSION` is exactly `"2.0"`.

- [ ] **Step 1: Write failing tests for hard-gate policy and accepted core domains.** Use explicit bilingual fixtures rather than title-only assertions:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { scoreInternship } from "../src/scoring/scoringEngine.mjs";

const now = new Date("2026-09-05T12:00:00Z");

function candidate(overrides = {}) {
  return {
    company: "Industrial AI Company",
    role: "Machine Learning Intern",
    location: "Paris, France",
    contract: "Internship",
    postedDate: "2026-09-01",
    deadline: "2026-10-01",
    compensation: "",
    descriptionRaw:
      "Final-year Master internship. Train and evaluate PyTorch models with an R&D engineering team on an industrial product.",
    roleMission: "Train, evaluate and compare machine learning models.",
    expectations: "Final-year MSc student available for six months.",
    mustHaveSkills: "Python, PyTorch, Machine Learning",
    ...overrides,
  };
}

test("rejects academic laboratory internships before scoring", () => {
  const result = scoreInternship(candidate({
    company: "Université de Nantes - Research Laboratory",
  }), { now });
  assert.equal(result.accepted, false);
  assert.equal(result.rejectionReason, "academic_policy");
});

test("rejects explicitly military missions before scoring", () => {
  const result = scoreInternship(candidate({
    descriptionRaw: "Develop target detection algorithms for military missile guidance systems.",
  }), { now });
  assert.equal(result.accepted, false);
  assert.equal(result.rejectionReason, "defense_policy");
});

test("rejects CDI alternance PhD CIFRE postdoc and off-target BI roles", () => {
  for (const contract of ["CDI", "Alternance", "PhD", "CIFRE", "Postdoc"]) {
    assert.equal(scoreInternship(candidate({ contract }), { now }).accepted, false);
  }
  assert.equal(scoreInternship(candidate({
    role: "Power BI Reporting Intern",
    descriptionRaw: "Build business dashboards and recurring reporting in Power BI.",
    roleMission: "Reporting and dashboards.",
    mustHaveSkills: "Power BI, Excel",
  }), { now }).accepted, false);
});

test("accepts strong CV signal audio medical imaging and geospatial internships", () => {
  const fixtures = [
    ["Computer Vision", "Train PyTorch vision models for image segmentation and object detection."],
    ["Signal Processing", "Design spectral and time-frequency algorithms for sensor signals."],
    ["Audio / Speech", "Train ASR and acoustic models for speech signals."],
    ["Medical Imaging", "Develop deep learning segmentation for MRI medical images."],
    ["Remote Sensing / Geospatial", "Train satellite remote-sensing models on geospatial imagery."],
  ];
  for (const [domain, text] of fixtures) {
    const result = scoreInternship(candidate({ descriptionRaw: text, roleMission: text }), { now });
    assert.equal(result.accepted, true);
    assert.equal(result.domain, domain);
  }
});
```

- [ ] **Step 2: Run** `node --test tests/scoring-engine.test.mjs` and confirm RED because `src/scoring/` does not exist.

- [ ] **Step 3: Add the exact scoring configuration and bilingual pattern groups.** `scoringConfig.mjs` must export these stable constants and keep all mutable policy out of the orchestrator:

```js
export const SCORING_VERSION = "2.0";
export const SCORE_WEIGHTS = Object.freeze({
  alignment: 45,
  technicalQuality: 20,
  companyQuality: 15,
  practicalFit: 10,
  freshness: 5,
  compensation: 5,
});
export const SCORE_GRADES = Object.freeze([
  [90, "A"], [80, "B"], [75, "C"], [0, "D"],
]);
export const PRIORITY_THRESHOLDS = Object.freeze([
  [85, "Haute"], [75, "Moyenne"], [0, "Basse"],
]);
```

Define domain pattern groups for `Machine Learning`, `Deep Learning`, `Computer Vision`, `Image Processing`, `Signal Processing`, `Audio / Speech`, `Data Science`, `Time Series`, `Medical Imaging`, `Biomedical Signal`, `Remote Sensing / Geospatial`, `Multimodal AI`, `Generative AI`, with French and English synonyms. Define separate hard-gate patterns for academic organizations, wrong contracts, defense/military mission evidence and clearly off-target roles.

- [ ] **Step 4: Implement conservative evidence collection.** Build text only from real fields:

```js
export function collectScoringEvidence(candidate = {}) {
  const values = [
    candidate.descriptionRaw,
    candidate.roleMission,
    candidate.mustHaveSkills,
    candidate.expectations,
    candidate.role,
    candidate.domain,
  ].map((value) => String(value || "").trim()).filter(Boolean);

  return {
    text: values.join(" \n").toLowerCase(),
    organizationText: [candidate.company, candidate.source, candidate.link]
      .map((value) => String(value || "").trim()).filter(Boolean).join(" ").toLowerCase(),
    technicalText: values.join(" \n").toLowerCase(),
    practicalText: [candidate.location, candidate.contract, candidate.expectations]
      .map((value) => String(value || "").trim()).filter(Boolean).join(" ").toLowerCase(),
    compensationText: String(candidate.compensation || "").trim().toLowerCase(),
  };
}
```

- [ ] **Step 5: Implement domain classification and eligibility.** The classifier counts matched domain signals but chooses the most specific domain on ties (`Medical Imaging` before generic `Deep Learning`, `Computer Vision` before generic `Machine Learning`, etc.). Eligibility rejects in this order: invalid/non-internship contract, academic policy, defense policy, explicit off-target role, no credible target-domain signal. Return machine-readable reasons only: `internship_type`, `academic_policy`, `defense_policy`, `technical_alignment`.

- [ ] **Step 6: Implement weighted scoring with integer component caps and deterministic explanations.** Use evidence-backed points only; missing freshness and compensation receive neutral midpoint scores of 2/5. Alignment starts from domain confidence and technical depth and is capped at 45. Technical quality awards points for model/algorithm ownership, training/fine-tuning, experimentation/evaluation, pipeline/deployment and scientific validation. Company quality awards points only for explicit engineering/R&D/team/product/industrial/mentorship evidence; no company-name prestige table. Practical fit awards evidence-backed Master/final-year, 4–6 month duration, Jan–Jun 2027 timing, France and explicit candidate-level compatibility. Freshness uses `now`; compensation parses explicit monthly/hourly figures when possible but remains max 5.

The final shape must be exactly:

```js
return {
  accepted: true,
  fitScore,
  grade,
  priority,
  domain: classification.domain,
  whyRelevant: strengths.slice(0, 3).join(" · "),
  strengths,
  weaknesses,
  scoreBreakdown: {
    alignment,
    technicalQuality,
    companyQuality,
    practicalFit,
    freshness,
    compensation,
  },
  scoringVersion: SCORING_VERSION,
};
```

- [ ] **Step 7: Add scoring invariants to the test.** Assert every component is within its maximum, breakdown sum equals `fitScore`, identical input/`now` returns deep-equal output, grade boundaries are exact, and missing compensation/publication date do not reject.

- [ ] **Step 8: Run** `node --test tests/scoring-engine.test.mjs` and confirm GREEN.

- [ ] **Step 9: Commit** with `feat: add deterministic internship scoring core`.

---

### Task 2: Mirror the scoring contract in Apps Script and enforce parity

**Files:**
- Create: `apps-script/Scoring.gs`
- Create: `tests/apps-script-scoring-parity.test.mjs`
- Modify: `tests/scoring-engine.test.mjs`

**Interfaces:**
- `scoreInternshipCandidate_(candidate, nowIso)` returns the same semantic fields as `scoreInternship(candidate, { now })`.
- `evaluateInternshipEligibility_(candidate, evidence, classification)` mirrors browser hard-gate reasons.
- No Apps Script service (`SpreadsheetApp`, `UrlFetchApp`, `ScriptApp`) is called by scoring functions; they stay pure/testable.

- [ ] **Step 1: Write a failing parity test that evaluates `Scoring.gs` in a VM and compares shared fixtures.** Normalize VM-realm objects through JSON before `deepEqual`:

```js
import fs from "node:fs";
import vm from "node:vm";
import { scoreInternship } from "../src/scoring/scoringEngine.mjs";

const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync("apps-script/Scoring.gs", "utf8"), context);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Apps Script and browser scorer stay in parity", () => {
  const fixture = {
    company: "Industrial Vision Co",
    role: "Computer Vision Intern",
    location: "Paris, France",
    contract: "Internship",
    postedDate: "2026-09-01",
    deadline: "2026-10-15",
    descriptionRaw: "Final-year MSc internship training PyTorch segmentation models with an industrial R&D team.",
    roleMission: "Train and evaluate segmentation models.",
    expectations: "Final-year Master, six months.",
    mustHaveSkills: "Python, PyTorch, Computer Vision",
  };
  const nowIso = "2026-09-05T12:00:00Z";
  assert.deepEqual(
    plain(context.scoreInternshipCandidate_(fixture, nowIso)),
    plain(scoreInternship(fixture, { now: new Date(nowIso) }))
  );
});
```

Add parity fixtures for rejection reasons, French text, missing compensation/date, and at least five technical domains.

- [ ] **Step 2: Run** `node --test tests/apps-script-scoring-parity.test.mjs` and confirm RED because `apps-script/Scoring.gs` does not exist.

- [ ] **Step 3: Implement `Scoring.gs` as the ES5-compatible mirror.** Keep constant values, domain precedence, hard-gate patterns, neutral defaults, points, explanation ordering and grade/priority boundaries identical. Avoid arrow functions, imports and Node-only APIs.

- [ ] **Step 4: Run** `node --test tests/scoring-engine.test.mjs tests/apps-script-scoring-parity.test.mjs` and confirm GREEN.

- [ ] **Step 5: Commit** with `feat: add Apps Script scoring parity`.

---

### Task 3: Replace Discovery.gs scoring and persist AI:AN safely

**Files:**
- Modify: `apps-script/Discovery.gs`
- Modify: `apps-script/DiscoverySheet.gs`
- Modify: `apps-script/Code.gs`
- Modify: `tests/apps-script-discovery-runner.test.mjs`
- Modify: `tests/apps-script-discovery-sheet.test.mjs`
- Create: `tests/apps-script-scoring-fields.test.mjs`

**Interfaces:**
- `Discovery.gs` calls `scoreInternshipCandidate_(candidate, nowIso)` after normalization.
- `candidateToSheetRow_(candidate, scored)` writes indices 34–39 (AI:AN) only for scoring metadata.
- `ensureDiscoveryScoringHeaders_(sheet)` sets header labels in AI:AN only when needed.
- Persisted values: `scoreGrade`, compact JSON `scoreBreakdown`, compact JSON `scoringStrengths`, compact JSON `scoringWeaknesses`, `scoringVersion`, ISO `scoringUpdatedAt`.

- [ ] **Step 1: Make discovery tests RED by requiring the new scorer and removal of coarse scoring ownership.** Add assertions that `Discovery.gs` contains `scoreInternshipCandidate_(`, no longer defines `scoreDiscoveryCandidate_`, still rejects `fitScore < 75`, and leaves the source registry/trigger handler unchanged.

- [ ] **Step 2: Extend the sheet test for a 40-column insert while protecting existing ownership.** Require:

```js
assert.match(code, /Array\(40\)\.fill/);
assert.match(code, /row\[34\]\s*=\s*scored\.grade/);
assert.match(code, /row\[35\]\s*=\s*JSON\.stringify\(scored\.scoreBreakdown/);
assert.match(code, /row\[38\]\s*=\s*scored\.scoringVersion/);
assert.doesNotMatch(code, /row\[18\]\s*=\s*scored/);
assert.doesNotMatch(code, /row\[21\]\s*=\s*scored/);
assert.doesNotMatch(code, /row\[22\]\s*=\s*scored/);
```

Also require exact header names `scoreGrade`, `scoreBreakdown`, `scoringStrengths`, `scoringWeaknesses`, `scoringVersion`, `scoringUpdatedAt`.

- [ ] **Step 3: Run** `node --test tests/apps-script-discovery-runner.test.mjs tests/apps-script-discovery-sheet.test.mjs tests/apps-script-scoring-fields.test.mjs` and confirm RED.

- [ ] **Step 4: Refactor `Discovery.gs` orchestration only.** Keep `normalizeDiscoveryCandidate_`, source health, runtime budget and registry intact. Replace `evaluateDiscoveryCandidate_` / `scoreDiscoveryCandidate_` usage with:

```js
var scored = scoreInternshipCandidate_(c, new Date().toISOString());
if (!scored.accepted) {
  if (scored.rejectionReason === "internship_type") summary.rejectedByInternshipType++;
  else if (scored.rejectionReason === "academic_policy") summary.rejectedByAcademicPolicy++;
  else summary.rejectedByTechnicalAlignment++;
  return;
}
if (scored.fitScore < 75) {
  summary.rejectedByScore++;
  return;
}
var action = upsertDiscoveredCandidate_(sheet, c, scored, index);
```

Add a dedicated `rejectedByDefensePolicy` summary counter rather than collapsing it into technical alignment, and preserve old counters for compatibility.

- [ ] **Step 5: Extend `DiscoverySheet.gs`.** `candidateToSheetRow_` becomes `Array(40).fill("")`, keeps indices 0–33 semantics unchanged, and writes only:

```js
row[34] = scored.grade || "";
row[35] = JSON.stringify(scored.scoreBreakdown || {});
row[36] = JSON.stringify(scored.strengths || []);
row[37] = JSON.stringify(scored.weaknesses || []);
row[38] = scored.scoringVersion || "";
row[39] = new Date().toISOString();
```

`ensureDiscoveryScoringHeaders_(sheet)` writes row 1 columns 35–40 with the six exact field names. Call it once near the start of `runJobDriveDiscovery()` before insert processing.

- [ ] **Step 6: Extend `Code.gs` read mapping.** Map row indices 34–39 and parse JSON cells conservatively using a local helper that returns `{}`/`[]` on malformed or absent legacy cells. Do not change description columns 26–33.

- [ ] **Step 7: Run targeted discovery/scoring tests** and confirm GREEN.

- [ ] **Step 8: Commit** with `feat: integrate phase 2B scoring into discovery`.

---

### Task 4: Read scoring metadata in the browser and make fit-first ranking the default

**Files:**
- Modify: `src/utils/jobDrive.mjs`
- Modify: `src/services/sheetsApi.js`
- Modify: `src/AppPro.jsx`
- Modify: `tests/jobDrive.test.mjs`
- Create: `tests/scoring-ui.test.mjs`

**Interfaces:**
- `normalizeJobs()` adds `scoreGrade`, object `scoreBreakdown`, arrays `scoringStrengths`, `scoringWeaknesses`, `scoringVersion`, `scoringUpdatedAt` with safe legacy defaults.
- `readJobs()` reads `A:AN`.
- `sortInternships(jobs, "recommended")` orders fit desc, priority, valid deadline urgency, posted date desc, detected date desc.
- AppPro initializes `sortMode` to `"recommended"` and keeps existing manual sort modes.

- [ ] **Step 1: Add RED normalization and ranking tests.** Extend the 40-column fixture and assert malformed JSON is safe:

```js
assert.equal(job.scoreGrade, "A");
assert.deepEqual(job.scoreBreakdown, {
  alignment: 43,
  technicalQuality: 18,
  companyQuality: 13,
  practicalFit: 9,
  freshness: 5,
  compensation: 2,
});
assert.deepEqual(job.scoringStrengths, ["Strong Computer Vision alignment"]);
assert.deepEqual(job.scoringWeaknesses, ["Compensation not specified"]);
assert.equal(job.scoringVersion, "2.0");
```

Add a recommended-ranking fixture where a 94-score older offer stays ahead of a 90-score newer/better-paid offer, same-score `Haute` precedes `Moyenne`, then nearer non-expired deadline wins, then newer publication/detection date.

- [ ] **Step 2: Run** `node --test tests/jobDrive.test.mjs tests/scoring-ui.test.mjs` and confirm RED.

- [ ] **Step 3: Add safe JSON parsers and AI:AN normalization in `jobDrive.mjs`.** Legacy rows shorter than 40 columns return `scoreGrade: ""`, `scoreBreakdown: {}`, empty strengths/weaknesses arrays and empty version/timestamp.

- [ ] **Step 4: Change the Sheets read range only from `A:AH` to `A:AN`.** Do not add scoring fields to `updateJobFields`; scoring remains discovery-owned.

- [ ] **Step 5: Implement recommended ranking without changing existing modes.** Add `recommended` before current `deadline`, `match`, `priority`, `company`, `newest` branches. Deadline tie-break ignores expired/missing dates by sending them to the end; priority order remains Haute, Moyenne, Basse.

- [ ] **Step 6: Make AppPro default to recommended and expose the option.** Change `useState("newest")` to `useState("recommended")`; add `<option value="recommended">Recommended</option>` before Newest. Keep all other options.

- [ ] **Step 7: Add a compact Fit Intelligence block in the existing detail popup only when scoring metadata exists.** Reuse existing `pro-detail-section` / `pro-detail-list` classes; do not redesign the popup. Display grade, scoring version, six breakdown values as `value/max`, strengths and watch-outs. Do not replace or rewrite About / Role & mission / Expectations / Must-have skills.

- [ ] **Step 8: Structural UI test.** `tests/scoring-ui.test.mjs` must require `Recommended`, `scoreGrade`, `scoreBreakdown`, `scoringStrengths`, `scoringWeaknesses`, and must still find the official offer action.

- [ ] **Step 9: Run** `node --test tests/jobDrive.test.mjs tests/scoring-ui.test.mjs` and confirm GREEN.

- [ ] **Step 10: Commit** with `feat: rank and display scoring intelligence`.

---

### Task 5: Add cross-policy regression fixtures and preserve discovery boundaries

**Files:**
- Modify: `tests/scoring-engine.test.mjs`
- Modify: `tests/apps-script-scoring-parity.test.mjs`
- Verify: `tests/apps-script-discovery-registry-parity.test.mjs`
- Verify: `tests/apps-script-discovery-health.test.mjs`
- Verify: `tests/apps-script-discovery-runtime-budget.test.mjs`
- Verify: `tests/description-enrichment.test.mjs`
- Verify: `tests/companyIdentity.test.mjs`

**Interfaces:**
- Produces regression evidence that Phase 2B changes scoring/ranking only and does not weaken source, description, identity, runtime or tracking contracts.

- [ ] **Step 1: Add comparison fixtures proving priority order.** Use paired candidates and assert: strong CV/ML technical missions score above generic data analysis; technical fit beats company-name prestige; a high compensation string cannot make a weaker technical role outrank a stronger one; missing compensation is neutral; rich French technical descriptions score consistently with equivalent English descriptions.

- [ ] **Step 2: Add boundary tests for 74/75, 79/80, 84/85 and 89/90 results.** Use exported pure helpers for grade/priority mapping so the tests do not depend on crafting accidental whole-offer scores:

```js
assert.equal(gradeForScore(74), "D");
assert.equal(gradeForScore(75), "C");
assert.equal(gradeForScore(80), "B");
assert.equal(gradeForScore(90), "A");
assert.equal(priorityForScore(84), "Moyenne");
assert.equal(priorityForScore(85), "Haute");
```

Mirror these helpers in Apps Script parity.

- [ ] **Step 3: Run targeted policy suite:**

```text
node --test tests/scoring-engine.test.mjs tests/apps-script-scoring-parity.test.mjs tests/apps-script-discovery-*.test.mjs tests/jobDrive.test.mjs tests/scoring-ui.test.mjs
```

Expected: all GREEN.

- [ ] **Step 4: Run the existing description and company identity tests** to prove Phase 2B has not changed those pipelines.

- [ ] **Step 5: Commit** with `test: lock phase 2B scoring policy`.

---

### Task 6: Final verification, PR and production rollout

**Files:**
- Verify: `.github/workflows/ci.yml`
- Verify: `apps-script/appsscript.json`
- Verify: all Phase 2B changed files

**Interfaces:**
- Produces a merge-ready `feature/phase2b-scoring-engine` branch and one Apps Script production push after merge.

- [ ] **Step 1: Run full tests:** `npm test`.
- [ ] **Step 2: Run production build:** `npm run build`.
- [ ] **Step 3: Run whitespace validation:** `git diff --check`.
- [ ] **Step 4: Review `git diff main...feature/phase2b-scoring-engine` and verify:** no source-registry drift; no trigger-handler change; S:W untouched by scoring; X:Z and AA:AH unchanged; AI:AN are the only new Sheet columns; no paid/network scoring dependency; no academic/defense policy regression.
- [ ] **Step 5: Open a PR to `main`, wait for CI, inspect changed files and merge only when checks are green.**
- [ ] **Step 6: After merge, sync the Codespace only if needed and run exactly one Apps Script deployment:** `git checkout main && git pull && npx clasp push`. Do not recreate the 12-hour trigger.
- [ ] **Step 7: Run `runJobDriveDiscovery` once in Apps Script and inspect the returned summary:** normal source-health/runtime fields; `rejectedByDefensePolicy` present; no unexpected source errors; eligible inserted rows have score >=75 and AI:AN metadata; existing tracked rows remain intact.
- [ ] **Step 8: Open JobDrive production and verify one scored opportunity end-to-end:** Recommended order is fit-first; detail popup shows grade/breakdown/strengths/watch-outs; official offer button and four real-description sections still work; tracking edits still save.
