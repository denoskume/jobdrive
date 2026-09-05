# JobDrive Phase 2D — France-wide Internship Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace JobDrive’s small hard-coded employer scanner with a resumable France-wide, multi-source internship discovery system that backfills already-open M2-relevant internships, continuously scans future postings, reports honest coverage health, and preserves the strict DASSIP/CORO eligibility policy.

**Architecture:** Keep Google Apps Script + Google Sheets as the discovery backend and source of truth, but move source catalogue/state into dedicated Sheets tabs. Discovery becomes a rotating scheduler over a structured Source Registry, adapters normalize all providers into one candidate contract, cross-source provenance/deduplication chooses a canonical official posting, strict eligibility runs before unchanged Phase 2B scoring, and a Coverage Health snapshot is exposed to the existing React dashboard.

**Tech Stack:** Google Apps Script V8, Google Sheets, React 19, Vite 7, Node built-in test runner (`node --test`), GitHub Pages, existing Google OAuth frontend, public/free official job APIs and public ATS endpoints only.

**Spec:** `docs/superpowers/specs/2026-09-05-phase2d-france-wide-discovery-design.md`

## Global Constraints

- Remain operable with free infrastructure only: Google Apps Script, Google Sheets, GitHub Pages, existing GitHub Actions usage, and public/free official endpoints.
- Never bypass login walls, CAPTCHAs, robots restrictions, contractual restrictions, or platform access controls.
- Do not promise mathematically complete 100% internet coverage; report complete accounting only for registered accessible sources.
- Preserve exactly one existing 12-hour `runJobDriveDiscovery` trigger; do not create a second Discovery trigger.
- Preserve the existing daily Action Digest trigger and all Phase 2C behavior.
- Preserve Phase 2B scoring version/weights and minimum persisted `fitScore >= 75`.
- Keep academic/university/research-lab internships excluded.
- Keep defense-oriented opportunities excluded.
- Keep CDI/permanent, alternance, apprenticeship, PhD/CIFRE, and postdoc roles excluded.
- `Full-time Internship` remains valid; generic `Full-time` without real internship evidence is rejected.
- Explicit 5–6 month duration is compatible; explicit incompatible duration is rejected; missing duration remains eligible and must be marked unknown.
- Search scope is all French territory, including Corsica, DROM-COM, and remote roles genuinely open from France.
- Never invent `Stage` as a fallback contract when the source did not provide internship evidence.
- Never commit France Travail or other provider credentials; credentials live only in Apps Script Script Properties.
- Never write private access tokens into Sheets, frontend code, logs, fixtures, or GitHub.
- Never overwrite user tracking fields (`status`, `favorite`, `appliedDate`, `followUpDate`, `notes`, `lastUpdated`, Phase 2C follow-up/action fields) during duplicate merge or lifecycle refresh.

---

## File Structure Locked for Phase 2D

### Apps Script

- Create `apps-script/DiscoveryRegistry.gs` — Source Registry schema, seeding, validation, read/write helpers.
- Create `apps-script/DiscoveryScheduler.gs` — fair source selection, runtime-budget resume, health transitions, backoff.
- Modify `apps-script/DiscoveryAdapters.gs` — common paged adapter contract and existing ATS adapter parity.
- Create `apps-script/DiscoveryFranceTravail.gs` — credential-safe France Travail OAuth/search adapter.
- Create `apps-script/DiscoverySourceDiscovery.gs` — conservative discovery/verification of supported ATS sources from official URLs.
- Create `apps-script/DiscoveryProvenance.gs` — Opportunity Sources tab, canonical-source ranking, duplicate provenance.
- Create `apps-script/DiscoveryBackfill.gs` — resumable backfill controls/status.
- Create `apps-script/DiscoveryCoverage.gs` — Discovery Runs tab and rolling coverage aggregation.
- Modify `apps-script/Discovery.gs` — orchestration only; remove the hard-coded array as the primary source catalogue.
- Modify `apps-script/DiscoverySheet.gs` — canonical upsert, lifecycle/evidence fields, no invented contract fallback.
- Modify `apps-script/Scoring.gs` — evidence-aware eligibility for description-based internship proof and atypical aligned titles without weakening hard rejects.
- Modify `apps-script/Code.gs` only if its API row mapping must expose new AT:BC fields; do not change unrelated web-app behavior.

### Frontend

- Create `src/discovery/coverage.mjs` — pure normalization/aggregation of Registry + Runs rows for UI.
- Create `src/discovery/CoverageHealthCard.jsx` — compact Coverage Health UI.
- Create `src/discovery/coverage-health.css` — responsive coverage presentation.
- Modify `src/services/sheetsApi.js` — read `Discovery Sources` and `Discovery Runs`; extend opportunity reads through `BC`.
- Modify `src/utils/jobDrive.mjs` — normalize appended AT:BC lifecycle/evidence fields.
- Modify `src/AppPro.jsx` — load coverage with jobs and pass it to the dashboard.
- Modify `src/JobDriveDashboard.jsx` — render Coverage Health on Overview.

### Tests

- Create `tests/apps-script-discovery-registry-v2.test.mjs`.
- Create `tests/apps-script-discovery-scheduler-v2.test.mjs`.
- Create `tests/apps-script-discovery-adapters-v2.test.mjs`.
- Create `tests/apps-script-france-travail.test.mjs`.
- Create `tests/discovery-eligibility-evidence.test.mjs`.
- Create `tests/discovery-provenance.test.mjs`.
- Create `tests/apps-script-source-discovery.test.mjs`.
- Create `tests/apps-script-discovery-backfill.test.mjs`.
- Create `tests/discovery-coverage.test.mjs`.
- Create `tests/coverage-health-ui.test.mjs`.
- Keep all existing test files green.

