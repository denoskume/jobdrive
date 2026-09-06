# JobDrive Target Company Coverage — 200-Company Market Watch

Date: 2026-09-06
Status: Approved in-chat design; written-spec review pending

## Goal

Extend JobDrive from source-centric discovery into a company-aware market watch covering an initial catalogue of **200 target employers in France** that are relevant to the M2 Data Science, Signal and Image Processing profile.

The feature must answer two different questions without conflating them:

1. **How many technically accessible discovery sources are healthy?**
2. **How much of the target employer market is actually covered?**

The existing Discovery Source Registry remains responsible for technical endpoints. A new Target Company Registry becomes responsible for the strategic employer universe.

## User objective

The target opportunity remains an industry/company final-year M2 internship in France, ideally 5–6 months and compatible with Jan–Jun 2027.

Priority order remains:

1. Master/DASSIP/CORO alignment;
2. company and technical quality;
3. compensation last.

Academic/university/research-lab internships remain excluded. Defense-oriented opportunities remain excluded. No paid infrastructure is permitted.

## Why this is a separate subsystem

A source is not a company.

One ATS source can represent one company, many companies can share the same ATS technology, and a national source such as France Travail can surface jobs from many employers without guaranteeing complete employer-specific coverage.

Therefore:

- `Discovery Sources` measures scanner health;
- `Target Companies` measures employer-market coverage;
- `Opportunités` stores retained internships;
- the dashboard combines these layers without treating them as interchangeable.

## Initial target universe

The initial registry must contain **exactly 200 unique companies** with a meaningful France presence and plausible recurring demand in at least one target specialization.

The seed catalogue combines:

- large groups / multinational employers active in France;
- recognized French and international technology companies;
- ETIs and engineering companies;
- AI/data scale-ups;
- specialist companies in computer vision, signal, imaging, audio, medical AI, geospatial/remote sensing, time series, industrial analytics, and adjacent technical domains.

The catalogue is not a promise that every company has an open internship at seed time. It is the market universe JobDrive intends to watch.

### Company classes

Each company has one strategic class:

- `giant`: major group or multinational employer with substantial France operations;
- `recognized`: established, reputable specialist, ETI, scale-up, or technology company relevant to the Master.

### Priority tiers

Each company has one priority tier:

- `1`: strongest expected DASSIP/CORO fit and/or exceptional technical/company quality;
- `2`: clearly relevant recurring employer worth systematic monitoring;
- `3`: useful adjacent employer that broadens recall without diluting hard eligibility gates.

The initial catalogue should be roughly balanced around 60–80 giants and 120–140 recognized companies, while remaining exactly 200 unique records after deduplication.

## Target specializations

A company must be tagged with one or more of:

- `data-science`;
- `machine-learning`;
- `deep-learning`;
- `computer-vision`;
- `image-processing`;
- `signal-processing`;
- `audio-speech`;
- `medical-imaging`;
- `remote-sensing`;
- `time-series`;
- `multimodal-ai`;
- `industrial-ai`.

These tags describe company-level relevance only. They never override offer-level eligibility.

## Data model

Create a dedicated Google Sheet tab named `Target Companies`.

Each row must support at least:

- `companyKey`: stable lowercase slug;
- `companyName`: canonical display name;
- `companyClass`: `giant` or `recognized`;
- `priorityTier`: `1`, `2`, or `3`;
- `sector`;
- `specializations`: comma-separated target tags;
- `francePresence`: `verified`, `probable`, or `unknown`;
- `officialDomain`;
- `careersUrl`;
- `aliases`: comma-separated known employer-name variants;
- `sourceKeys`: comma-separated direct source-registry keys when known;
- `coverageStatus`: `covered`, `partial`, or `uncovered`;
- `coverageReason`;
- `lastCoveredAt`;
- `lastSeenInternshipAt`;
- `activeInternshipCount`;
- `notes`.

`companyKey` is immutable after creation. Display-name and metadata corrections must not create a second company.

