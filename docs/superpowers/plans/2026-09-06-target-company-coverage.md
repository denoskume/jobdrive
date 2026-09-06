# Target Company Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 200-company France target-market registry to JobDrive, compute evidence-based employer coverage independently from source health, and expose it through a working Companies dashboard view.

**Architecture:** Keep `Discovery Sources` as the technical scanner registry and add a separate `Target Companies` strategic registry. Apps Script owns the canonical 200-company seed, idempotent Sheet bootstrap, and coverage refresh; the React frontend reads normalized target-company rows and renders company-market metrics and filters. Opportunity eligibility and the existing 23-source Coverage Health semantics remain unchanged.

**Tech Stack:** Google Apps Script (V8), Google Sheets, React 19, Vite 7, Node `node:test`, existing JobDrive company-identity/discovery modules.

**Spec:** `docs/superpowers/specs/2026-09-06-target-company-coverage-design.md`

## Global Constraints

- Initial catalogue: exactly **200 unique companies** with meaningful France presence and at least one DASSIP/CORO-relevant specialization.
- Company classes: `giant` or `recognized` only.
- Priority tiers: `1`, `2`, or `3` only.
- Coverage states: `covered`, `partial`, `uncovered` only.
- A company is `covered` only from a mapped company-specific source that is active, verified, healthy, and successfully scanned within 24 hours.
- A generic France Travail connection does not make every company `partial`; partial requires recent company-specific market evidence (30-day window).
- Restricted LinkedIn/Indeed sources never count as coverage.
- Academic/university/research-lab employers are excluded.
- Companies whose target value is primarily defense/military are excluded.
- Offer-level France, stage/M2, technical-alignment, duration, academic-policy, defense-policy, and score gates are unchanged.
- No paid infrastructure, no second scheduler, no CAPTCHA/login-wall bypass.
- Existing `Coverage Health` continues to report source health only.

---

### Task 1: Canonical 200-company seed catalogue

**Files:**
- Create: `apps-script/TargetCompanySeeds.gs`
- Create: `tests/apps-script-target-company-seeds.test.mjs`

**Interfaces:**
- Produces: `targetCompanySeedRows_(): Array<TargetCompanySeed>`
- `TargetCompanySeed` fields: `companyKey`, `companyName`, `companyClass`, `priorityTier`, `sector`, `specializations`, `francePresence`, `officialDomain`, `careersUrl`, `aliases`, `sourceKeys`, `notes`.

- [ ] **Step 1: Write the failing catalogue validation test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function loadSeeds() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync("apps-script/TargetCompanySeeds.gs", "utf8"),
    context
  );
  return context.targetCompanySeedRows_();
}

test("target company seed contains exactly 200 unique valid employers", () => {
  const rows = loadSeeds();
  assert.equal(rows.length, 200);
  assert.equal(new Set(rows.map((row) => row.companyKey)).size, 200);
  for (const row of rows) {
    assert.match(row.companyKey, /^[a-z0-9-]+$/);
    assert.ok(["giant", "recognized"].includes(row.companyClass));
    assert.ok([1, 2, 3].includes(Number(row.priorityTier)));
    assert.ok(String(row.specializations || "").trim());
    assert.ok(["verified", "probable", "unknown"].includes(row.francePresence));
  }
});

