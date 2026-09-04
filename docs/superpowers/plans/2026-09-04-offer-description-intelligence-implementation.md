# Offer Description Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Persist real internship descriptions, extract four faithful semantic sections, and display them in a one-column popup.

**Architecture:** Extend the Google Sheets schema, normalize the new fields, extract structured sections from real offer text, preserve the last valid snapshot, persist enrichment results, then render the structured summary in the existing fullscreen popup.

**Tech Stack:** React, Vite, JavaScript ES modules, Node test runner, Google Sheets API, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-04-offer-description-intelligence-design.md`

## Global Constraints

- Keep Google OAuth unchanged.
- Keep existing tracking updates unchanged.
- Keep company identity fields unchanged.
- Keep GitHub Pages compatibility.
- Use no paid API or backend.
- Never replace a valid description snapshot with empty or failed data.
- Never invent offer content.
- Existing Sheet rows without description fields must remain compatible.

---

### Task 1 — Extend Google Sheets job model

**Files**
- Modify: `src/utils/jobDrive.mjs`
- Modify: `src/services/sheetsApi.js`
- Test: `tests/jobDrive.test.mjs`
- Create: `tests/jobdrive-description-sheet.test.mjs`

**Produces**
`descriptionRaw`, `about`, `roleMission`, `expectations`,
`mustHaveSkills`, `descriptionSource`, `descriptionFetchedAt`,
`descriptionStatus`.

**TDD**
1. Add failing normalization tests for columns Z:AG.
2. Add backward-compatibility test for old rows.
3. Run focused tests and confirm RED.
4. Extend `normalizeJobs()`.
5. Change Sheet read range from `A:W` to `A:AG`.
6. Run focused tests and full suite.
7. Commit: `feat: extend job model with offer descriptions`

---

### Task 2 — Deterministic description extractor

**Files**
- Create: `src/offerDescription/descriptionExtractor.mjs`
- Create: `tests/description-extractor.test.mjs`

**Produces**
`extractOfferSections(descriptionRaw)` returning:
`about`, `roleMission`, `expectations`, `mustHaveSkills`.

**TDD**
1. Write English description tests.
2. Write French description tests.
3. Test missing sections.
4. Test that nice-to-have skills never become must-have.
5. Confirm RED.
6. Implement heading-aware extraction.
7. Confirm GREEN and run full suite.
8. Commit: `feat: extract structured offer description sections`

---

### Task 3 — Preserve the last valid description snapshot

**Files**
- Create: `src/offerDescription/descriptionSnapshot.mjs`
- Create: `tests/description-snapshot.test.mjs`

**Produces**
`mergeDescriptionSnapshot(existingJob, incomingDescription)`.

**TDD**
1. Test valid incoming description on empty snapshot.
2. Test failed fetch preserving existing snapshot.
3. Test empty incoming description preserving existing snapshot.
4. Test expired offer becoming `cached`.
5. Test first-time failure becoming `unavailable`.
6. Confirm RED.
7. Implement minimal preservation policy.
8. Confirm GREEN and run full suite.
9. Commit: `feat: preserve offer description snapshots`

---

### Task 4 — Persist description fields to Google Sheets

**Files**
- Modify: `src/services/sheetsApi.js`
- Create: `tests/jobdrive-description-persistence.test.mjs`

**Produces**
`updateDescriptionFields({ token, spreadsheetId, jobId, description })`.

**Column mapping**
- Z: descriptionRaw
- AA: about
- AB: roleMission
- AC: expectations
- AD: mustHaveSkills
- AE: descriptionSource
- AF: descriptionFetchedAt
- AG: descriptionStatus

**TDD**
1. Write failing column-mapping test.
2. Confirm RED.
3. Reuse existing row lookup and batch update logic.
4. Do not alter tracking columns L/S/T/U/V/W.
5. Confirm GREEN and run full suite.
6. Commit: `feat: persist offer description snapshots`

---

### Task 5 — Description enrichment coordinator

**Files**
- Create: `src/offerDescription/descriptionEnrichment.mjs`
- Create: `tests/description-enrichment.test.mjs`

**Produces**
`enrichOfferDescription({ job, suppliedDescription, fetchedDescription, source, fetchedAt })`.

**Priority**
1. supplied discovery description
2. fetched official/ATS description
3. existing stored snapshot
4. unavailable

**TDD**
1. Test each priority level.
2. Test failed fetch never erases stored description.
3. Confirm RED.
4. Compose `extractOfferSections()` with `mergeDescriptionSnapshot()`.
5. Confirm GREEN and run full suite.
6. Commit: `feat: add offer description enrichment pipeline`

---

### Task 6 — One-column complete popup summary

**Files**
- Modify: `src/JobDriveDashboard.jsx`
- Modify: `src/jobdrive-dashboard.css`
- Modify: `tests/jobdrive-offer-summary.test.mjs`
- Keep: `tests/jobdrive-full-workspace-feed.test.mjs`

**Consumes**
- `job.about`
- `job.roleMission`
- `job.expectations`
- `job.mustHaveSkills`

**Behavior**
The fullscreen popup displays exactly four full-width sections in one vertical column:

1. About
2. Role & mission
3. Expectations
4. Must-have skills

Structured stored fields take priority.

Historical rows with no structured description may use conservative fallback content from existing real metadata only.

**TDD**
1. Update popup tests to require the exact four section titles.
2. Require one-column CSS.
3. Require no `repeat(2, ...)` for offer summary.
4. Confirm RED.
5. Update rendering to use stored structured fields first.
6. Keep official offer button visible.
7. Keep match, job details and tracking sections.
8. Confirm GREEN with popup + full-workspace tests.
9. Run full suite.
10. Commit: `feat: show complete one-column offer summary`

---

### Task 7 — Final regression and release gate

**Files**
- Add: `docs/superpowers/specs/2026-09-04-offer-description-intelligence-design.md`
- Add: `docs/superpowers/plans/2026-09-04-offer-description-intelligence-implementation.md`

**Verification**
1. Run `npm test`.
2. Run `npm run build`.
3. Run `git diff --check`.
4. Verify all new field names are consistent across model, persistence, extractor and UI.
5. Verify old rows without descriptions still load.
6. Verify the full-space internship feed still works.
7. Verify popup opens fullscreen and closes with Escape.
8. Verify the four summary sections appear in one column.
9. Verify official offer link remains available.
10. Verify failed description refresh never deletes stored content.
11. Verify expired offers retain cached description.
12. Verify no paid service or backend dependency was introduced.

**Final commits**
- Commit docs: `docs: add offer description intelligence design and plan`
- Push branch: `fix/full-workspace-feed`

