# JobDrive Phase 2D — France-wide Internship Discovery

Date: 2026-09-05
Status: Approved design

## Goal

Transform JobDrive Discovery from a small fixed-employer scanner into a France-wide internship discovery system that searches the French market as broadly as technically and legally possible, recovers already-open opportunities, continuously detects future opportunities, and preserves strict M2 DASSIP/CORO relevance.

Phase 2D must maximize recall at collection time and preserve precision at acceptance time.

The system must never again imply that the number of opportunities currently stored in JobDrive represents the whole French market unless coverage metrics support that conclusion.

## User objective

The target opportunity is an industry/company final-year M2 internship compatible with the Data Science, Signal and Image Processing profile, ideally 5–6 months and compatible with the Jan–Jun 2027 thesis semester.

Priority order remains:

1. strong Master/DASSIP/CORO alignment and likely pedagogical validity;
2. company and technical quality;
3. compensation last.

Academic/university/research-lab internships remain excluded. Defense-oriented opportunities remain excluded.

## Core principle

Phase 2D separates two concerns:

- **Discovery recall:** inspect as much of the French internship market as possible.
- **Eligibility precision:** accept only opportunities with real internship evidence, France compatibility, industry/company context, and substantive Master alignment.

A wider source universe must not weaken the existing hard gates.

## Current system and problem

The production Discovery engine currently relies on a hard-coded source list containing only a small set of employers and only a subset of those sources are active.

Supported source adapters currently include:

- Ashby;
- Greenhouse;
- Lever;
- SmartRecruiters;
- Teamtailor when an endpoint is configured.

The existing 12-hour Apps Script trigger is functional and must be preserved.

The current weakness is not the strictness of the M2 filter. The weakness is market coverage. A small fixed employer list cannot represent all relevant French internships.

## Scope

Phase 2D includes:

- a national multi-source Source Registry;
- large-scale ATS coverage instead of a short hard-coded employer list;
- France Travail as a national structured source when credentials/access are available;
- discovery layers for other public or legally accessible job sources;
- explicit handling of LinkedIn, Indeed and other aggregators as discovery surfaces when direct automated access is technically and contractually permitted;
- automatic discovery of new employer career sources where feasible;
- backfill of already-open opportunities;
- continuous 12-hour monitoring of future opportunities;
- rotating/batched source execution within Apps Script limits;
- per-source health and scan state;
- cross-source deduplication;
- official-company URL preference;
- market lifecycle state for active/closed/unknown opportunities;
- strict M2 eligibility evidence;
- explicit Coverage Health metrics;
- dashboard visibility into market coverage quality;
- regression protection for existing scoring, Action Center and tracking data.

## Non-goals

Phase 2D does not:

- promise mathematically complete 100% coverage of every internship published anywhere on the internet;
- bypass login walls, CAPTCHAs, robots restrictions, contractual restrictions or platform access controls;
- depend on a paid scraping or job-data API;
- weaken the industry-only policy;
- include universities, academic laboratories or research-lab internships;
- include defense-oriented opportunities;
- accept CDI, permanent roles, alternance, apprenticeship, PhD/CIFRE or postdoctoral roles;
- accept general software roles solely because the employer is an AI company;
- automatically apply to jobs;
- replace the existing Phase 2B fit score with source popularity;
- create a second Discovery trigger if the current 12-hour trigger already exists.

## Architecture overview

```text
National structured sources
        +
Employer ATS / career sources
        +
Accessible aggregators / discovery surfaces
        +
New-source discovery
        ↓
     Source Registry
        ↓
 Rotating Source Scanner
        ↓
 Adapter normalization
        ↓
 Cross-source deduplication
        ↓
 France / internship / duration / industry / Master gates
        ↓
      Phase 2B scoring
        ↓
   Google Sheets storage
        ↓
 Dashboard + Coverage Health + Action Center
```

The Source Registry and scan state are independent from the final opportunity table. Market coverage metadata must not be inferred from the number of accepted jobs.

## Source Registry

Replace the short in-code employer list as the primary source catalogue with a structured registry.

Each source record must support at least:

- `sourceKey`;
- `company` or provider name;
- `sourceType`;
- `tenant` and/or endpoint when applicable;
- `countryScope`;
- `active`;
- `priority`;
- `verificationStatus`;
- `verifiedAt`;
- `lastAttemptAt`;
- `lastSuccessfulScanAt`;
- `lastError`;
- `jobsSeenLastRun`;
- `consecutiveFailures`;
- `nextEligibleScanAt`;
- `cursor` or continuation state when supported;
- `discoveredFrom`;
- `notes`.