## Seed catalogue quality rules

The 200-company seed must satisfy all of the following:

- exactly 200 unique `companyKey` values;
- no duplicate canonical companies under alternate brand names;
- plausible operations or hiring presence in France;
- at least one target specialization;
- no university, school, academic research institute, or academic laboratory;
- no company whose target value is primarily defense/military work;
- no record added solely because the company is famous;
- no fabricated ATS tenant or career endpoint;
- unknown source details remain blank rather than guessed.

The seed catalogue is maintained as version-controlled data for reproducibility, then idempotently synchronized into the `Target Companies` sheet.

## Coverage semantics

Coverage must be conservative. JobDrive must never label a company `covered` merely because a market-wide source exists.

### `covered`

A target company is `covered` when at least one **company-specific, verified, active discovery source** is mapped to it and that source has a recent successful scan within the normal coverage window.

Examples:

- verified Ashby board for the company;
- verified Greenhouse board;
- verified Lever board;
- verified SmartRecruiters tenant;
- another validated official/public company-specific career source supported by JobDrive.

### `partial`

A target company is `partial` when no healthy direct company-specific source is available, but JobDrive has evidence that the company is currently observable through an accessible market-wide source such as France Travail or another permitted discovery surface.

A generic France Travail connection does **not** make all 200 companies partial automatically. The company must have been observed or explicitly queryable through that source.

### `uncovered`

A company is `uncovered` when JobDrive has no healthy direct source and no current market-source evidence sufficient to claim monitoring.

Restricted LinkedIn/Indeed access must never be counted as coverage.

## Company identity and matching

Company matching must use canonical identity rather than exact display-string equality.

Matching order:

1. explicit `companyKey` / source mapping;
2. normalized canonical company name;
3. normalized alias match;
4. conservative domain match when an official company domain is available.

The matcher must avoid over-broad substring matching. For example, short aliases such as `AI`, `Orange`, or `Total` require exact normalized alias/domain evidence rather than free substring search.

The existing Company Identity engine should be reused where practical instead of creating a competing normalization system.

## Synchronization and refresh

Add an idempotent Apps Script target-company bootstrap/refresh flow.

Responsibilities:

1. ensure the `Target Companies` sheet and header exist;
2. insert missing seed companies without overwriting user-maintained operational fields;
3. refresh direct source coverage from `Discovery Sources`;
4. refresh `partial` evidence from recently observed market-wide discovery results where available;
5. refresh active internship counts from retained opportunities;
6. update `lastCoveredAt` and `lastSeenInternshipAt` only from real evidence;
7. preserve notes and manual metadata corrections.

The normal 12-hour discovery lifecycle should update company coverage after source scans. It must not create a second independent high-frequency trigger.

## Dashboard — Companies view

The existing `Companies` navigation item becomes functional.

The view must show a market-coverage summary with at least:

- `Target companies`: 200;
- `Covered`;
- `Partial`;
- `Not covered`;
- `Active internships`;
- `Tier 1 covered` percentage.

The main list/table must support:

- search by company;
- filter by `giant` / `recognized`;
- filter by tier;
- filter by specialization;
- filter by `covered` / `partial` / `uncovered`;
- sorting with Tier 1 and uncovered strategic companies easy to surface.

Each company row/card should show:

- company name;
- class and tier;
- sector;
- specialization tags;
- coverage state;
- active internship count;
- latest coverage/observation timestamp where available.

The Companies view is a coverage-control surface, not a second opportunity list.

## Dashboard — Coverage Health integration

The existing source-based Coverage Health card remains unchanged in meaning.

Do not replace `23 / 23 sources` with `200 companies` because they measure different things.

The Companies view supplies the employer-market metrics. A compact employer-coverage indicator may later be added to Overview, but only after the Companies view is stable.

## Frontend data flow

Extend the existing authenticated Google Sheets data layer with a `readTargetCompanies()` function reading `Target Companies`.