---

### Task 1: Move the Source Catalogue into a Real Registry

**Files:**
- Create: `apps-script/DiscoveryRegistry.gs`
- Modify: `apps-script/Discovery.gs`
- Test: `tests/apps-script-discovery-registry-v2.test.mjs`

**Interfaces:**
- Produces: `DISCOVERY_SOURCE_HEADERS_`, `validateDiscoverySource_(source)`, `ensureDiscoveryRegistrySheet_()`, `loadDiscoverySources_()`, `upsertDiscoverySource_(source)`, `seedDiscoveryRegistry_()`.
- Source shape:

```js
{
  sourceKey: "mistral-ashby",
  company: "Mistral AI",
  sourceType: "ashby",
  tenant: "mistral.ai",
  endpoint: "",
  countryScope: "GLOBAL",
  active: true,
  priority: 80,
  healthState: "pending",
  verificationStatus: "verified",
  verifiedAt: "2026-09-05T00:00:00.000Z",
  lastAttemptAt: "",
  lastSuccessfulScanAt: "",
  lastError: "",
  jobsSeenLastRun: 0,
  consecutiveFailures: 0,
  nextEligibleScanAt: "",
  cursor: "",
  discoveredFrom: "seed",
  notes: ""
}
```

- `Discovery Sources` exact columns, A:T:

```js
var DISCOVERY_SOURCE_HEADERS_ = [
  "sourceKey", "company", "sourceType", "tenant", "endpoint",
  "countryScope", "active", "priority", "healthState",
  "verificationStatus", "verifiedAt", "lastAttemptAt",
  "lastSuccessfulScanAt", "lastError", "jobsSeenLastRun",
  "consecutiveFailures", "nextEligibleScanAt", "cursor",
  "discoveredFrom", "notes"
];
```

- [ ] **Step 1: Write the failing registry tests**

Create tests that load `DiscoveryRegistry.gs` in `vm` with fake `SpreadsheetApp` and assert:

```js
assert.equal(context.DISCOVERY_SOURCE_HEADERS_.length, 20);
assert.equal(context.validateDiscoverySource_({
  sourceKey: "ft-national",
  company: "France Travail",
  sourceType: "france_travail",
  active: true,
  priority: 100,
}).valid, true);

assert.equal(context.validateDiscoverySource_({
  sourceKey: "bad",
  sourceType: "arbitrary_html_scraper",
  active: true,
}).valid, false);
```

Also assert `seedDiscoveryRegistry_()` contains provider rows for `france-travail`, `linkedin-market`, and `indeed-market`, with LinkedIn/Indeed represented as restricted discovery surfaces rather than fake working adapters.

- [ ] **Step 2: Run the registry test and verify RED**

Run:

```bash
npm test -- --test-name-pattern="Discovery Registry v2"
```

Expected: FAIL because `DiscoveryRegistry.gs` and the registry functions do not exist.

- [ ] **Step 3: Implement the Registry and migrate the current seed sources**

Create `DiscoveryRegistry.gs` with allowed types:

```js
var DISCOVERY_SUPPORTED_SOURCE_TYPES_ = [
  "ashby", "greenhouse", "lever", "smartrecruiters", "teamtailor",
  "france_travail", "linkedin_discovery", "indeed_discovery"
];
```

Seed the current known employer sources from the old array plus:

```js
{sourceKey:"france-travail",company:"France Travail",sourceType:"france_travail",countryScope:"FR",active:true,priority:100,healthState:"pending",verificationStatus:"configuration_required",discoveredFrom:"seed"}
{sourceKey:"linkedin-market",company:"LinkedIn Jobs",sourceType:"linkedin_discovery",countryScope:"FR",active:true,priority:20,healthState:"restricted",verificationStatus:"restricted",discoveredFrom:"seed",notes:"No unrestricted public search API assumed."}
{sourceKey:"indeed-market",company:"Indeed",sourceType:"indeed_discovery",countryScope:"FR",active:true,priority:20,healthState:"restricted",verificationStatus:"restricted",discoveredFrom:"seed",notes:"No unrestricted public search API assumed."}
```

`seedDiscoveryRegistry_()` must be idempotent by `sourceKey`: insert missing rows only, never replace mutable health/state columns on existing rows.

Remove `JOBDRIVE_DISCOVERY_SOURCES_` from `Discovery.gs` as the runtime source of truth. During this task, `runJobDriveDiscovery()` may temporarily call `loadDiscoverySources_()` while preserving its old scan loop.

- [ ] **Step 4: Run registry + full tests**

Run:

```bash
npm test
```

Expected: registry test PASS; all existing tests remain PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryRegistry.gs apps-script/Discovery.gs tests/apps-script-discovery-registry-v2.test.mjs
git commit -m "feat: move discovery sources into registry"
```

---

### Task 2: Add Fair Rotation, Runtime Resume, and Health State Transitions

**Files:**
- Create: `apps-script/DiscoveryScheduler.gs`
- Modify: `apps-script/DiscoveryRegistry.gs`
- Modify: `apps-script/Discovery.gs`
- Test: `tests/apps-script-discovery-scheduler-v2.test.mjs`

**Interfaces:**
- Consumes: `loadDiscoverySources_()`, `upsertDiscoverySource_(source)`.
- Produces:

```js
selectDiscoveryBatch_(sources, nowIso, {
  maxSources: 25,
  runtimeBudgetMs: 240000,
  mode: "continuous"
}) -> source[]

