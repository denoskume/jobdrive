# JobDrive Phase 2A — Follow-up Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add persistent follow-up management to JobDrive Pro.

**Architecture:** Extend the current Google Sheets A:W model to A:Y while keeping Google Sheets as the source of truth. Implement and test pure follow-up logic first, then persistence, then UI and production verification.

**Tech Stack:** React, Vite, JavaScript ES modules, Google Sheets API, Google Identity Services, Node test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-26-jobdrive-pro-phase2-followups-design.md`

## Global Constraints

- Existing columns A:W remain compatible.
- X = Last Follow-up.
- Y = Follow-up Count.
- Rows are always resolved by stable Job ID.
- Terminal statuses are `Accepté`, `Refusé`, `Expiré`.
- Failed Sheets writes must not change visible follow-up state.
- Existing Favorites, Applied, Pipeline and Analytics behavior must remain intact.

---

## Task 1 — Follow-up utilities

**Files**
- Modify `src/utils/jobDrive.mjs`
- Modify `tests/jobDrive.test.mjs`

**Produces**
- `isFollowUpEligible(job)`
- `followUpBucket(job, today)`
- `classifyFollowUps(jobs, today)`
- `nextFollowUpDate(days, baseDate)`
- normalized `lastFollowUp`
- normalized `followUpCount`

### Steps

- [ ] Add failing tests for A:Y normalization.
- [ ] Verify `lastFollowUp` reads column X.
- [ ] Verify `followUpCount` reads column Y as a number.
- [ ] Add tests using fixed date `2026-08-27`:

```js
2026-08-26 -> overdue
2026-08-27 -> today
2026-08-28 -> tomorrow
2026-08-29 -> upcoming