The registry may be stored in a dedicated Google Sheet tab so that new sources can be added or updated without editing application code for each employer.

The code still owns adapter behavior and source-type validation.

## Source families

### 1. France Travail

France Travail is a first-class national source when API access credentials are configured.

The adapter must support:

- France-wide search;
- internship/stage contract targeting;
- keyword families matching the Master scope;
- pagination;
- publication date when available;
- employer/location/link extraction;
- stable source identifiers;
- safe failure when credentials are absent or expired.

Missing France Travail credentials must not break the rest of Discovery. Coverage Health must report the source as unavailable/configuration-required.

### 2. Direct employer ATS sources

Phase 2D expands direct employer coverage across all technically accessible public ATS boards, including existing support for:

- Ashby;
- Greenhouse;
- Lever;
- SmartRecruiters;
- Teamtailor.

Additional ATS families may be added where a stable public endpoint can be used without paid infrastructure or access circumvention. Candidate families include Workday, SuccessFactors and Recruitee only when their public career endpoints can be consumed reliably and lawfully.

The employer universe is not manually restricted to a short preferred-company list. The registry should grow to hundreds of French employers and beyond when a source contains France-based internships.

### 3. Aggregators and large job platforms

Indeed, LinkedIn and other large platforms are part of the market-discovery strategy, but Phase 2D must respect their actual access model.

Rules:

- use an official/public API, feed, library or permitted endpoint when available;
- never assume an unrestricted public job-search API exists;
- never bypass authentication, CAPTCHAs or anti-bot controls;
- when direct automated access is unavailable, represent the platform in Coverage Health as restricted/unavailable rather than pretending it was scanned;
- use accessible aggregator results primarily to discover the underlying employer and official career URL when possible;
- prefer storing the official employer posting as the canonical opportunity.

### 4. Automatic new-source discovery

When an accessible source reveals an employer not yet present in the Source Registry, JobDrive should attempt to identify an official career source and supported ATS family.

New-source discovery must be conservative:

- only register an endpoint after validation;
- record `discoveredFrom`;
- begin in `unverified` state;
- activate only after a successful verification probe;
- never execute arbitrary URLs as trusted adapters.

## Geographic scope

The intended search area is the full French territory:

- metropolitan France;
- Corsica;
- French overseas departments and regions when relevant;
- remote roles genuinely open to candidates working from France.

The location gate must use structured location/country fields when available.

A mention of Paris or France inside generic company boilerplate must never make a foreign role France-compatible.

Explicit foreign-only roles are rejected.

## Backfill

Phase 2D introduces a one-time or resumable backfill mode whose purpose is to recover opportunities that are already open when the feature is deployed.

Backfill behavior:

- scan every active source in the registry;
- paginate through currently available open listings within provider limits;
- do not restrict ingestion only to postings created after Phase 2D deployment;
- preserve source-native publication dates when available;
- deduplicate against all existing JobDrive opportunities and across backfill sources;
- persist progress so an Apps Script runtime limit does not force a restart from source zero;
- resume until the active registry has been covered;
- report completion percentage and pending sources.

Backfill completion does not mean the entire internet was exhaustively covered. It means all currently active and technically accessible registered sources were scanned successfully or explicitly classified as failed/restricted.

## Continuous Watch

After backfill, the existing 12-hour Discovery schedule remains the continuous monitoring cadence.

Each run processes a rotating subset of sources based on:

- priority;
- time since last successful scan;
- prior publication volume;
- failure backoff;
- runtime budget;
- unfinished pagination/cursor state.

High-yield sources may be scanned more frequently. Low-yield sources remain in rotation rather than disappearing permanently.

A source failure must not block other sources.

The next run resumes from persisted registry state.

## Runtime budget and batching

Google Apps Script runtime limits require explicit orchestration.

Requirements:

- reserve a safety margin before hard runtime termination;
- stop starting new sources when the run budget is reached;
- persist the next source/cursor state before exit;
- continue on the next scheduled run;
- avoid repeatedly starting at the first registry row;
- record sources skipped due to runtime budget;
- expose pending backlog in Coverage Health.

The system must prefer eventual complete rotation over attempting hundreds of sources in one execution.

## Source health states

Supported source health states:

- `ok`;
- `empty`;
- `fetch_error`;
- `restricted`;
- `configuration_required`;
- `unsupported`;
- `inactive`;
- `pending`.

A source may remain known even when it cannot currently be scanned.

