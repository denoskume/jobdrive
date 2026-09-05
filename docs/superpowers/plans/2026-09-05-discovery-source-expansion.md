# Discovery Source Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand JobDrive Phase 2A from the current small discovery registry to a verified France-wide source set with per-source health and safe Apps Script runtime limits.

**Architecture:** Keep `apps-script/Discovery.gs` as the production runner and adapters while maintaining a browser/test registry in `src/discovery/sourceRegistry.mjs`. Every active source carries verification metadata and parity is enforced by tests. The runner records per-source health and stops before the Apps Script time budget is exhausted without changing eligibility, scoring, dedupe, Sheet schema, or the existing 12-hour trigger.

**Tech Stack:** Google Apps Script, JavaScript/ES modules, Node.js built-in test runner, Vite/GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-05-discovery-source-expansion-design.md`

## Global Constraints

- No LinkedIn/Indeed scraping, authenticated scraping, private ATS tokens, guessed tenant identifiers, or paid infrastructure.
- Active sources must have verified public structured endpoints and verification metadata.
- Supported structured ATS families: Ashby, Greenhouse, Lever, SmartRecruiters, plus Teamtailor only when an anonymous public endpoint is verified.
- Existing France/internship/academic/technical eligibility, scoring threshold, dedupe, Sheet ownership, and 12-hour trigger behavior remain unchanged.
- Approximately 25–30 candidates are evaluated; target at least 20 active verified sources when evidence supports them.
- `npm test` and `npm run build` must pass before merge.

---

### Task 1: Lock registry contract and production parity

**Files:**
- Modify: `src/discovery/sourceRegistry.mjs`
- Modify: `apps-script/Discovery.gs`
- Create: `tests/discovery-source-registry.test.mjs`
- Create: `tests/apps-script-discovery-registry-parity.test.mjs`

**Interfaces:**
- Produces registry entries `{key, company, type, tenant?, endpoint?, active, verifiedAt, verificationStatus, notes?}`.
- `activeDiscoverySources()` returns only `active === true && verificationStatus === "verified"`.

- [ ] **Step 1: Write failing tests** asserting unique keys, required verification metadata, inactive unverified sources, and exact key/type/tenant parity between browser and Apps Script registries.
- [ ] **Step 2: Run** `node --test tests/discovery-source-registry.test.mjs tests/apps-script-discovery-registry-parity.test.mjs` and confirm RED because the current registries lack metadata and are already out of parity for Hugging Face, Doctolib and Back Market.
- [ ] **Step 3: Implement minimal registry contract** in both files, first reconciling the current known production entries (`mistral-ashby`, `datadog-greenhouse`, `doctolib-greenhouse`, `backmarket-ashby`, `bosch-smartrecruiters`, `visa-smartrecruiters`, `publicis-smartrecruiters`) and retaining Hugging Face inactive unless re-verified.
- [ ] **Step 4: Run the two tests** and confirm GREEN.
- [ ] **Step 5: Commit** `test/feat: enforce verified discovery registry parity`.

### Task 2: Add only evidence-verified company sources

**Files:**
- Modify: `src/discovery/sourceRegistry.mjs`
- Modify: `apps-script/Discovery.gs`
- Create: `docs/discovery/source-verification-2026-09-05.md`
- Modify: `tests/discovery-source-registry.test.mjs`

**Interfaces:**
- Consumes the registry contract from Task 1.
- Produces a documented candidate matrix and the verified active subset.

- [ ] **Step 1: Build a 25–30 company candidate matrix** biased toward France hiring in ML, CV, signal/audio, multimodal, time-series, medical imaging, remote sensing and geospatial ML. For each candidate record official careers evidence, ATS family, exact public tenant/endpoint, HTTP/result status, job-record presence, official job URL viability, verification date and activation decision.
- [ ] **Step 2: Verify every candidate endpoint before code activation.** A 2xx response alone is insufficient: require identifiable job records and official job URLs. Do not infer tenants from company names.
- [ ] **Step 3: Extend the failing registry test** to assert every active source has `verificationStatus: "verified"`, a non-empty ISO `verifiedAt`, and either `tenant` or `endpoint`; assert at least four adapter families remain represented by supported production code.
- [ ] **Step 4: Add only the verified subset** to both registries. Keep failed/unconfirmed candidates documented but inactive or outside the production registry.
- [ ] **Step 5: Run** `node --test tests/discovery-source-registry.test.mjs tests/apps-script-discovery-registry-parity.test.mjs` and confirm GREEN.
- [ ] **Step 6: Commit** `feat: expand verified internship discovery sources`.

### Task 3: Add per-source health observability

**Files:**
- Modify: `apps-script/Discovery.gs`
- Modify: `apps-script/DiscoveryAdapters.gs`
- Create: `tests/apps-script-discovery-health.test.mjs`

**Interfaces:**
- Produces `summary.sourceHealth[]` entries `{source, type, status, jobsFound, elapsedMs, error}`.
- Status is one of `ok`, `empty`, `fetch_error`, `unsupported`, `inactive`.

- [ ] **Step 1: Write a failing structural/behavior test** requiring `sourceHealth`, allowed status values, job counts, elapsed time, and failure isolation while preserving aggregate `sourceErrors` compatibility.
- [ ] **Step 2: Run** `node --test tests/apps-script-discovery-health.test.mjs` and confirm RED.
- [ ] **Step 3: Implement minimal health collection:** start a timer per attempted source, classify successful non-empty as `ok`, successful zero jobs as `empty`, adapter failures as `fetch_error`, unsupported adapters as `unsupported`, and include inactive entries as `inactive` without fetching them.
- [ ] **Step 4: Run the health test and existing discovery runner tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: expose discovery source health`.