sourceHealthPatch_(source, result, nowIso) -> object
nextFailureScanAt_(consecutiveFailures, nowIso) -> ISO string
```

- [ ] **Step 1: Write failing scheduler tests**

Cover fairness and backoff with fixed timestamps:

```js
const selected = context.selectDiscoveryBatch_([
  source("old-high", 100, "2026-09-01T00:00:00Z"),
  source("new-high", 100, "2026-09-05T12:00:00Z"),
  source("old-low", 20, "2026-08-31T00:00:00Z"),
], "2026-09-05T15:00:00Z", {maxSources: 2, mode:"continuous"});

assert.deepEqual(selected.map(x => x.sourceKey), ["old-high", "old-low"]);
```

Assert failed sources receive bounded backoff, restricted/configuration-required sources are accounted but not fetched, and a source with an unfinished `cursor` is preferred for resume.

- [ ] **Step 2: Run scheduler test and verify RED**

```bash
node --test tests/apps-script-discovery-scheduler-v2.test.mjs
```

Expected: FAIL on missing scheduler functions.

- [ ] **Step 3: Implement deterministic selection and health transitions**

Use ranking in this order:

```js
1. unfinished cursor first;
2. priority descending;
3. oldest lastSuccessfulScanAt first;
4. sourceKey stable tie-breaker.
```

Skip sources when:

```js
active !== true
verificationStatus in ["restricted", "configuration_required", "unsupported"]
nextEligibleScanAt > nowIso
```

Failure backoff:

```js
var hours = Math.min(24, Math.pow(2, Math.min(consecutiveFailures, 4)));
```

`sourceHealthPatch_()` must update `lastAttemptAt`, `healthState`, `jobsSeenLastRun`, `lastError`, `consecutiveFailures`, `nextEligibleScanAt`, and on success `lastSuccessfulScanAt`.

- [ ] **Step 4: Run scheduler and regression tests**

```bash
npm test
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryScheduler.gs apps-script/DiscoveryRegistry.gs apps-script/Discovery.gs tests/apps-script-discovery-scheduler-v2.test.mjs
git commit -m "feat: add resumable discovery scheduler"
```

---

### Task 3: Standardize Every Adapter on a Paged Result Contract

**Files:**
- Modify: `apps-script/DiscoveryAdapters.gs`
- Test: `tests/apps-script-discovery-adapters-v2.test.mjs`
- Update as needed: existing `tests/apps-script-discovery-*.test.mjs`

**Interfaces:**
- Produces:

```js
discoverSourcePage_(source, cursor) -> {
  status: "ok"|"empty"|"fetch_error"|"restricted"|"configuration_required"|"unsupported",
  jobs: normalizedRawJob[],
  nextCursor: "",
  done: true,
  error: ""
}
```

- Raw adapter job contract:

```js
{
  id: "provider-stable-id",
  title: "Machine Learning Intern",
  company: "Example",
  location: "Paris, France",
  country: "France",
  jobUrl: "https://official.example/jobs/123",
  publishedAt: "2026-09-05T10:00:00Z",
  descriptionPlain: "...",
  employmentType: "Internship",
  compensation: ""
}
```

- [ ] **Step 1: Write adapter contract tests**

Mock `UrlFetchApp.fetch` and assert Ashby, Greenhouse, Lever, SmartRecruiters and Teamtailor all return the same wrapper keys and never throw provider errors past `discoverSourcePage_()`.

Example assertion:

```js
const result = context.discoverSourcePage_({sourceType:"greenhouse",tenant:"acme"}, "");
assert.equal(result.status, "ok");
assert.equal(result.done, true);
assert.equal(typeof result.jobs[0].id, "string");
assert.match(result.jobs[0].jobUrl, /^https:/);
```

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/apps-script-discovery-adapters-v2.test.mjs
```

Expected: FAIL because the current adapter entry point returns the old `{status,jobs}` shape.

- [ ] **Step 3: Refactor adapters without changing provider semantics**

Keep provider-specific fetchers focused and wrap them through `discoverSourcePage_()`. Existing whole-board adapters return `nextCursor:"", done:true`. SmartRecruiters may continue internal pagination for up to its existing bound in this task; France Travail pagination is added separately in Task 4.

Do not add arbitrary HTML scraping.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryAdapters.gs tests/apps-script-discovery-adapters-v2.test.mjs tests
git commit -m "refactor: standardize discovery adapter contract"
```

---

### Task 4: Add France Travail as the National Structured Source

**Files:**
- Create: `apps-script/DiscoveryFranceTravail.gs`
- Modify: `apps-script/DiscoveryAdapters.gs`
- Modify: `apps-script/DiscoveryRegistry.gs`
- Test: `tests/apps-script-france-travail.test.mjs`

**Interfaces:**
- Script Properties:

```text
JOBDRIVE_FT_CLIENT_ID
JOBDRIVE_FT_CLIENT_SECRET
JOBDRIVE_FT_SCOPE   (optional; default "api_offresdemploiv2 o2dsoffre")
```

- Produces:

```js
franceTravailConfigStatus_() -> {configured:boolean, reason:string}
fetchFranceTravailAccessToken_() -> string
discoverFranceTravailPage_(source, cursor) -> paged adapter result
normalizeFranceTravailOffer_(offer) -> raw adapter job
```

- [ ] **Step 1: Write mocked France Travail tests**

Test configuration absence:

```js
assert.deepEqual(context.franceTravailConfigStatus_(), {
  configured: false,
  reason: "missing_credentials"
});
```

Test normalization fixture:

```js
const raw = context.normalizeFranceTravailOffer_({
  id:"188ABCD",
  intitule:"Stage Data Scientist F/H",
  lieuTravail:{libelle:"31 - Toulouse"},
  entreprise:{nom:"ACME"},
  dateCreation:"2026-09-04T09:00:00Z",
  description:"Stage de 6 mois en machine learning.",
  typeContratLibelle:"Stage",
  origineOffre:{urlOrigine:"https://careers.acme.com/job/188ABCD"}
});
assert.equal(raw.id, "188ABCD");
assert.equal(raw.company, "ACME");
assert.equal(raw.country, "France");
assert.equal(raw.employmentType, "Stage");
```

Test pagination with a mocked `Content-Range`/range cursor and safe `configuration_required` result when credentials are missing.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/apps-script-france-travail.test.mjs
```

