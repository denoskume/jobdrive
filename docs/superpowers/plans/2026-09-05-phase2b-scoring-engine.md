# JobDrive Phase 2B Scoring Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JobDrive's coarse internship score with a deterministic, explainable M2 DASSIP/CORO scoring engine, persist its metadata, and rank eligible opportunities by fit first.

**Architecture:** Add pure ES-module scoring units under `src/scoring/` for evidence collection, hard eligibility, domain classification and weighted scoring. Mirror the same deterministic contract in `apps-script/Scoring.gs`, enforce parity with fixture-driven tests, then make `Discovery.gs` orchestrate France filtering plus the scorer and `DiscoverySheet.gs` persist AI:AN metadata without touching user-owned tracking fields. The React dashboard reads the new metadata, keeps its strict industry filter aligned with every supported scoring domain, makes recommended ranking the default, and exposes a compact Fit Intelligence section without changing the official offer-description source of truth.

**Tech Stack:** JavaScript ES modules, Google Apps Script, React 19, Google Sheets API, Node.js built-in test runner, Vite.

**Spec:** `docs/superpowers/specs/2026-09-05-phase2b-scoring-engine-design.md`

## Global Constraints

- Scoring weights are exactly 45 / 20 / 15 / 10 / 5 / 5 for alignment, technical quality, company/environment quality, practical fit, freshness/deadline, compensation.
- Hard gates run before weighted scoring; academic/research-lab, explicitly defense/military, wrong employment-type and clearly off-target internships cannot be rescued by score.
- Existing France-only discovery eligibility remains a separate orchestration gate and must not be weakened by Phase 2B.
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
- `gradeForScore(score)` and `priorityForScore(score)` are pure exported boundary helpers.
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
  const bi = scoreInternship(candidate({
    role: "Power BI Reporting Intern",
    descriptionRaw: "Build business dashboards and recurring reporting in Power BI.",
    roleMission: "Reporting and dashboards.",
    mustHaveSkills: "Power BI, Excel",
  }), { now });
  assert.equal(bi.accepted, false);
  assert.equal(bi.rejectionReason, "technical_alignment");
});