This distinction is essential for honest coverage reporting.

## Opportunity lifecycle

Accepted opportunities support a market lifecycle separate from application status:

- `Active` — source confirms or recently exposes the posting;
- `Closed` — source explicitly reports closure/removal/expiration;
- `Unknown` — source no longer exposes the posting but closure is not confirmed.

Phase 2D must not destroy user application history when an opportunity closes.

Application status and market lifecycle are independent concerns.

## Cross-source deduplication

The same internship may appear through France Travail, an aggregator and the employer ATS.

Deduplication uses multiple signals:

1. normalized canonical URL;
2. provider stable ID when source identity is equivalent;
3. normalized company + role + location;
4. publication-date proximity when needed;
5. optional description fingerprint for ambiguous cases.

When duplicates are found:

- retain a single canonical JobDrive opportunity;
- prefer the official employer URL over an aggregator URL;
- preserve alternate source provenance for audit/coverage;
- never overwrite user tracking fields such as favorite, status, notes, applied date or follow-up date.

## Real internship evidence

An opportunity is not considered an internship merely because JobDrive wants internships.

Valid positive evidence may come from:

- title;
- structured contract/employment type supplied by the source;
- explicit internship language in the offer description.

Recognized evidence includes bounded equivalents of:

- internship;
- intern;
- stage;
- stagiaire;
- fin d’études / fin d'etudes;
- PFE.

The storage layer must never invent `Stage` as a default contract when source evidence is missing.

If internship evidence is absent, the candidate is rejected or held outside the accepted-opportunity table for diagnostics.

## Employment hard rejects

Explicit evidence of the following rejects the opportunity:

- CDI / permanent;
- alternance;
- apprenticeship;
- PhD;
- CIFRE;
- postdoc.

`Full-time Internship` remains a valid internship.

Generic `Full-time` without real internship evidence is not a valid internship.

## Industry-only policy

Academic and research-lab internships remain excluded even when technically aligned.

Reject explicit evidence for university/academic/research-lab organizations, including established academic markers already used in Phase 2B.

Industrial R&D organizations and company research teams remain eligible when they are not academic labs.

Defense-oriented opportunities remain rejected using the existing defense policy.

## Duration policy

Preferred duration is 5–6 months.

Rules:

- explicit 5 months → compatible;
- explicit 6 months → compatible;
- explicit 5–6 months → compatible;
- explicit incompatible duration such as 2, 3, 4, 7+ months → reject;
- missing/unknown duration → keep eligible if all other gates pass, but mark `durationEvidence = unknown` and surface `Durée à confirmer`.

Missing duration must not eliminate an otherwise excellent internship because many postings omit this field.

## Timing policy

Jan–Jun 2027 is the preferred thesis-semester window.

Rules:

- explicit Jan/Feb 2027 or compatible early-2027 start strengthens practical fit;
- negotiable/flexible/unknown start may remain eligible;
- an explicitly incompatible timing window may reduce practical fit or reject when clearly impossible for the internship semester;
- timing does not override technical alignment.

## Master matching

Master matching must be based on substantive job content, not company branding.

Primary accepted technical families:

- Data Science;
- Statistical Learning / Statistical Modeling;
- Machine Learning;
- Deep Learning;
- Computer Vision;
- Image Processing;
- Signal Processing;
- Audio / Speech / Acoustic / ASR;
- Time Series / Forecasting;
- Sensor ML / Sensor Fusion;
- Medical Imaging;
- Remote Sensing / Geospatial / Earth Observation;
- Multimodal AI;
- Representation Learning;
- Scientific ML / Applied Modeling;
- meaningful Generative AI engineering/research.

Generative AI is accepted only when the work substantially involves technical model development, evaluation, experimentation, fine-tuning/training, retrieval/RAG engineering, agent/model systems or equivalent technical work.

A marketing/product/customer-success role does not become aligned merely because it mentions LLMs.

## Atypical but valid titles

The eligibility engine must not require a narrow whitelist of exact titles.

Potentially valid atypical titles include:

- Algorithms Intern;
- Perception Intern;
- Applied Research Intern;
- Predictive Maintenance Intern;
- Digital Twin Intern;
- Quant Research Intern;
- Data & Modeling Intern;
- Scientific Computing / Modeling Intern;
- R&D Intern.

These pass only when mission/skill evidence confirms Master alignment.

## Strict off-target roles

Strongly off-target roles remain rejected even inside technical companies.

Examples include:

- Customer Success / Customer Support;
- Account Manager / Account Executive;
- Sales / Business Development;
- Product Manager / Product Management;
- Full Stack / Frontend / Backend / Web Developer;
- Mobile/iOS/Android development;
- DevOps / SRE;
- IT support / workplace / operations;
- Power BI / BI reporting;
- ERP / SAP consulting;
- Cybersecurity when unrelated to the Master target;
- QA tester;
- Marketing;
- Finance Analyst without a substantive quantitative/data-science mission.

## Evidence contract

Every accepted or rejected normalized candidate should expose structured decision evidence where practical:

- `internshipEvidence`;
- `locationEvidence`;
- `durationEvidence`;
- `industryEvidence`;
- `domainEvidence`;
- `timingEvidence`;
- `rejectionReason`;
- `rejectionSignals`.

This evidence is diagnostic and explainable. It must not replace the Phase 2B score breakdown.

## Scoring relationship

Phase 2D eligibility occurs before Phase 2B scoring.

Pipeline:

```text
Discovery → normalization → dedup → hard eligibility → Phase 2B scoring → persistence
```

Only eligible opportunities are scored for final acceptance.

Phase 2B weights remain unchanged unless a future phase explicitly changes them.

Minimum persisted score remains 75.

Coverage volume must never inflate fit score.

## Coverage Health

Coverage Health is mandatory.

Per run and rolling 24-hour window, expose at least:

- total known sources;
- active sources;
- sources attempted;
- sources successfully scanned;
- sources failed;
- sources restricted/configuration-required;
- sources pending;
- sources skipped due to runtime budget;
- raw listings inspected;
- normalized candidates;
- duplicates detected;
- rejected by location;
- rejected by internship type;
- rejected by duration;
- rejected by academic/industry policy;
- rejected by defense policy;
- rejected by technical alignment;
- rejected by score;
- accepted/stored opportunities;
- last full-registry rotation completion time.

Dashboard wording must distinguish:

- `Coverage complete for registered accessible sources`;
- `Coverage incomplete`;
- `Restricted sources not scanned`.

It must never say or imply `all internships in France` unless the statement is scoped to registered accessible sources.

## Coverage dashboard

Add a compact Coverage Health section to the JobDrive dashboard.

Minimum visible information:

- `Sources scanned / active sources (24h)`;
- `Pending`;
- `Failed / Restricted`;
- `Raw listings inspected`;
- `Relevant M2 internships retained`;
- `Last rotation completed`;
- coverage state badge.

A details view may show source-level health and last scan time.

Coverage metrics are operational diagnostics, not user opportunity scores.

## Data model

Recommended additional Sheet tabs:

### `Discovery Sources`

Stores the Source Registry and mutable scan state.

### `Discovery Runs`

Stores one summary row per Discovery/backfill run for auditing and rolling coverage metrics.

### Optional `Opportunity Sources`

If cross-source provenance cannot fit cleanly in the existing opportunity row, store canonical Job ID ↔ alternate source mapping here.

The primary `Opportunités` tab remains the source of truth for user-facing opportunities and application tracking.

No existing user-tracking columns may be repurposed.

## Backfill control

Backfill must be resumable and idempotent.

Recommended functions:

- preview/configuration health function;
- start/reset backfill state function;
- run one backfill batch;
- inspect backfill status.

Backfill must not create a high-frequency trigger beyond platform limits.

The normal 12-hour Discovery trigger remains the production continuous-watch trigger.

## Error handling

One bad source must never stop the whole run.

For each source failure:

- record error message;
- increment failure count;
- update health state;
- apply bounded retry/backoff;
- continue to the next source while runtime permits.

Malformed individual listings are rejected or skipped with diagnostics rather than crashing the source batch.

Missing optional fields such as compensation, deadline, duration or publication date must not crash normalization.

Restricted sources are not retried aggressively as generic fetch errors.

## Source verification

A registry source becomes `verified` only after a successful probe that proves:

- endpoint resolves;
- adapter can parse the payload/page;
- stable posting identifiers or URLs are available;
- source is relevant to France or contains France-targetable listings.

Repeated failures can temporarily degrade a source without deleting it from the registry.

## Free-infrastructure constraint

Phase 2D must remain operable without paid infrastructure.

Allowed components include:

- Google Apps Script;
- Google Sheets;
- GitHub Pages;
- GitHub Actions within the existing project usage;
- public/free official APIs and job-board endpoints where permitted.

A source that requires a paid API for basic access is not a mandatory dependency.

## Security and credentials

API credentials, when required, must be stored in Apps Script Properties or another existing secure configuration mechanism, never committed to GitHub.