Expected: FAIL on missing file/functions.

- [ ] **Step 3: Implement OAuth + France-wide keyword paging**

Use the official partner endpoints:

```js
var FRANCE_TRAVAIL_TOKEN_URL_ = "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire";
var FRANCE_TRAVAIL_SEARCH_URL_ = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
```

Use `client_credentials`; cache the token with `CacheService` for less than the returned expiry.

Use a bounded rotating keyword family so a single run does not exhaust runtime:

```js
var FRANCE_TRAVAIL_QUERY_FAMILIES_ = [
  "data science", "machine learning", "deep learning", "computer vision",
  "traitement du signal", "traitement d'image", "audio speech",
  "series temporelles", "forecasting", "imagerie medicale",
  "teledetection", "multimodal", "intelligence artificielle"
];
```

Encode cursor as JSON text containing `{queryIndex,start}`. Each page returns no more than 150 results; eligibility later rejects non-internships rather than trusting query text.

Never log credentials or access tokens.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS including missing-credential behavior.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryFranceTravail.gs apps-script/DiscoveryAdapters.gs apps-script/DiscoveryRegistry.gs tests/apps-script-france-travail.test.mjs
git commit -m "feat: add France Travail discovery adapter"
```

---

### Task 5: Upgrade Eligibility to Evidence-Based Recall Without Weakening Hard Rejects

**Files:**
- Modify: `apps-script/Discovery.gs`
- Modify: `apps-script/Scoring.gs`
- Modify: `src/scoring/eligibility.mjs`
- Modify: `src/discovery/eligibility.mjs`
- Test: `tests/discovery-eligibility-evidence.test.mjs`
- Update: `tests/strict-m2-targeting.test.mjs`
- Update: `tests/full-time-internship-compat.test.mjs`

**Interfaces:**
- Candidate evidence output:

```js
{
  internshipEvidence: "title:intern" | "contract:stage" | "description:internship" | "",
  locationEvidence: "country:france" | "location:france" | "location:remote-france" | "",
  durationEvidence: "5_months" | "6_months" | "5_6_months" | "unknown",
  industryEvidence: "company" | "",
  domainEvidence: ["Machine Learning", "Deep Learning"],
  timingEvidence: "jan_2027" | "feb_2027" | "flexible" | "unknown"
}
```

- [ ] **Step 1: Add RED fixtures for high recall + strict precision**

Required cases:

```js
// accepted: title has no narrow whitelist keyword, mission is aligned
{
 role:"Algorithms Intern",
 company:"Industrial Robotics SAS",
 location:"Lyon, France",
 contract:"Internship",
 descriptionRaw:"Develop and evaluate learning algorithms for sensor fusion and time-series prediction. 6 months."
}

// accepted: internship proof only in description
{
 role:"Applied Scientist",
 location:"Paris, France",
 contract:"",
 descriptionRaw:"This is a 6-month internship focused on computer vision model training and evaluation."
}

