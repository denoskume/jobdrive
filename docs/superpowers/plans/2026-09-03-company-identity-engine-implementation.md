# Company Identity Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace JobDrive's manual company-logo mapping with a free, client-side company identity engine.

**Architecture:** Identity resolution is isolated from `JobDriveDashboard.jsx`. The resolver uses explicit metadata, cache, official offer URLs, supported ATS information, seed aliases, and a safe neutral fallback.

**Tech Stack:** React, Vite, JavaScript ES modules, Node test runner, localStorage, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-03-company-identity-engine-design.md`

## Global Constraints

- Free only.
- No backend required.
- Compatible with GitHub Pages.
- No paid logo API.
- No dashboard layout changes.
- No fullscreen popup changes.
- No OAuth changes.
- No Google Sheets authentication changes.
- No internship-filtering changes.
- Logo failures must never crash JobDrive.
- No generated company initials.
- Unknown companies use the neutral company icon.

## Task 1 — Company normalization and seeds

Create:

- `src/companyIdentity/companyIdentity.mjs`
- `src/companyIdentity/companyIdentitySeeds.mjs`
- `tests/companyIdentity.test.mjs`

Implement:

- `normalizeCompanyName(company)`
- `findSeedIdentity(company)`

Use seeds only as fallback aliases.

## Task 2 — Official URL resolution

Create:

- `src/companyIdentity/companyIdentitySources.mjs`

Implement:

- `normalizeDomain(domain)`
- `extractOfficialDomain(link)`

Reject job-board / intermediary domains.

## Task 3 — ATS inference

Implement:

- `inferAtsIdentity(link)`

Support deterministic tenant extraction for:

- Greenhouse
- Lever
- SmartRecruiters
- Teamtailor

Never invent a company domain from a tenant.

## Task 4 — Versioned cache

Create:

- `src/companyIdentity/companyIdentityCache.mjs`
- `tests/companyIdentity-cache.test.mjs`

Implement:

- `getCachedCompanyIdentity(company, storage)`
- `setCachedCompanyIdentity(company, identity, storage)`

Use cache key:

`jobdrive.companyIdentity.v1`

Corrupted cache data must never throw into the UI.

## Task 5 — Main resolver

Implement:

`resolveCompanyIdentity(input, options)`

Priority:

1. explicit logo URL
2. explicit company domain
3. cache
4. official offer URL
5. ATS metadata
6. seed alias
7. unresolved fallback

Return:

- company
- normalizedCompany
- domain
- logoUrl
- source
- confidence
- resolved

## Task 6 — Logo candidate chain

Implement:

`buildLogoCandidates(identity)`

Candidate order:

1. explicit logo URL
2. domain-derived logo/favicon candidate
3. neutral fallback

Remove duplicates.

## Task 7 — Reusable CompanyLogo

Create:

- `src/components/CompanyLogo.jsx`
- `tests/company-logo-ui.test.mjs`

Props:

- company
- link
- source
- companyDomain
- logoUrl

Behavior:

- resolve identity;
- build candidate list;
- move to next candidate on image error;
- render neutral fallback when exhausted;
- never render company initials.

## Task 8 — Google Sheet identity metadata

Modify:

- `src/utils/jobDrive.mjs`
- `tests/jobDrive.test.mjs`

Preserve optional fields:

- `companyDomain`
- `logoUrl`

Existing Sheet rows remain valid.

## Task 9 — Dashboard integration

Modify:

- `src/JobDriveDashboard.jsx`

Remove:

- `COMPANY_DOMAINS`
- company-specific domain resolution
- manual logo overrides

Import the reusable `CompanyLogo`.

Preserve:

- single-column internship list
- fullscreen detail popup
- favorites
- sorting
- search
- tracking
- KPI layout

## Task 10 — Final regression verification

Run:

`npm test`

Then:

`npm run build`

Then:

`git diff --check`

Manual acceptance:

- known logos resolve;
- unknown company uses neutral fallback;
- future company with official URL resolves without dashboard code changes;
- internship list remains one column;
- fullscreen popup still works;
- Esc closes popup;
- Google Sheets still loads;
- favorite/search/sorting still work.

## TDD Rule

For every task:

1. write failing test;
2. run and confirm RED;
3. implement minimum behavior;
4. rerun and confirm GREEN;
5. run relevant regression tests;
6. commit that task.

## Completion Criteria

The feature is complete when:

- all tests pass;
- production build succeeds;
- `git diff --check` is clean;
- company-specific resolver logic is gone from `JobDriveDashboard.jsx`;
- ordinary new companies no longer require manual dashboard edits.
