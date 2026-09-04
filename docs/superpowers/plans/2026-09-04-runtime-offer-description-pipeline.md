# Runtime Offer Description Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Connect JobDrive's existing Offer Description Intelligence modules to a real runtime acquisition and persistence flow.

**Architecture:** Google Sheets remains the persistent source of truth. React loads stored jobs first. An isolated runtime coordinator enriches only eligible offers. Google Apps Script performs server-side official-page acquisition so arbitrary job pages are not scraped directly by the browser.

**Tech Stack:** React, Vite, Node test runner, Google Sheets API, Google Apps Script, deterministic JavaScript extraction.

**Spec:** docs/superpowers/specs/2026-09-04-runtime-offer-description-pipeline-design.md

## Global Constraints

- No paid service or API.
- No new backend infrastructure.
- Preserve Google OAuth behavior.
- Never fabricate description content.
- Never erase a valid stored description after a failed refresh.
- Preserve expired-offer snapshots.
- Keep tracking columns L/S/T/U/V/W unchanged.
- Keep description columns Z:AG unchanged.
- Preserve old Google Sheet row compatibility.
- Preserve strict M2 industry internship filtering.

---

### Task 1 — HTML description normalization

**Files**
- Create: src/offerDescription/htmlToText.mjs
- Create: tests/description-html-to-text.test.mjs

**Produces**

htmlToOfferText(html)

**Behavior**
- Remove script, style and noscript content.
- Preserve useful boundaries from headings, paragraphs, lists and line breaks.
- Strip remaining HTML.
- Decode common HTML entities.
- Collapse excessive whitespace.
- Return an empty string for meaningless input.
- Never generate text absent from the source.

**TDD**
1. Write failing tests for headings, paragraphs, lists, entities and scripts.
2. Confirm RED.
3. Implement the deterministic normalizer without external dependencies.
4. Confirm GREEN.
5. Run the full test suite.
6. Commit: feat: normalize offer html descriptions

---

### Task 2 — Description refresh eligibility

**Files**
- Create: src/offerDescription/descriptionRefreshPolicy.mjs
- Create: tests/description-refresh-policy.test.mjs

**Produces**

shouldRefreshDescription(job)

**Behavior**

Return false when:
- descriptionStatus is live and descriptionRaw is non-empty.
- the offer is expired and already contains a valid stored description.

Return true when:
- description is absent.
- descriptionStatus is unavailable.
- status is missing and descriptionRaw is empty.

**TDD**
1. Write tests for every refresh state.
2. Confirm RED.
3. Implement the pure refresh-policy function.
4. Confirm GREEN.
5. Run the full test suite.
6. Commit: feat: add offer description refresh policy

---

### Task 3 — Server-side Apps Script acquisition

**Files**
- Modify: apps-script/Code.gs
- Create: tests/apps-script-description-fetch.test.mjs

**Produces**

fetchOfferDescription_(url)

normalizeFetchedOfferHtml_(html)

**Runtime behavior**
- Preserve existing jobs-read behavior.
- Accept only http and https URLs.
- Reject malformed URLs.
- Reject known non-authoritative listing/search sources when applicable.
- Fetch with UrlFetchApp.fetch.
- Use muted HTTP exceptions.
- Return controlled failure metadata instead of breaking the whole app.
- Normalize fetched HTML into real source text.
- Never invent content.

**Success response**

{
  success: true,
  description: "...",
  source: "...",
  fetchedAt: "ISO timestamp"
}

**Failure response**

{
  success: false,
  description: "",
  source: "...",
  fetchedAt: "ISO timestamp",
  error: "..."
}

**TDD**
1. Write source-contract tests for URL validation, safe fetch behavior and response shape.
2. Confirm RED.
3. Extend Code.gs without removing existing doGet job-list behavior.
4. Confirm GREEN.
5. Run the full test suite.
6. Commit: feat: add server-side offer description acquisition

---

### Task 4 — Browser description acquisition client

**Files**
- Create: src/services/offerDescriptionApi.js
- Create: tests/offer-description-api.test.mjs

**Produces**

fetchOfferDescription({
  endpoint,
  url,
  fetchImpl
})

**Behavior**
- Call the Apps Script acquisition endpoint.
- Encode the offer URL safely.
- Validate HTTP and JSON responses.
- Return description, source and fetchedAt on success.
- Return a controlled empty-description failure result on network or source failure.
- Never fabricate offer content.

**TDD**
1. Write mocked-fetch tests for success, HTTP error, malformed payload and network failure.
2. Confirm RED.
3. Implement the acquisition client.
4. Confirm GREEN.
5. Run the full test suite.
6. Commit: feat: add offer description acquisition client

---

### Task 5 — Runtime enrichment coordinator

**Files**
- Create: src/offerDescription/runtimeDescriptionRefresh.mjs
- Create: tests/runtime-description-refresh.test.mjs

**Consumes**
- shouldRefreshDescription(job)
- enrichOfferDescription(...)
- injected fetchDescription
- injected persistDescription

**Produces**

refreshOfferDescription({
  job,
  discoveryDescription,
  fetchDescription,
  persistDescription,
  now
})

**Behavior**
1. Skip jobs that are not eligible for refresh.
2. Give a supplied discovery description highest priority.
3. Fetch the official source only when required.
4. Pass only real source content into enrichOfferDescription().
5. Preserve an existing valid snapshot after failed acquisition.
6. Persist only when description fields actually changed.
7. Return the updated job object.
8. A persistence failure must not fabricate data.