// rejected: AI branding only
{
 role:"Product Manager - AI",
 contract:"Internship",
 descriptionRaw:"Work with customers on AI roadmap."
}
```

Also test `international` and `internal` do not count as `intern`, generic full-time fails, `Full-time Internship` passes, 3 months fails, unknown duration passes with `durationEvidence:"unknown"`, academic/defense cases fail, and Quant Research with statistical modeling passes.

- [ ] **Step 2: Run targeted tests and verify RED**

```bash
node --test tests/discovery-eligibility-evidence.test.mjs tests/strict-m2-targeting.test.mjs tests/full-time-internship-compat.test.mjs
```

Expected: new mission-evidence/description-evidence cases FAIL under the current title-heavy policy.

- [ ] **Step 3: Implement evidence extraction and atypical-role rule**

Internship evidence must inspect exactly:

```js
candidate.role
candidate.contract
candidate.descriptionRaw
```

with bounded internship regexes.

Strict off-target role rejection runs before positive technical inference.

Add substantive mission signals such as:

```js
/\bdevelop(ing)? (?:and evaluate )?(?:machine learning|deep learning|vision|signal|statistical) model/i
/\bmodel training\b/i
/\bmodel evaluation\b/i
/\balgorithm development\b/i
/\bsensor fusion\b/i
/\bstatistical model/i
/\btime[- ]series (?:model|forecast)/i
/\bsimulation and modeling\b/i
```

An atypical title may pass only when:

```js
!strictOffTargetRole && classification.confidence >= 63 && substantiveMissionSignal
```

Generative AI must additionally include at least one technical GenAI mission signal (`fine-tun`, `training`, `evaluation`, `retrieval`, `RAG`, `agent system`, `model serving`, `embedding`, `inference`).

Keep Phase 2B weights and threshold unchanged.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS, including screenshot-class false positives from the prior strict-targeting fix.

- [ ] **Step 5: Commit**

```bash
git add apps-script/Discovery.gs apps-script/Scoring.gs src/scoring/eligibility.mjs src/discovery/eligibility.mjs tests/discovery-eligibility-evidence.test.mjs tests/strict-m2-targeting.test.mjs tests/full-time-internship-compat.test.mjs
git commit -m "feat: make internship eligibility evidence-aware"
```

---

### Task 6: Add Cross-Source Provenance, Canonical URL Preference, and Market Lifecycle

**Files:**
- Create: `apps-script/DiscoveryProvenance.gs`
- Modify: `apps-script/DiscoverySheet.gs`
- Modify: `src/utils/jobDrive.mjs`
- Test: `tests/discovery-provenance.test.mjs`

**Interfaces:**
- Create `Opportunity Sources` tab headers:

```js
var OPPORTUNITY_SOURCE_HEADERS_ = [
  "jobId", "sourceKey", "sourceType", "providerJobId", "sourceUrl",
  "canonicalUrl", "firstSeenAt", "lastSeenAt", "isCanonical",
  "sourceState", "fingerprint"
];
```

- Append `Opportunités` AT:BC:

```text
AT marketStatus
AU marketLastSeenAt
AV canonicalSourceKey
AW sourceCount
AX internshipEvidence
AY locationEvidence
AZ durationEvidence
BA industryEvidence
BB domainEvidence
BC timingEvidence
```

- Produces:

```js
canonicalSourceRank_(candidate) -> number
recordOpportunitySource_(jobId, candidate, canonicalUrl, isCanonical)
findCanonicalOpportunity_(candidate, index) -> rowNumber|null
mergeDiscoveredCandidate_(sheet, rowNumber, candidate, scored, evidence) -> "updated"|"duplicate"
```

- [ ] **Step 1: Write RED dedupe/preservation tests**

Fixture: same internship arrives first from France Travail, then official Greenhouse.

Assert:

```js
assert.equal(result.jobCount, 1);
assert.equal(result.job.link, "https://job-boards.greenhouse.io/acme/jobs/123");
assert.equal(result.job.sourceCount, 2);
assert.equal(result.job.status, "Candidature envoyée");
assert.equal(result.job.notes, "Recruiter called me");
```

Also assert the storage layer leaves `contract` empty when source contract is empty; it must never write `candidate.contract || "Stage"`.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/discovery-provenance.test.mjs
```

Expected: FAIL because current upsert returns `duplicate` and stores `candidate.contract || "Stage"`.

- [ ] **Step 3: Implement canonical merge + lifecycle fields**

Canonical source rank:

```js
ashby/greenhouse/lever/smartrecruiters/teamtailor = 30
france_travail with officialUrl present = 25
france_travail without officialUrl = 20
permitted aggregator/discovery surface = 10
```

Dedup signals in order:

```js
canonical URL
same-provider stable ID
normalized company|role|location fingerprint
optional description digest for ambiguous same-company same-role records
```

When a duplicate is found, update only provider-owned fields and AT:BC metadata. Do not modify columns L, S:W, AO:AS or private notes/history.

Set accepted/seen records to:

```js
marketStatus = "Active"
marketLastSeenAt = nowIso
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryProvenance.gs apps-script/DiscoverySheet.gs src/utils/jobDrive.mjs tests/discovery-provenance.test.mjs
git commit -m "feat: add cross-source opportunity provenance"
```

---

### Task 7: Discover New Supported ATS Sources Conservatively

**Files:**
- Create: `apps-script/DiscoverySourceDiscovery.gs`
- Modify: `apps-script/DiscoveryRegistry.gs`
- Modify: `apps-script/Discovery.gs`
- Test: `tests/apps-script-source-discovery.test.mjs`

**Interfaces:**
- Produces:

```js
detectSupportedCareerSource_(url) -> source|null
registerDiscoveredSource_(source, discoveredFrom) -> "inserted"|"exists"|"rejected"
probeDiscoverySource_(source) -> {verified:boolean,status:string,error:string}
verifyPendingDiscoverySources_(limit) -> summary
```

- [ ] **Step 1: Write URL-detection and trust-boundary tests**

Required mappings:

```js
https://jobs.ashbyhq.com/acme/... -> {sourceType:"ashby", tenant:"acme"}
https://job-boards.greenhouse.io/acme/jobs/123 -> {sourceType:"greenhouse", tenant:"acme"}
https://jobs.lever.co/acme/123 -> {sourceType:"lever", tenant:"acme"}
https://jobs.smartrecruiters.com/Acme/123 -> {sourceType:"smartrecruiters", tenant:"Acme"}
https://evil.example/scrape -> null
```

Assert new sources are inserted as `verificationStatus:"unverified"`, `active:false`, and only become active after a successful probe.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/apps-script-source-discovery.test.mjs
```

Expected: FAIL on missing detection/registration functions.

- [ ] **Step 3: Implement conservative discovery**

Only recognize explicit supported host patterns. Do not fetch arbitrary HTML to infer ATS type.

After each accepted candidate, inspect `candidate.officialUrl || candidate.link`. If it reveals a supported ATS not already in the Registry, register it with:

```js
active:false
verificationStatus:"unverified"
healthState:"pending"
discoveredFrom:candidate.sourceKey
```

`verifyPendingDiscoverySources_(5)` probes a small bounded set; successful parse + stable IDs/URLs sets `verified`, `active:true`, `healthState:"pending"`.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoverySourceDiscovery.gs apps-script/DiscoveryRegistry.gs apps-script/Discovery.gs tests/apps-script-source-discovery.test.mjs
git commit -m "feat: discover supported employer ATS sources"
```