### Task 4: Enforce Apps Script runtime budget

**Files:**
- Modify: `apps-script/Discovery.gs`
- Create: `tests/apps-script-discovery-runtime-budget.test.mjs`

**Interfaces:**
- Adds `runtimeBudgetMs`, `runtimeBudgetReached`, and `sourcesSkippedByBudget` to the run summary.
- Runner checks budget before starting each new source and exits cleanly.

- [ ] **Step 1: Write failing tests** requiring a finite practical budget below Apps Script hard execution limits, a pre-source budget guard, explicit skipped-source count, and a normal `finishedAt` even when budget is reached.
- [ ] **Step 2: Run** `node --test tests/apps-script-discovery-runtime-budget.test.mjs` and confirm RED.
- [ ] **Step 3: Implement the minimal guard** using the run start timestamp; do not interrupt a source already being processed and do not change the 12-hour trigger.
- [ ] **Step 4: Run runtime and runner tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: bound discovery execution time`.

### Task 5: Regression gate and rollout

**Files:**
- Verify: `.github/workflows/ci.yml`
- Verify: `apps-script/DiscoverySheet.gs`
- Verify: `src/discovery/eligibility.mjs`
- Verify: `src/discovery/scoring.mjs`

**Interfaces:**
- Produces a merge-ready Phase 2A branch without changing Sheet schema or trigger handler.

- [ ] **Step 1: Run targeted discovery suite:** `node --test tests/discovery-*.test.mjs tests/apps-script-discovery-*.test.mjs`.
- [ ] **Step 2: Run full suite:** `npm test`.
- [ ] **Step 3: Run production build:** `npm run build`.
- [ ] **Step 4: Review `git diff main...feature/discovery-source-expansion`** and confirm no scoring-weight, Sheet-column, dashboard, description-popup, or trigger-handler drift.
- [ ] **Step 5: Open PR to `main`**, wait for CI, review changed files, and merge only when checks pass.
- [ ] **Step 6: After merge run exactly** `git checkout main && git pull && npx clasp push`. Do not reinstall the already-active 12-hour trigger.
- [ ] **Step 7: Run `runJobDriveDiscovery` once in Apps Script** and validate source-health output, zero unexpected source errors, clean runtime-budget fields, and expected insert/dedupe behavior.