Do not write access tokens into Sheets, frontend source, logs or test fixtures.

Frontend GitHub Pages must not contain private API credentials.

## Compatibility with existing phases

Phase 2D preserves:

- Phase 2B score version and weights;
- strict M2 hard gates unless explicitly improved by this design;
- Action Center and smart follow-ups;
- favorite/status/notes/application history;
- Google OAuth frontend behavior;
- current Google Sheets source of truth;
- current daily Action Digest trigger;
- current 12-hour Discovery trigger cadence.

Existing manually curated valid opportunities remain valid.

Archived out-of-scope rows are not automatically restored.

## Testing requirements

Automated tests must cover at least:

- Source Registry validation;
- source rotation fairness;
- runtime-budget resume behavior;
- source failure isolation;
- health state transitions;
- backfill idempotency;
- backfill resume cursor/state;
- France Travail adapter normalization with mocked fixtures;
- Ashby normalization;
- Greenhouse normalization;
- Lever normalization;
- SmartRecruiters normalization;
- Teamtailor normalization when enabled;
- cross-source deduplication;
- official-URL preference;
- preservation of application tracking fields on duplicate/update;
- no invented `Stage` contract fallback;
- real internship evidence from title;
- real internship evidence from structured contract;
- real internship evidence from description;
- `international`/`internal` do not count as `intern`;
- `Full-time Internship` accepted;
- generic `Full-time` without internship evidence rejected;
- explicit 3-month internship rejected;
- explicit 5-/6-month internship accepted;
- unknown duration remains eligible and marked unknown;
- explicit foreign-only location rejected;
- France location accepted across multiple regions;
- remote-from-France accepted when evidence supports it;
- academic organizations rejected;
- defense opportunities rejected;
- Customer Success at an AI company rejected;
- Full Stack at an ML company rejected;
- Product Manager mentioning AI rejected;
- IT operations mentioning LLM rejected;
- atypical aligned technical internship accepted from mission evidence;
- Quant Research with substantive statistical/modeling mission accepted;
- GenAI technical role accepted only with substantive technical evidence;
- score threshold remains 75;
- Coverage Health aggregation;
- `coverage incomplete` when sources remain pending/failed;
- existing Phase 2B tests remain green;
- existing Action Center tests remain green;
- frontend build remains green.

## Manual verification

Before production completion verify:

- existing Discovery trigger still exists exactly once;
- Action Digest trigger still exists exactly once;
- backfill can resume after stopping mid-registry;
- source health is written correctly;
- at least one successful multi-source backfill batch runs against live accessible sources;
- new opportunities do not duplicate existing tracked rows;
- official URLs are preferred where available;
- Coverage Health displays honest source counts;
- Google Sheet user history remains intact;
- GitHub Pages deployment succeeds;
- Apps Script source sync succeeds through clasp;
- no credentials are committed.

## Production rollout

Recommended rollout order:

1. add registry + run-state data model;
2. refactor current hard-coded sources into the registry without changing behavior;
3. add orchestration/rotation and Coverage Health;
4. add France Travail adapter and credential-safe configuration path;
5. expand verified direct ATS sources substantially;
6. add new-source discovery and additional permitted source families;
7. run national backfill to completion for all registered accessible sources;
8. validate retained opportunities and false-positive rate;
9. enable continuous 12-hour rotation on the existing trigger;
10. continue growing the registry from discovered employers and source audits.

## Success criteria

Phase 2D is complete when:

- JobDrive no longer depends on a small fixed employer list as its market universe;
- registered source count and successfully scanned source count increase materially;
- already-open relevant internships are recovered through backfill;
- future relevant internships are detected by continuous scans;
- source failures and restrictions are visible rather than silently reducing coverage;
- the system can resume scanning across Apps Script runtime limits;
- cross-source duplicates collapse into one canonical opportunity;
- false positives such as Customer Success, Full Stack, CDI and non-intern roles remain rejected;
- relevant atypically titled internships can still pass on mission evidence;
- coverage state is explicit and honest;
- no paid infrastructure is required;
- existing application history and Phase 2B/2C behavior remain intact.

## Definition of honest completeness

JobDrive may say that a scan cycle is complete only when every active registered source is in one of these accounted-for states for the current rotation:

- successfully scanned;
- explicitly empty;
- explicitly restricted/configuration-required;
- explicitly failed with recorded error.

`Complete` therefore means complete accounting of the registered source universe, not guaranteed exhaustive coverage of every job advertisement on the public internet.