---

### Task 8: Implement Resumable National Backfill and Continuous Watch Orchestration

**Files:**
- Create: `apps-script/DiscoveryBackfill.gs`
- Modify: `apps-script/Discovery.gs`
- Modify: `apps-script/DiscoveryScheduler.gs`
- Test: `tests/apps-script-discovery-backfill.test.mjs`

**Interfaces:**
- Script Properties:

```text
JOBDRIVE_BACKFILL_ACTIVE
JOBDRIVE_BACKFILL_STARTED_AT
JOBDRIVE_BACKFILL_COMPLETED_AT
JOBDRIVE_ROTATION_STARTED_AT
```

- Public Apps Script functions:

```js
previewJobDriveDiscoveryConfiguration()
startJobDriveBackfill()
runJobDriveBackfillBatch()
getJobDriveBackfillStatus()
resetJobDriveBackfillState()
runJobDriveDiscovery()
```

- [ ] **Step 1: Write RED backfill tests**

Assert:

```js
startJobDriveBackfill() // marks active, clears source cursors only for backfill progression
runJobDriveBackfillBatch() // processes bounded sources and persists cursor
runJobDriveBackfillBatch() // resumes, does not restart source zero
```

Backfill must be idempotent against existing opportunities and must report completion only when every active registered source is accounted as success/empty/restricted/configuration_required/failed for the rotation.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/apps-script-discovery-backfill.test.mjs
```

Expected: FAIL on missing public backfill controls.

- [ ] **Step 3: Refactor `runJobDriveDiscovery()` into one batch executor**

Introduce internal:

```js
runDiscoveryBatch_({mode:"backfill"|"continuous", now:new Date()})
```

For each selected source:

```js
1. call discoverSourcePage_(source, source.cursor)
2. normalize candidates
3. evaluate hard eligibility
4. deduplicate/provenance merge
5. Phase 2B score only eligible records
6. persist accepted score >= 75
7. update source health/cursor
8. stop before runtime safety margin
```

Backfill manually advances through batches. The existing 12-hour trigger continues to call only `runJobDriveDiscovery()` for continuous watch. Do not create another recurring trigger.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS including existing runtime-budget tests.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryBackfill.gs apps-script/Discovery.gs apps-script/DiscoveryScheduler.gs tests/apps-script-discovery-backfill.test.mjs
git commit -m "feat: add resumable national discovery backfill"
```

---

### Task 9: Persist Discovery Runs and Compute Honest Coverage Health

**Files:**
- Create: `apps-script/DiscoveryCoverage.gs`
- Modify: `apps-script/Discovery.gs`
- Test: `tests/discovery-coverage.test.mjs`

**Interfaces:**
- `Discovery Runs` headers:

```js
var DISCOVERY_RUN_HEADERS_ = [
  "runId", "mode", "startedAt", "finishedAt", "totalKnownSources",
  "activeSources", "sourcesAttempted", "sourcesSucceeded", "sourcesFailed",
  "sourcesRestricted", "sourcesPending", "sourcesSkippedByBudget",
  "rawListingsInspected", "normalizedCandidates", "duplicatesDetected",
  "rejectedLocation", "rejectedInternshipType", "rejectedDuration",
  "rejectedAcademic", "rejectedDefense", "rejectedTechnicalAlignment",
  "rejectedScore", "acceptedStored", "runtimeBudgetReached",
  "rotationCompleted", "lastRotationCompletedAt", "sourceHealthJson"
];
```

- Produces:

```js
appendDiscoveryRun_(summary)
getJobDriveCoverageSnapshot_(now) -> {
  totalKnownSources,
  activeSources,
  scanned24h,
  pending,
  failed,
  restricted,
  rawListings24h,
  retained24h,
  lastRotationCompletedAt,
  state: "complete"|"incomplete"|"restricted"
}
```

- [ ] **Step 1: Write RED coverage aggregation tests**

Use fixed rows for 3 sources: one `ok`, one `fetch_error`, one `restricted`. Assert state is `incomplete`, counts are honest, and `complete` is only returned when all active registered accessible sources are accounted for in the current completed rotation.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/discovery-coverage.test.mjs
```

Expected: FAIL on missing coverage functions.

- [ ] **Step 3: Implement run audit + 24h snapshot**

Every batch appends exactly one run summary, even when zero jobs are retained. Do not infer scan coverage from `Opportunités` count.

`sourceHealthJson` may contain only non-secret diagnostic fields:

```js
{sourceKey,status,jobsFound,elapsedMs,error}
```

Never store OAuth tokens, headers, or credentials.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryCoverage.gs apps-script/Discovery.gs tests/discovery-coverage.test.mjs
git commit -m "feat: persist discovery coverage health"
```

---

### Task 10: Read Coverage and Lifecycle Metadata in the React App

**Files:**
- Create: `src/discovery/coverage.mjs`
- Modify: `src/services/sheetsApi.js`
- Modify: `src/utils/jobDrive.mjs`
- Modify: `src/AppPro.jsx`
- Test: `tests/discovery-coverage.test.mjs`

**Interfaces:**
- Produces:

```js
readDiscoveryCoverage({token, spreadsheetId}) -> Promise<{sources:string[][], runs:string[][]}>
normalizeCoverageRows({sources, runs}, {now}) -> coverage object
```

