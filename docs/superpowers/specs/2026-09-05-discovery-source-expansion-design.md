# JobDrive Phase 2A — Discovery Source Expansion

## Goal

Increase JobDrive's autonomous France-wide M2 internship coverage from the current small verified registry to approximately 25–30 verified company/ATS sources without weakening the existing France, internship-type, industry, DASSIP technical-alignment, scoring, deduplication, Sheet-upsert, description, notification, or 12-hour scheduling behavior.

## Scope

Phase 2A changes only the discovery-source layer and source observability. It does not redesign the dashboard, tracking workflow, scoring weights, description popup structure, or existing Google Sheet schema.

## Source policy

A source may be active only when its public structured endpoint is verified to respond successfully and returns data matching the expected adapter contract. Supported families remain Ashby, Greenhouse, Lever, SmartRecruiters, and Teamtailor only where an anonymous public structured endpoint is genuinely available.

No LinkedIn/Indeed scraping, authenticated scraping, private ATS tokens, guessed tenant identifiers, or paid infrastructure.

## Target company profile

Prioritize companies with meaningful France hiring and strong relevance to Data Science, Machine Learning, Deep Learning, Computer Vision, Image Processing, Signal Processing, Audio/Speech ML, Multimodal AI, Representation Learning, substantial GenAI, Time Series, Sensor ML, Medical Imaging, Biomedical Signal ML, Remote Sensing, and Geospatial ML.

Academic institutions, universities, research institutes, and defense-oriented organizations remain excluded by default under the existing policy.

## Verification workflow

Each candidate source must pass a verification step before activation:

1. Confirm the official careers/job-board relationship.
2. Confirm the ATS family and exact public endpoint/tenant.
3. Fetch the endpoint successfully.
4. Confirm the response contains identifiable job records.
5. Confirm official job URLs can be produced.
6. Record verification metadata.
7. Only then set the source active.

Unverified or failing sources remain inactive and must never contribute jobs.

## Registry design

Each registry entry should contain at least:

- `key`
- `company`
- `type`
- `tenant` or `endpoint`
- `active`
- `verifiedAt`
- `verificationStatus`
- optional `notes`

The browser-side registry and Apps Script production registry must remain aligned. Prefer a single canonical source definition where practical; otherwise enforce parity with tests.

## Source health observability

The discovery run summary should preserve existing aggregate metrics and add per-source health details sufficient to diagnose degraded coverage without reading raw Apps Script logs.

For each attempted source, capture:

- source key
- adapter type
- status: `ok`, `empty`, `fetch_error`, `unsupported`, `inactive`
- jobs found
- error text when present
- elapsed time where practical

The global run remains failure-isolated: one bad source must not stop the other sources.

## Runtime limits

The expansion must remain safe for Apps Script execution quotas. The runner should enforce a practical execution-time budget and stop cleanly if the budget is approached, while returning an explicit summary rather than failing mid-run.

Source adapters should avoid unnecessary detail requests during discovery. Full description enrichment remains a separate concern.

## Acceptance criteria

Phase 2A is complete when:

- approximately 25–30 source entries have been evaluated;
- at least 20 verified sources are active, unless the public ATS landscape proves a smaller verified set is the realistic ceiling;
- every active source has evidence-backed endpoint configuration;
- at least four structured ATS families remain supported in production code;
- failed sources are isolated and visible in per-source health output;
- no active source uses an invented/untested tenant;
- existing eligibility, scoring threshold, dedupe, Sheet ownership boundaries, and 12-hour trigger behavior remain unchanged;
- automated tests cover registry uniqueness, verification-state rules, registry parity, source-health aggregation, and runtime-budget behavior;
- `npm test` and `npm run build` pass before merge.

## Out of scope

Phase 2B will refine scoring quality and ranking. Phase 2C will automate richer description acquisition/enrichment. Neither is part of this implementation.

## Rollout

Implement on `feature/discovery-source-expansion`, verify through CI, review the diff, then merge to `main`. After merge, push `apps-script` with clasp once. The already-installed 12-hour trigger is reused; it must not be recreated unless the handler changes.