**TDD**
1. Test the no-refresh path.
2. Test discovery-description priority.
3. Test official-fetch fallback.
4. Test failed-fetch cached preservation.
5. Test changed-snapshot persistence.
6. Test unchanged snapshot avoids persistence.
7. Confirm RED.
8. Implement the coordinator with dependency injection.
9. Confirm GREEN.
10. Run the full test suite.
11. Commit: feat: coordinate runtime offer description refresh

---

### Task 6 — Connect runtime enrichment to AppPro

**Files**
- Modify: src/AppPro.jsx
- Modify: src/services/sheetsApi.js only if integration requires it
- Create: tests/jobdrive-description-runtime-wiring.test.mjs

**Consumes**
- refreshOfferDescription(...)
- fetchOfferDescription(...)
- updateDescriptionFields(...)

**Runtime behavior**

loadJobs() must continue to:

1. authenticate
2. read jobs from Google Sheets
3. filter valid internships
4. render stored Sheet data immediately

Then description enrichment runs as a controlled non-fatal phase.

For each eligible internship, the runtime coordinator receives:

- the current job
- a description acquisition function
- a persistence function backed by updateDescriptionFields()
- the current timestamp

Successful enrichment updates local state.

A description failure must not:

- fail the main loadJobs() operation
- log the user out
- erase stored descriptions
- block application tracking

**OAuth constraint**

Do not modify:

- requestGoogleToken()
- revokeGoogleToken()
- token-expiry behavior
- Google client configuration

**TDD**
1. Write wiring tests requiring the runtime imports.
2. Require refreshOfferDescription() to be called from the real job-loading path.
3. Require updateDescriptionFields() to be reachable through injected persistence.
4. Confirm RED.
5. Add the runtime wiring after initial Sheet rendering.
6. Keep enrichment failures isolated from main loading.
7. Confirm focused GREEN.
8. Run tracking and authentication regression tests.
9. Run the full suite.
10. Commit: feat: wire offer descriptions into job runtime

---

### Task 7 — Apps Script description-field compatibility

**Files**
- Modify: apps-script/Code.gs
- Modify: tests/apps-script-description-fetch.test.mjs

**Behavior**

The existing Apps Script jobs response must expose these persisted fields:

- descriptionRaw
- about
- roleMission
- expectations
- mustHaveSkills
- descriptionSource
- descriptionFetchedAt
- descriptionStatus

**Column mapping**

- Z → descriptionRaw
- AA → about
- AB → roleMission
- AC → expectations
- AD → mustHaveSkills
- AE → descriptionSource
- AF → descriptionFetchedAt
- AG → descriptionStatus

Historical rows shorter than AG must return safe empty strings.

The existing fields A through R remain unchanged.

**TDD**
1. Add failing mapping tests.
2. Confirm RED.
3. Extend Apps Script row mapping.
4. Test historical short rows.
5. Confirm GREEN.
6. Run the full suite.
7. Commit: feat: expose persisted offer descriptions in apps script

---

### Task 8 — End-to-end runtime regression

**Files**
- Create: tests/offer-description-runtime-integration.test.mjs
- Keep all existing description tests.

**Scenarios**

1. Historical job without description is eligible for acquisition.
2. Successful acquisition produces a structured snapshot.
3. Structured snapshot produces a persistence patch for Z:AG.
4. Existing live description avoids unnecessary acquisition.
5. Failed acquisition with existing snapshot preserves cached content.
6. Expired job with existing snapshot avoids destructive refresh.
7. Popup consumes about, roleMission, expectations and mustHaveSkills.
8. Official offer link remains available.
9. Tracking fields remain unchanged.
10. Strict internship filtering remains unchanged.

**TDD**
1. Write integration scenarios using dependency injection and controlled fixtures.
2. Confirm RED where runtime wiring is missing.
3. Make only the integration corrections required.
4. Confirm integration GREEN.
5. Run all description-related tests.
6. Run the full suite.
7. Commit: test: cover runtime offer description pipeline

---

### Task 9 — Final release gate

**Runtime wiring verification**

Run:

grep -R \
  "enrichOfferDescription\|updateDescriptionFields\|refreshOfferDescription\|fetchOfferDescription" \
  -n src apps-script

Expected:

- enrichOfferDescription appears in the enrichment/runtime path.
- refreshOfferDescription appears in the runtime coordinator and AppPro path.
- fetchOfferDescription appears in the acquisition service and AppPro path.
- updateDescriptionFields appears in sheetsApi and the AppPro persistence path.

**Regression verification**

Run:

npm test

Expected:
- zero failing tests.

Run:

npm run build

Expected:
- successful Vite production build.

Run:

git diff --check

Expected:
- no whitespace errors.

**Data-contract verification**

Confirm:
- tracking columns remain L/S/T/U/V/W
- description columns remain Z:AG
- old rows still normalize safely
- expired snapshots remain preserved
- failed refreshes remain non-destructive

**Dependency verification**

Confirm:
- no paid package introduced
- no paid API introduced
- no new backend service introduced
- existing Google OAuth flow unchanged

**Release sequence**

1. Commit any final test-only corrections.
2. Confirm working tree clean.
3. Push the runtime feature branch.
4. Create PR into fix/full-workspace-feed.
5. Merge only after CI/manual verification.
6. Pull updated fix/full-workspace-feed.
7. Re-run npm test.
8. Re-run npm run build.
9. Only then create the final PR from fix/full-workspace-feed to main.