test("target company seed excludes academic and defense-first organizations", () => {
  const text = JSON.stringify(loadSeeds()).toLowerCase();
  for (const forbidden of [
    "université", "universite", "cnrs", "inserm", "inria", "research laboratory",
    "naval group", "mbda", "dassault aviation"
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:
```bash
node --test tests/apps-script-target-company-seeds.test.mjs
```
Expected: FAIL because `apps-script/TargetCompanySeeds.gs` does not exist.

- [ ] **Step 3: Create the canonical seed function**

Create `apps-script/TargetCompanySeeds.gs` with one pure function and no Sheet/network dependency:

```js
function targetCompanySeedRows_() {
  return [
    {
      companyKey: "mistral-ai",
      companyName: "Mistral AI",
      companyClass: "recognized",
      priorityTier: 1,
      sector: "Artificial Intelligence",
      specializations: "machine-learning,deep-learning,multimodal-ai",
      francePresence: "verified",
      officialDomain: "mistral.ai",
      careersUrl: "https://mistral.ai/careers",
      aliases: "Mistral,Mistral AI",
      sourceKeys: "mistral-ashby",
      notes: ""
    },
    {
      companyKey: "airbus",
      companyName: "Airbus",
      companyClass: "giant",
      priorityTier: 1,
      sector: "Aerospace",
      specializations: "data-science,machine-learning,computer-vision,signal-processing,image-processing,industrial-ai",
      francePresence: "verified",
      officialDomain: "airbus.com",
      careersUrl: "https://www.airbus.com/en/careers",
      aliases: "Airbus,Airbus SAS",
      sourceKeys: "",
      notes: "Civil/industrial roles only; offer-level defense filter remains mandatory."
    }
    // Continue with curated France employers until the returned array contains exactly 200 unique records.
  ];
}
```

The completed array must cover roughly 60–80 `giant` and 120–140 `recognized` employers. Curate across: AI/data, software/cloud, telecom, semiconductors/electronics, automotive/mobility, aerospace civil, energy, industrial engineering, banking/insurance, pharma/healthtech/medical imaging, geospatial/remote sensing, audio, imaging/computer vision, consumer/luxury, and engineering services. Existing direct-source companies such as Datadog, Doctolib, Back Market, Bosch France, Visa, Publicis Groupe, Alan, Nabla, Owkin, Pennylane, H Company, Photoroom, Dust, Gladia, Decathlon Digital, Ubisoft, Poolside, Dataiku, BlaBlaCar, Pivot, Qonto, Pigment, Contentsquare, Criteo, Shift Technology, and Hugging Face must be represented exactly once and mapped to known `sourceKeys` only when the registry already has that source key. Unknown ATS/source details remain blank.

- [ ] **Step 4: Run the seed tests and verify GREEN**

```bash
node --test tests/apps-script-target-company-seeds.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/TargetCompanySeeds.gs tests/apps-script-target-company-seeds.test.mjs
git commit -m "feat: add 200-company target market seed"
```

---

### Task 2: Target Companies Sheet bootstrap and normalization

**Files:**
- Create: `apps-script/TargetCompanies.gs`
- Create: `tests/apps-script-target-companies-sheet.test.mjs`

**Interfaces:**
- Produces: `TARGET_COMPANY_SHEET_NAME_`, `TARGET_COMPANY_HEADERS_`
- Produces: `ensureTargetCompanySheet_()`, `loadTargetCompanies_()`, `seedTargetCompanies_()`
- Produces: `targetCompanyRowToObject_(row)`, `targetCompanyObjectToRow_(company)`

- [ ] **Step 1: Write failing idempotency/preservation tests**

Use the existing in-memory SpreadsheetApp pattern from Apps Script registry tests. Assert:

```js
test("target company bootstrap is idempotent and preserves operational fields", () => {
  const context = loadTargetCompanyContext();
  const first = context.seedTargetCompanies_();
  assert.equal(first.inserted, 200);

  const sheet = context.__book.getSheetByName("Target Companies");
  const rows = sheet.getDataRange().getDisplayValues();
  const mistralIndex = rows.findIndex((row) => row[0] === "mistral-ai");
  const coverageStatusColumn = context.TARGET_COMPANY_HEADERS_.indexOf("coverageStatus");
  const notesColumn = context.TARGET_COMPANY_HEADERS_.indexOf("notes");
  rows[mistralIndex][coverageStatusColumn] = "covered";
  rows[mistralIndex][notesColumn] = "manual-note";
  sheet.values = rows;

  const second = context.seedTargetCompanies_();
  assert.equal(second.inserted, 0);

  const persisted = context.loadTargetCompanies_().find((row) => row.companyKey === "mistral-ai");
  assert.equal(persisted.coverageStatus, "covered");
  assert.equal(persisted.notes, "manual-note");
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/apps-script-target-companies-sheet.test.mjs
```
Expected: FAIL because target-company Sheet functions do not exist.

- [ ] **Step 3: Implement Sheet model**

Use this exact header order:

```js
var TARGET_COMPANY_SHEET_NAME_ = "Target Companies";
var TARGET_COMPANY_HEADERS_ = [
  "companyKey", "companyName", "companyClass", "priorityTier", "sector",
  "specializations", "francePresence", "officialDomain", "careersUrl", "aliases",
  "sourceKeys", "coverageStatus", "coverageReason", "lastCoveredAt",
  "lastSeenInternshipAt", "activeInternshipCount", "notes"
];
```

`seedTargetCompanies_()` must insert only missing `companyKey` rows. Existing rows retain operational columns (`coverageStatus`, `coverageReason`, `lastCoveredAt`, `lastSeenInternshipAt`, `activeInternshipCount`, `notes`) and may receive non-destructive strategic metadata corrections only when the existing strategic cell is blank.

- [ ] **Step 4: Run GREEN**

```bash
node --test tests/apps-script-target-companies-sheet.test.mjs
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/TargetCompanies.gs tests/apps-script-target-companies-sheet.test.mjs
git commit -m "feat: add target company sheet registry"
```

---

### Task 3: Evidence-based company coverage engine

**Files:**
- Modify: `apps-script/TargetCompanies.gs`
- Modify: `apps-script/Discovery.gs`
- Create: `tests/apps-script-target-company-coverage.test.mjs`
- Create: `tests/apps-script-target-company-runner.test.mjs`

**Interfaces:**
- Produces: `refreshTargetCompanyCoverage_(nowIso)`
- Produces pure helper: `computeTargetCompanyCoverage_(company, sources, opportunities, nowIso)` returning `{coverageStatus, coverageReason, lastCoveredAt, lastSeenInternshipAt, activeInternshipCount}`.

- [ ] **Step 1: Write failing coverage semantics tests**

```js
test("healthy recent mapped direct source marks company covered", () => {
  const result = context.computeTargetCompanyCoverage_(
    { companyKey: "mistral-ai", companyName: "Mistral AI", sourceKeys: "mistral-ashby", aliases: "Mistral" },
    [{ sourceKey: "mistral-ashby", active: true, verificationStatus: "verified", healthState: "ok", lastSuccessfulScanAt: "2026-09-06T08:00:00.000Z" }],
    [],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "covered");
});

test("generic France Travail health alone does not make target companies partial", () => {
  const result = context.computeTargetCompanyCoverage_(
    { companyKey: "sanofi", companyName: "Sanofi", sourceKeys: "", aliases: "Sanofi" },
    [{ sourceKey: "france-travail", active: true, verificationStatus: "verified", healthState: "ok", lastSuccessfulScanAt: "2026-09-06T08:00:00.000Z" }],
    [],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "uncovered");
});

test("recent France Travail observation marks only the matching company partial", () => {
  const result = context.computeTargetCompanyCoverage_(
    { companyKey: "sanofi", companyName: "Sanofi", sourceKeys: "", aliases: "Sanofi SA" },
    [],
    [{ company: "Sanofi", sourceKey: "france-travail", detectedAt: "2026-08-30T10:00:00.000Z", marketStatus: "active" }],
    "2026-09-06T12:00:00.000Z"
  );
  assert.equal(result.coverageStatus, "partial");
  assert.equal(result.activeInternshipCount, 1);
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/apps-script-target-company-coverage.test.mjs
```
Expected: FAIL because `computeTargetCompanyCoverage_` does not exist.

- [ ] **Step 3: Implement conservative identity matching and coverage windows**

Implement constants and helpers:

```js
var TARGET_COMPANY_DIRECT_COVERAGE_MS_ = 24 * 60 * 60 * 1000;
var TARGET_COMPANY_MARKET_EVIDENCE_MS_ = 30 * 24 * 60 * 60 * 1000;

function targetCompanyNormalizeName_(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

Identity matching order must be: explicit mapped company/source key where present, exact normalized company name, exact normalized alias, then exact official-domain evidence when available. Do not use free substring matching for short names.

A mapped direct source counts only if:

```js
source.active === true &&
source.verificationStatus === "verified" &&
["ok", "empty"].includes(String(source.healthState || "")) &&
nowMs - Date.parse(source.lastSuccessfulScanAt) <= TARGET_COMPANY_DIRECT_COVERAGE_MS_
```

Market evidence counts only from non-restricted accessible sources and only when the opportunity/company identity matches and its observation timestamp is within 30 days.

- [ ] **Step 4: Persist coverage back to `Target Companies`**

`refreshTargetCompanyCoverage_(nowIso)` loads target companies, discovery sources, and retained opportunities, computes each company's state, and updates only operational columns. It returns summary metrics:

```js
{
  total: 200,
  covered: 0,
  partial: 0,
  uncovered: 200,
  activeInternships: 0,
  tier1Total: 0,
  tier1Covered: 0
}
```

- [ ] **Step 5: Integrate with discovery lifecycle**

At the beginning of `runDiscoveryBatch_`, after `seedDiscoveryRegistry_()`, invoke:

```js
if (typeof seedTargetCompanies_ === "function") seedTargetCompanies_();
```

At the end of source processing, before `appendDiscoveryRun_`, invoke:

```js
if (typeof refreshTargetCompanyCoverage_ === "function") {
  summary.targetCompanyCoverage = refreshTargetCompanyCoverage_(summary.finishedAt);
}
```

The call must reuse the existing discovery run; do not add a trigger.

- [ ] **Step 6: Add runner regression test and run GREEN**

```js
test("discovery runner seeds and refreshes target-company coverage", () => {
  const source = fs.readFileSync("apps-script/Discovery.gs", "utf8");
  assert.match(source, /seedTargetCompanies_/);
  assert.match(source, /refreshTargetCompanyCoverage_/);
});
```

Run:
```bash
node --test tests/apps-script-target-company-coverage.test.mjs tests/apps-script-target-company-runner.test.mjs
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps-script/TargetCompanies.gs apps-script/Discovery.gs tests/apps-script-target-company-coverage.test.mjs tests/apps-script-target-company-runner.test.mjs
git commit -m "feat: compute target company market coverage"
```

---

### Task 4: Frontend target-company reader and pure company model

**Files:**
- Create: `src/companies/targetCompanies.mjs`
- Modify: `src/services/sheetsApi.js`
- Create: `tests/target-companies-model.test.mjs`
- Create: `tests/target-companies-api.test.mjs`

**Interfaces:**
- Produces: `normalizeTargetCompanyRows(values)`
- Produces: `targetCompanyMetrics(companies)`
- Produces: `filterTargetCompanies(companies, filters)`
- Produces: `readTargetCompanies({token, spreadsheetId})`

- [ ] **Step 1: Write failing model tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTargetCompanyRows,
  targetCompanyMetrics,
  filterTargetCompanies,
} from "../src/companies/targetCompanies.mjs";

test("target company counters separate covered partial and uncovered", () => {
  const companies = [
    { companyKey: "a", coverageStatus: "covered", priorityTier: 1, activeInternshipCount: 2 },
    { companyKey: "b", coverageStatus: "partial", priorityTier: 1, activeInternshipCount: 1 },
    { companyKey: "c", coverageStatus: "uncovered", priorityTier: 2, activeInternshipCount: 0 },
  ];
  assert.deepEqual(targetCompanyMetrics(companies), {
    total: 3,
    covered: 1,
    partial: 1,
    uncovered: 1,
    activeInternships: 3,
    tier1Total: 2,
    tier1Covered: 1,
    tier1CoveredPercent: 50,
  });
});

test("filters support class tier specialization coverage and search", () => {
  const companies = [
    { companyName: "Mistral AI", companyClass: "recognized", priorityTier: 1, specializations: ["machine-learning"], coverageStatus: "covered" },
    { companyName: "Airbus", companyClass: "giant", priorityTier: 1, specializations: ["signal-processing"], coverageStatus: "uncovered" },
  ];
  assert.equal(filterTargetCompanies(companies, { companyClass: "giant" }).length, 1);
  assert.equal(filterTargetCompanies(companies, { specialization: "machine-learning" }).length, 1);
  assert.equal(filterTargetCompanies(companies, { search: "air" })[0].companyName, "Airbus");
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/target-companies-model.test.mjs
```
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement model**

Normalize Sheet headers dynamically rather than depending on fixed column positions. Parse `priorityTier` and `activeInternshipCount` as numbers and `specializations`, `aliases`, `sourceKeys` as comma-separated arrays.

Sort default order: Tier 1 first, then `uncovered`, `partial`, `covered`, then company name.

- [ ] **Step 4: Extend Sheets API**

Add:

```js
const TARGET_COMPANIES_SHEET = "Target Companies";

export async function readTargetCompanies({ token, spreadsheetId }) {
  return readRange({
    token,
    spreadsheetId,
    range: `'${TARGET_COMPANIES_SHEET}'!A:Q`,
  });
}
```

The caller will normalize rows with `normalizeTargetCompanyRows`.

- [ ] **Step 5: Run GREEN**

```bash
node --test tests/target-companies-model.test.mjs tests/target-companies-api.test.mjs
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/companies/targetCompanies.mjs src/services/sheetsApi.js tests/target-companies-model.test.mjs tests/target-companies-api.test.mjs
git commit -m "feat: add target company frontend model"
```

---

### Task 5: Companies dashboard view and resilient loading

**Files:**
- Create: `src/companies/TargetCompaniesView.jsx`
- Create: `src/companies/target-companies.css`
- Modify: `src/AppPro.jsx`
- Modify: `src/JobDriveDashboard.jsx`
- Create: `tests/target-companies-dashboard.test.mjs`

**Interfaces:**
- `TargetCompaniesView({companies, loading, error})`
- `JobDriveDashboard` receives `targetCompanies`, `targetCompaniesError` and renders `alternateContent` for `view === "companies"`.

- [ ] **Step 1: Write failing static/UI contract tests**

```js
test("Companies navigation activates the companies view", () => {
  const dashboard = fs.readFileSync("src/JobDriveDashboard.jsx", "utf8");
  assert.match(dashboard, /onViewChange\("companies"\)/);
  assert.match(dashboard, /view === "companies"/);
});

test("AppPro loads target companies without coupling failure to jobs", () => {
  const app = fs.readFileSync("src/AppPro.jsx", "utf8");
  assert.match(app, /readTargetCompanies/);
  assert.match(app, /targetCompaniesError/);
});
```

- [ ] **Step 2: Run RED**

```bash
node --test tests/target-companies-dashboard.test.mjs
```
Expected: FAIL because Companies button is not wired and data is not loaded.

- [ ] **Step 3: Implement resilient AppPro loading**

Add state:

```js
const [targetCompanies, setTargetCompanies] = useState([]);
const [targetCompaniesError, setTargetCompaniesError] = useState("");
```

Load target companies in a separately caught promise so failure does not reject the jobs request:

```js
const targetCompanyRead = await readTargetCompanies({ token, spreadsheetId: SPREADSHEET_ID })
  .then((values) => ({ value: normalizeTargetCompanyRows(values), error: null }))
  .catch((readError) => ({ value: [], error: readError }));

setTargetCompanies(targetCompanyRead.value);
setTargetCompaniesError(targetCompanyRead.error?.message || "");
```

Do not clear or hide `jobs` when this read fails.

- [ ] **Step 4: Implement Companies view**

The top metrics must render:

- Target companies
- Covered
- Partial
- Not covered
- Active internships
- Tier 1 covered

Controls: search, class, tier, specialization, coverage status. Rows/cards show company name, class/tier, sector, specialization tags, coverage state, active internship count, and latest evidence timestamp. Use the existing dashboard visual language; do not create a separate app shell.

- [ ] **Step 5: Wire sidebar Companies button**

Change the existing inert Companies button to:

```jsx
<button
  className={view === "companies" ? "active" : ""}
  onClick={() => onViewChange("companies")}
>
  <Icon name="companies" />
  Companies
</button>
```

In `AppPro`, include:

```jsx
view === "companies" ? (
  <TargetCompaniesView
    companies={targetCompanies}
    error={targetCompaniesError}
    loading={loading}
  />
) : ...
```

- [ ] **Step 6: Run tests and build**

```bash
node --test tests/target-companies-dashboard.test.mjs tests/target-companies-model.test.mjs
npm run build
```
Expected: PASS and successful Vite build.

- [ ] **Step 7: Commit**

```bash
git add src/companies/TargetCompaniesView.jsx src/companies/target-companies.css src/AppPro.jsx src/JobDriveDashboard.jsx tests/target-companies-dashboard.test.mjs
git commit -m "feat: add target companies coverage dashboard"
```

---

### Task 6: Full regression, review, merge, Apps Script synchronization, and production validation

**Files:**
- Review all files changed in Tasks 1–5.
- No new production subsystem should be introduced in this task.

**Interfaces:**
- Final production contract: existing source Coverage Health + independent 200-company market coverage.

- [ ] **Step 1: Run full automated verification**

```bash
npm test
npm run build
```
Expected: all Node tests pass and production build succeeds.

- [ ] **Step 2: Verify seed invariants explicitly**

```bash
node --test tests/apps-script-target-company-seeds.test.mjs
```
Expected: exactly 200 unique companies, no forbidden academic/defense-first targets.

- [ ] **Step 3: Review changed code against spec**

Check that:

```text
Discovery Sources != Target Companies
France Travail healthy != all companies partial
restricted LinkedIn/Indeed != coverage
company membership != offer eligibility
Target Companies read failure != Opportunities failure
no new scheduler
no paid service
```

- [ ] **Step 4: Open PR and require green CI**

Use branch `feature/target-company-coverage-200`, request review, verify diff, and merge only after tests/build succeed.

- [ ] **Step 5: Synchronize Apps Script once after merge**

From the user's Codespace, the only required local deployment block is:

```bash
cd /workspaces/jobdrive
git checkout main
git pull --ff-only
npx clasp push
```

Expected: `TargetCompanySeeds.gs` and `TargetCompanies.gs` appear in the pushed Apps Script file list.

- [ ] **Step 6: Bootstrap/refresh through the existing discovery lifecycle**

Run existing `runJobDriveDiscovery` once in Apps Script. Expected effects:

```text
Target Companies sheet exists
Target Companies rows = 200
coverage statuses populated from real evidence
no second trigger created
existing opportunity rows preserved
```

- [ ] **Step 7: Validate production UI**

Reload `https://denoskume.github.io/jobdrive/`, sign in, open **Companies**, and confirm:

```text
Target companies = 200
Covered + Partial + Not covered = 200
Tier 1 covered is evidence-based
Active internships matches retained target-company internships
existing Overview still works
existing Coverage Health still reports source counts, not company counts
```

- [ ] **Step 8: Final completion report**

Report the actual production metrics (`Covered`, `Partial`, `Not covered`, `Tier 1 covered %`, `Active internships`) and explicitly distinguish them from the source-health metrics.