test("classifies strong target-domain internships", () => {
  const fixtures = [
    ["Computer Vision", "Computer Vision Intern", "Computer Vision, PyTorch", "Train vision models for object detection."],
    ["Image Processing", "Image Processing Intern", "Python, OpenCV", "Design image-processing algorithms for industrial inspection."],
    ["Signal Processing", "Signal Processing Intern", "Python, DSP", "Design spectral and time-frequency algorithms for sensor signals."],
    ["Audio / Speech", "Speech ML Intern", "Python, ASR", "Train acoustic and ASR models for speech signals."],
    ["Medical Imaging", "Medical Imaging Intern", "Python, PyTorch", "Develop deep-learning segmentation for MRI medical images."],
    ["Remote Sensing / Geospatial", "Remote Sensing ML Intern", "Python, PyTorch", "Train satellite models on geospatial imagery."],
  ];
  for (const [domain, role, mustHaveSkills, text] of fixtures) {
    const result = scoreInternship(candidate({ role, mustHaveSkills, descriptionRaw: text, roleMission: text }), { now });
    assert.equal(result.accepted, true);
    assert.equal(result.domain, domain);
  }
});
```

- [ ] **Step 2: Run** `node --test tests/scoring-engine.test.mjs` and confirm RED because `src/scoring/` does not exist.

- [ ] **Step 3: Add exact scoring constants and bilingual pattern groups.** `scoringConfig.mjs` must export stable policy constants:

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

Define domain signal groups for `Machine Learning`, `Deep Learning`, `Computer Vision`, `Image Processing`, `Signal Processing`, `Audio / Speech`, `Data Science`, `Time Series`, `Medical Imaging`, `Biomedical Signal`, `Remote Sensing / Geospatial`, `Multimodal AI`, `Generative AI`, with French and English synonyms. Define separate hard-gate groups for academic organizations, wrong contracts, defense/military mission evidence and clearly off-target roles. Domain precedence must put specific domains such as Medical Imaging, Remote Sensing, Audio/Speech, Image Processing and Computer Vision before generic ML/AI terms.

- [ ] **Step 4: Implement conservative evidence collection using real fields only.**

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

- [ ] **Step 5: Implement domain classification and eligibility.** Count matched signals by domain, break ties with the specific-domain precedence list, and return confidence based only on real matched signals. Eligibility rejects in this exact order: wrong/non-internship contract, academic policy, defense policy, explicit off-target role, no credible target-domain signal. Return only `internship_type`, `academic_policy`, `defense_policy`, `technical_alignment` as scoring-engine rejection reasons.

- [ ] **Step 6: Implement weighted scoring with integer component caps and deterministic explanations.** Missing freshness and compensation receive neutral midpoint scores of 2/5. Alignment starts from domain signal confidence plus technical-depth evidence and is capped at 45. Technical quality awards points for model/algorithm ownership, training/fine-tuning, experimentation/evaluation, pipeline/deployment and scientific validation. Company quality awards points only for explicit engineering/R&D/team/product/industrial/mentorship evidence; no company-name prestige table. Practical fit awards evidence-backed Master/final-year, 4–6 month duration, Jan–Jun 2027 timing, France and explicit candidate-level compatibility. Freshness uses `now`; compensation parses only explicit figures or explicit paid/gratification language and remains max 5.

```js
return {
  accepted: true,
  fitScore,
  grade: gradeForScore(fitScore),
  priority: priorityForScore(fitScore),
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

- [ ] **Step 7: Add scoring invariants.** Assert every component is between zero and its configured maximum, breakdown sum equals `fitScore`, identical input plus identical `now` returns deep-equal output, grade/priority helpers obey exact boundaries, and missing compensation/publication date do not reject.

- [ ] **Step 8: Run** `node --test tests/scoring-engine.test.mjs` and confirm GREEN.

- [ ] **Step 9: Commit** `feat: add deterministic internship scoring core`.

---

### Task 2: Mirror the scoring contract in Apps Script and enforce parity

**Files:**
- Create: `apps-script/Scoring.gs`
- Create: `tests/apps-script-scoring-parity.test.mjs`
- Modify: `tests/scoring-engine.test.mjs`

**Interfaces:**
- `scoreInternshipCandidate_(candidate, nowIso)` returns the same semantic fields as `scoreInternship(candidate, { now })`.
- `gradeForScore_(score)` and `priorityForScore_(score)` mirror browser helpers.
- Scoring functions call no Apps Script service and remain pure/testable.

- [ ] **Step 1: Write a failing VM parity test and compare normalized objects.**

```js
import fs from "node:fs";
import vm from "node:vm";
import { scoreInternship } from "../src/scoring/scoringEngine.mjs";

const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync("apps-script/Scoring.gs", "utf8"), context);
const plain = (value) => JSON.parse(JSON.stringify(value));

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

Add parity fixtures for all four rejection reasons, French text, missing compensation/date, boundary helpers and at least six technical domains.

- [ ] **Step 2: Run** `node --test tests/apps-script-scoring-parity.test.mjs` and confirm RED because `apps-script/Scoring.gs` does not exist.

- [ ] **Step 3: Implement `Scoring.gs` as the ES5-compatible mirror.** Keep constants, domain precedence, patterns, neutral defaults, point allocation, explanation ordering and grade/priority boundaries identical. Use `var`/functions and avoid imports, arrow functions and Node-only APIs.

- [ ] **Step 4: Run** `node --test tests/scoring-engine.test.mjs tests/apps-script-scoring-parity.test.mjs` and confirm GREEN.

- [ ] **Step 5: Commit** `feat: add Apps Script scoring parity`.

---

### Task 3: Integrate scoring into France-wide discovery and persist AI:AN safely

**Files:**
- Modify: `apps-script/Discovery.gs`
- Modify: `apps-script/DiscoverySheet.gs`
- Modify: `apps-script/Code.gs`
- Modify: `tests/apps-script-discovery-runner.test.mjs`
- Modify: `tests/apps-script-discovery-sheet.test.mjs`
- Create: `tests/apps-script-scoring-fields.test.mjs`

**Interfaces:**
- `isFranceDiscoveryCandidate_(candidate)` preserves the existing France location/country gate before scoring.
- `Discovery.gs` calls `scoreInternshipCandidate_(candidate, nowIso)` only after the France gate.
- `candidateToSheetRow_(candidate, scored)` writes indices 34–39 (AI:AN) only for scoring metadata.
- `ensureDiscoveryScoringHeaders_(sheet)` owns only AI:AN header labels.

- [ ] **Step 1: Make discovery tests RED for the new scorer while explicitly protecting France filtering.** Require `scoreInternshipCandidate_(`, `isFranceDiscoveryCandidate_(`, the existing `rejectedByCountry` counter, `fitScore < 75`, unchanged source-registry keys and unchanged `runJobDriveDiscovery` trigger handler. Require that `scoreDiscoveryCandidate_` is removed.

- [ ] **Step 2: Extend the sheet test for a 40-column insert while protecting S:W and X:AH.**

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

- [ ] **Step 4: Refactor discovery orchestration, not policy duplication.** Extract the current France regex behavior into `isFranceDiscoveryCandidate_` and preserve `rejectedByCountry`. Then call the scorer and route rejection counters explicitly:

```js
if (!isFranceDiscoveryCandidate_(c)) {
  summary.rejectedByCountry++;
  return;
}

var scored = scoreInternshipCandidate_(c, new Date().toISOString());
if (!scored.accepted) {
  if (scored.rejectionReason === "internship_type") summary.rejectedByInternshipType++;
  else if (scored.rejectionReason === "academic_policy") summary.rejectedByAcademicPolicy++;
  else if (scored.rejectionReason === "defense_policy") summary.rejectedByDefensePolicy++;
  else summary.rejectedByTechnicalAlignment++;
  return;
}
if (scored.fitScore < 75) {
  summary.rejectedByScore++;
  return;
}
var action = upsertDiscoveredCandidate_(sheet, c, scored, index);
```

Add `rejectedByDefensePolicy: 0` to the run summary; preserve all old summary fields for compatibility.

- [ ] **Step 5: Extend `DiscoverySheet.gs` only after RED is established.**

```js
var row = Array(40).fill("");
// indices 0..33 keep their existing meaning
row[34] = scored.grade || "";
row[35] = JSON.stringify(scored.scoreBreakdown || {});
row[36] = JSON.stringify(scored.strengths || []);
row[37] = JSON.stringify(scored.weaknesses || []);
row[38] = scored.scoringVersion || "";
row[39] = new Date().toISOString();
```

`ensureDiscoveryScoringHeaders_(sheet)` writes row 1 columns 35–40 with the six exact names; call it once at discovery start before inserting rows.

- [ ] **Step 6: Extend `Code.gs` read mapping without moving description fields.** Add safe JSON parsing for indices 35–37 and expose indices 34–39. Malformed/legacy JSON returns `{}` for breakdown and `[]` for strengths/weaknesses. Description stays at 26–33.

- [ ] **Step 7: Run targeted discovery/scoring tests** and confirm GREEN.

- [ ] **Step 8: Commit** `feat: integrate phase 2B scoring into discovery`.

---

### Task 4: Normalize metadata, keep browser filtering aligned, and make fit-first ranking default

**Files:**
- Modify: `src/utils/jobDrive.mjs`
- Modify: `src/services/sheetsApi.js`
- Modify: `src/AppPro.jsx`
- Modify: `tests/jobDrive.test.mjs`
- Create: `tests/scoring-ui.test.mjs`

**Interfaces:**
- `normalizeJobs()` adds `scoreGrade`, object `scoreBreakdown`, arrays `scoringStrengths`, `scoringWeaknesses`, `scoringVersion`, `scoringUpdatedAt` with safe legacy defaults.
- `readJobs()` reads `A:AN`.
- `isAlignedInternship()` recognizes every Phase 2B accepted domain, including Medical Imaging, Biomedical Signal, Remote Sensing/Geospatial and Representation Learning.
- `sortInternships(jobs, "recommended")` orders fit desc, priority, valid deadline urgency, posted date desc, detected date desc.
- AppPro initializes `sortMode` to `"recommended"` and keeps existing manual sort modes.

- [ ] **Step 1: Add RED normalization, domain-filter and ranking tests.** Extend a row to 40 columns and assert:

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

Add legacy/malformed-JSON rows and require safe defaults. Add `isIndustryInternship` fixtures for `Medical Imaging`, `Biomedical Signal`, `Remote Sensing / Geospatial`, `Representation Learning` and `Multimodal AI` so newly scored valid rows cannot disappear from the dashboard.

Add a `recommended` ranking fixture where: 94 fit beats 90 fit regardless of newer date/compensation; same fit uses Haute before Moyenne; same fit/priority uses nearer non-expired deadline; remaining ties use newer publication then detection date.

- [ ] **Step 2: Run** `node --test tests/jobDrive.test.mjs tests/scoring-ui.test.mjs` and confirm RED.

- [ ] **Step 3: Add safe JSON parsing and AI:AN normalization.** Legacy rows shorter than 40 columns return `scoreGrade: ""`, `scoreBreakdown: {}`, empty strength/weakness arrays and empty version/timestamp.

- [ ] **Step 4: Expand `ALIGNED_INTERNSHIP_PATTERNS` to cover every accepted Phase 2B domain.** Add explicit patterns for medical imaging/imagerie médicale, biomedical signal, remote sensing/télédétection, geospatial/géospatial, representation learning and existing multimodal/GenAI terms. Do not remove the academic-organization guard.

- [ ] **Step 5: Change only the Google Sheets read range from `A:AH` to `A:AN`.** Scoring fields must not be added to `updateJobFields`; the browser reads but does not own them.

- [ ] **Step 6: Implement recommended ranking while preserving existing modes.**

```js
if (mode === "recommended") {
  return (
    Number(b.fitScore || 0) - Number(a.fitScore || 0) ||
    (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99) ||
    recommendedDeadline(a.deadline) - recommendedDeadline(b.deadline) ||
    sortableDate(b.postedDate, Number.NEGATIVE_INFINITY) - sortableDate(a.postedDate, Number.NEGATIVE_INFINITY) ||
    sortableDate(b.detectedDate, Number.NEGATIVE_INFINITY) - sortableDate(a.detectedDate, Number.NEGATIVE_INFINITY)
  );
}
```

`recommendedDeadline` sends missing/expired deadlines to `Number.POSITIVE_INFINITY`, so they never gain urgency.

- [ ] **Step 7: Make AppPro default to recommended and expose the option.** Change `useState("newest")` to `useState("recommended")` and add `<option value="recommended">Recommended</option>` before Newest; retain all current sort options.

- [ ] **Step 8: Add Fit Intelligence only when scoring metadata exists.** Reuse current detail-section/list/tag classes. Render grade + version, six `value/max` breakdown rows, strengths and watch-outs. Keep the existing official offer action and real-description sections unchanged.

```jsx
{job.scoringVersion && (
  <section className="pro-detail-section">
    <h3>Fit Intelligence</h3>
    <p>Grade {job.scoreGrade || "—"} · Scoring v{job.scoringVersion}</p>
    <div className="pro-detail-tags">
      {job.scoringStrengths.map((item) => <span key={item}>{item}</span>)}
    </div>
  </section>
)}
```

- [ ] **Step 9: Structural UI test.** Require `Recommended`, `scoreGrade`, `scoreBreakdown`, `scoringStrengths`, `scoringWeaknesses`, `Fit Intelligence`, and the existing `Open official offer` action. Also inspect `sheetsApi.js` and require `A:AN`.

- [ ] **Step 10: Run** `node --test tests/jobDrive.test.mjs tests/scoring-ui.test.mjs` and confirm GREEN.

- [ ] **Step 11: Commit** `feat: rank and display scoring intelligence`.

---

### Task 5: Lock policy comparisons and regression boundaries

**Files:**
- Modify: `tests/scoring-engine.test.mjs`
- Modify: `tests/apps-script-scoring-parity.test.mjs`
- Verify: `tests/apps-script-discovery-registry-parity.test.mjs`
- Verify: `tests/apps-script-discovery-health.test.mjs`
- Verify: `tests/apps-script-discovery-runtime-budget.test.mjs`
- Verify: `tests/description-enrichment.test.mjs`
- Verify: `tests/companyIdentity.test.mjs`

**Interfaces:**
- Produces regression evidence that Phase 2B changes scoring/ranking only and does not weaken source, description, identity, runtime, France eligibility or tracking contracts.

- [ ] **Step 1: Add paired candidate tests proving the priority order.** Strong CV/ML technical missions must score above generic data analysis; explicit technical-environment evidence must matter more than company-name prestige; high explicit compensation cannot make a weaker technical role outrank a stronger one; missing compensation stays neutral; equivalent French and English technical offers classify consistently.

- [ ] **Step 2: Add exact grade/priority boundary tests using pure helpers.**

```js
assert.equal(gradeForScore(74), "D");
assert.equal(gradeForScore(75), "C");
assert.equal(gradeForScore(79), "C");
assert.equal(gradeForScore(80), "B");
assert.equal(gradeForScore(89), "B");
assert.equal(gradeForScore(90), "A");
assert.equal(priorityForScore(74), "Basse");
assert.equal(priorityForScore(75), "Moyenne");
assert.equal(priorityForScore(84), "Moyenne");
assert.equal(priorityForScore(85), "Haute");
```

Mirror the same boundaries in Apps Script parity.

- [ ] **Step 3: Run targeted Phase 2B suite:**

```text
node --test tests/scoring-engine.test.mjs tests/apps-script-scoring-parity.test.mjs tests/apps-script-discovery-*.test.mjs tests/jobDrive.test.mjs tests/scoring-ui.test.mjs
```

Expected: all GREEN.

- [ ] **Step 4: Run existing description and company-identity tests** and confirm no regressions.

- [ ] **Step 5: Commit** `test: lock phase 2B scoring policy`.

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
- [ ] **Step 4: Review `git diff main...feature/phase2b-scoring-engine` and verify:** no source-registry drift; no trigger-handler change; France filtering retained; S:W untouched by scoring; X:Z and AA:AH unchanged; AI:AN are the only new Sheet columns; no paid/network scoring dependency; no academic/defense policy regression.
- [ ] **Step 5: Open a PR to `main`, wait for CI, inspect changed files and merge only when checks are green.**
- [ ] **Step 6: After merge, run one Apps Script deployment from the Codespace:** `git checkout main && git pull && npx clasp push`. Do not recreate the 12-hour trigger.
- [ ] **Step 7: Run `runJobDriveDiscovery` once in Apps Script and inspect the returned summary:** normal source-health/runtime fields; `rejectedByCountry` and `rejectedByDefensePolicy` present; no unexpected source errors; eligible inserted rows have score >=75 and AI:AN metadata; existing tracked rows remain intact.
- [ ] **Step 8: Open JobDrive production and verify one scored opportunity end-to-end:** Recommended order is fit-first; newly supported domains remain visible; detail popup shows grade/breakdown/strengths/watch-outs; official offer button and four real-description sections still work; tracking edits still save.