- Extend `readJobs()` from `A:AS` to `A:BC` and normalize:

```js
marketStatus
marketLastSeenAt
canonicalSourceKey
sourceCount
internshipEvidence
locationEvidence
durationEvidence
industryEvidence
domainEvidence
timingEvidence
```

- [ ] **Step 1: Add frontend normalization tests**

Assert an old A:AS row still normalizes with safe defaults, and a new A:BC row reads lifecycle/evidence fields correctly.

Assert `normalizeCoverageRows()` ignores runs older than 24h for rolling counters and returns a safe `unknown`/incomplete snapshot when tabs are empty.

- [ ] **Step 2: Run targeted tests and verify RED**

```bash
node --test tests/discovery-coverage.test.mjs
```

Expected: FAIL on missing frontend module/read function.

- [ ] **Step 3: Implement parallel coverage read**

Use Google Sheets values endpoints for:

```text
'Discovery Sources'!A:T
'Discovery Runs'!A:AA
```

In `AppPro.jsx`, add `coverage` state and load jobs + coverage under the same authenticated session. Coverage read failure must not hide jobs; set a diagnostic incomplete state instead.

- [ ] **Step 4: Run tests + build**

```bash
npm test
npm run build
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src/discovery/coverage.mjs src/services/sheetsApi.js src/utils/jobDrive.mjs src/AppPro.jsx tests/discovery-coverage.test.mjs
git commit -m "feat: load discovery coverage in dashboard"
```

---

### Task 11: Add Coverage Health to Overview

**Files:**
- Create: `src/discovery/CoverageHealthCard.jsx`
- Create: `src/discovery/coverage-health.css`
- Modify: `src/JobDriveDashboard.jsx`
- Modify: `src/AppPro.jsx`
- Test: `tests/coverage-health-ui.test.mjs`

**Interfaces:**
- Component:

```jsx
<CoverageHealthCard coverage={coverage} retainedTotal={jobs.length} />
```

- [ ] **Step 1: Write RED UI contract tests**

Static/render-contract tests must assert visible wording includes:

```text
Coverage complete for registered accessible sources
Coverage incomplete
Restricted sources not scanned
Sources scanned / active sources (24h)
Pending
Failed / Restricted
Raw listings inspected
Relevant M2 internships retained
Last rotation completed
```

Also assert no UI copy says `all internships in France`.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/coverage-health-ui.test.mjs
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement compact responsive Coverage Health UI**

Badge mapping:

```js
complete   -> "Coverage complete for registered accessible sources"
incomplete -> "Coverage incomplete"
restricted -> "Restricted sources not scanned"
```

Display at minimum:

```text
{scanned24h} / {activeSources}
{pending}
{failed + restricted}
{rawListings24h}
{retainedTotal}
{lastRotationCompletedAt || "No completed rotation yet"}
```

Render it on Overview below the primary KPI area without changing Action Center navigation or existing opportunity cards.

- [ ] **Step 4: Run tests + build**

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/discovery/CoverageHealthCard.jsx src/discovery/coverage-health.css src/JobDriveDashboard.jsx src/AppPro.jsx tests/coverage-health-ui.test.mjs
git commit -m "feat: show discovery coverage health"
```

---

### Task 12: Add Market Lifecycle Refresh Without Destroying Tracking History

**Files:**
- Modify: `apps-script/DiscoveryProvenance.gs`
- Modify: `apps-script/DiscoverySheet.gs`
- Modify: `apps-script/Discovery.gs`
- Test: `tests/discovery-provenance.test.mjs`

**Interfaces:**
- Produces:

```js
markSourceListingsSeen_(sourceKey, seenProviderIds, nowIso)
refreshMarketLifecycleForSource_(sourceKey, seenProviderIds, nowIso)
```

- [ ] **Step 1: Add RED lifecycle tests**

Assert:

```js
seen posting -> Active
posting missing for one successful source scan -> Unknown
explicit provider closed/expired state -> Closed
```

And always preserve application state:

```js
status === "Entretien"
notes === previousNotes
followUpDate === previousFollowUpDate
```

A fetch error must not mark previously active jobs Unknown/Closed because absence was not established.

- [ ] **Step 2: Run and verify RED**

```bash
node --test tests/discovery-provenance.test.mjs
```

Expected: FAIL on missing lifecycle refresh.

- [ ] **Step 3: Implement source-success-only lifecycle refresh**

Only run absence-based lifecycle updates when a source finished successfully (`ok` or `empty`) and its page/cursor is complete. `fetch_error`, runtime interruption, restricted, or configuration-required results do not downgrade opportunities.

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps-script/DiscoveryProvenance.gs apps-script/DiscoverySheet.gs apps-script/Discovery.gs tests/discovery-provenance.test.mjs
git commit -m "feat: track opportunity market lifecycle"
```

---

### Task 13: End-to-End Phase 2D Regression, Security, and Production Handoff

**Files:**
- Modify only if failures prove necessary: files touched in Tasks 1–12.
- Test: all `tests/*.test.mjs`
- Verify: `.clasp.json`, `apps-script/appsscript.json`, `.github/workflows/*`

**Interfaces:**
- No new product interface; this task proves the integrated contract.

- [ ] **Step 1: Add/finish end-to-end regression assertions**

Ensure test coverage explicitly includes all of these production invariants:

```text
registry validation
rotation fairness
runtime resume
source failure isolation
backfill idempotency
France Travail normalization
existing ATS normalization
cross-source dedupe
canonical official URL preference
user tracking preservation
no invented Stage fallback
internship evidence from title/contract/description
international/internal != intern
Full-time Internship valid
generic Full-time invalid
3 months rejected
5/6 months accepted
unknown duration accepted + marked unknown
foreign-only rejected
France + DROM/remote-France evidence accepted
academic rejected
defense rejected
Customer Success rejected
Full Stack rejected
Product Manager AI rejected
IT Ops LLM rejected
atypical aligned internship accepted
Quant Research modeling accepted
technical GenAI accepted only with technical evidence
fitScore threshold remains 75
Coverage Health aggregation honest
coverage incomplete with pending/failed sources
Phase 2B tests green
Phase 2C tests green
frontend build green
```

- [ ] **Step 2: Run fresh full verification**

```bash
npm test
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Verify no credentials/secrets are committed**

Run:

```bash
git grep -nE 'JOBDRIVE_FT_CLIENT_SECRET=.*[^" ]|Bearer [A-Za-z0-9._-]{20,}|client_secret["'"']?\s*[:=]\s*["'"'][^"'"']+' -- . ':!docs/superpowers/plans/*'
```

Expected: no committed secret values. Property *names* are allowed; values are not.

- [ ] **Step 4: Verify trigger/install code does not create duplicates**

Confirm source code still has one installer path for `runJobDriveDiscovery` and that Phase 2D did not add another recurring Discovery trigger. The normal production cadence remains every 12 hours; backfill is manually resumable/batch-based.

Run:

```bash
grep -R "newTrigger(\"runJobDriveDiscovery\"" -n apps-script
```

Expected: only the existing idempotent Discovery installer path.

- [ ] **Step 5: Open PR and wait for GitHub CI**

```bash
git status
git log --oneline --decorate -12
```

Open a PR from `feature/phase2d-france-wide-discovery` to `main`. Require the existing Test, Build, and Diff Check jobs to pass before merge.

- [ ] **Step 6: Merge only after fresh CI evidence**

After successful CI, merge to `main`, then verify the `Deploy JobDrive` run for the merge commit completes successfully, including Pages deployment.

- [ ] **Step 7: Sync Apps Script source after merge**

Because GitHub cannot push the local Apps Script project by itself, run from the existing Codespace only after `main` contains the verified merge:

```bash
cd /workspaces/jobdrive
git checkout main
git pull
npx clasp push
```

Expected: all Apps Script files, including new Phase 2D files, are pushed successfully.

- [ ] **Step 8: Configure France Travail only through Script Properties**

Set these values in Apps Script project properties if credentials are available:

```text
JOBDRIVE_FT_CLIENT_ID=<private value>
JOBDRIVE_FT_CLIENT_SECRET=<private value>
JOBDRIVE_FT_SCOPE=api_offresdemploiv2 o2dsoffre
```

Do not place those private values in GitHub or the Sheet.

- [ ] **Step 9: Initialize registry and run a live configuration preview**

In Apps Script, run once:

```js
seedDiscoveryRegistry_();
previewJobDriveDiscoveryConfiguration();
```

Expected: `Discovery Sources` exists; current ATS sources are present; France Travail is either configured or explicitly `configuration_required`; LinkedIn/Indeed are explicitly restricted rather than silently counted as scanned.

- [ ] **Step 10: Start and resume the national backfill until registered-source accounting completes**

Run:

```js
startJobDriveBackfill();
runJobDriveBackfillBatch();
getJobDriveBackfillStatus();
```

Repeat `runJobDriveBackfillBatch()` only as needed until status reports every active registered source accounted for. Do not create a faster recurring trigger.

- [ ] **Step 11: Verify live Sheets and dashboard**

Confirm:

```text
Discovery Sources -> source health/state updated
Discovery Runs -> one audit row per batch
Opportunity Sources -> alternate provenance recorded
Opportunités -> no duplicate accepted rows; user tracking intact; AT:BC populated when available
Dashboard -> Coverage Health matches Sheets counts
```

- [ ] **Step 12: Verify production triggers remain exactly once**

In Apps Script Triggers UI confirm:

```text
runJobDriveDiscovery -> one 12-hour trigger
runJobDriveActionDigest -> one daily trigger
```

No Phase 2D duplicate trigger exists.

---

## Plan Self-Review Result

### Spec coverage

Every approved Phase 2D requirement maps to a task:

- Source Registry → Task 1
- rotation/runtime/failure health → Task 2
- common ATS adapter contract → Task 3
- France Travail → Task 4
- strict-but-broad M2 evidence matching → Task 5
- cross-source dedupe/official URL/provenance → Task 6
- automatic supported ATS discovery + restricted platform honesty → Task 7
- historical backfill + 12-hour continuous watch → Task 8
- Discovery Runs + Coverage Health → Task 9
- frontend coverage/lifecycle normalization → Task 10
- Coverage Health dashboard → Task 11
- market lifecycle preservation → Task 12
- security, CI, clasp sync, live backfill and trigger verification → Task 13

### Placeholder scan

The plan contains no `TBD`, `TODO`, “implement later”, or undefined hand-wave steps. Every new function and Sheet schema used by later tasks is defined in an earlier task or in the same task.

### Type/name consistency

The plan consistently uses:

```text
Discovery Sources
Discovery Runs
Opportunity Sources
sourceKey
sourceType
healthState
verificationStatus
discoverSourcePage_
runDiscoveryBatch_
getJobDriveCoverageSnapshot_
marketStatus
marketLastSeenAt
canonicalSourceKey
sourceCount
```

No Phase 2B or Phase 2C field names are repurposed.