`AppPro` loads target-company data alongside opportunities and discovery coverage after Google authentication.

The frontend normalizes company rows into a dedicated model and derives UI metrics from that model. Opportunity counts are joined to companies by canonical company identity.

A failure to load Target Companies must not prevent the user from accessing existing opportunities; the Companies view should show a clear degraded-state message instead.

## Backend/source-registry relationship

The Target Company Registry does not execute network requests itself.

It references the existing Source Registry through `sourceKeys`. Discovery adapters remain implemented only once in the existing discovery subsystem.

When a new source is verified for a target employer, the target-company refresh should be able to convert that company from `uncovered`/`partial` to `covered` without altering the company's strategic metadata.

## Source expansion after the seed

The 200-company catalogue creates an explicit backlog of uncovered companies.

Future source expansion should prioritize:

1. Tier 1 uncovered companies;
2. Tier 2 uncovered companies;
3. Tier 3 uncovered companies.

For each uncovered company, source discovery may look for official careers pages and supported ATS endpoints, but it must follow existing legal/technical rules:

- no login-wall bypass;
- no CAPTCHA bypass;
- no paid scraping dependency;
- no fabricated endpoint;
- verify before marking active;
- restricted sources remain explicitly restricted.

## Opportunity eligibility remains strict

Adding a company to the target registry does not make all of its jobs relevant.

Every retained opportunity must still pass the existing hard gates for:

- internship/stage evidence;
- France compatibility;
- M2/final-year relevance;
- target technical alignment;
- industry/company context;
- exclusion of academic/research-lab placements;
- exclusion of defense-oriented roles;
- exclusion of permanent jobs, alternance/apprenticeship, PhD/CIFRE, and unrelated software roles.

The target-company catalogue expands recall; it does not weaken precision.

## Testing requirements

Add regression tests for at least:

1. seed catalogue contains exactly 200 unique companies;
2. every seed company has a valid class, tier, and at least one specialization;
3. academic/research-lab entries are absent;
4. known defense-only targets are absent;
5. source mapping marks a company covered only from healthy verified direct sources;
6. generic France Travail availability alone does not mark all companies partial;
7. observed market-source evidence can mark a company partial;
8. alias normalization joins internships to the correct target company;
9. target-company bootstrap is idempotent;
10. operational sheet fields are preserved on reseed;
11. Companies-view filters and counters are correct;
12. Target Companies read failure does not break the Opportunities dashboard;
13. all existing discovery, scoring, Action Center, company identity, description, and dashboard tests remain green;
14. production build succeeds.

## Acceptance criteria

The feature is complete when:

- `Target Companies` contains exactly 200 deduplicated seeded employers;
- Companies navigation opens a working coverage view;
- the view clearly separates covered, partial, and uncovered employers;
- `Target companies` displays 200;
- coverage status is evidence-based rather than inferred from company fame or national-source availability;
- existing 23-source Coverage Health continues to represent source health only;
- active retained internships are attributed to target employers when identities match;
- Tier 1 uncovered employers can be surfaced immediately for source-expansion work;
- no academic/research-lab or defense-oriented target is introduced;
- no paid infrastructure is added;
- all tests and build pass.

## Non-goals for this implementation

This implementation does not require all 200 companies to become directly covered immediately.

It also does not:

- scrape restricted platforms;
- automatically apply to internships;
- guarantee every internship in France is captured;
- add a second scheduler;
- change the existing fit-score weighting;
- remove France Travail or the current Source Registry;
- treat a target company as an accepted opportunity source without verification.

## Delivery sequence

Implementation should proceed in independent, testable slices:

1. 200-company seed catalogue and validation;
2. Target Companies Apps Script sheet/bootstrap model;
3. evidence-based source/market coverage refresh;
4. frontend Target Companies reader/model;
5. Companies dashboard view and filters;
6. integration/regression verification and production deployment.

This sequence allows the company universe to exist and be validated before UI polish or broader source expansion.