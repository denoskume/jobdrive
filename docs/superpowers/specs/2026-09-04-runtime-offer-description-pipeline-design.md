# Runtime Offer Description Pipeline Design

## Objective

Complete JobDrive's Offer Description Intelligence by connecting the existing description modules to a real runtime ingestion flow.

The system must retrieve or receive the real job offer description, structure it into four sections, persist it in Google Sheets, and preserve the last valid description when a later refresh fails or the offer expires.

The four popup sections remain:

1. About
2. Role & mission
3. Expectations
4. Must-have skills

## Core Principle

Google Sheets is the persistent source of truth.

The React dashboard must not scrape arbitrary job pages directly from the browser.

The runtime flow is:

Discovery / official job URL
→ description acquisition
→ deterministic enrichment
→ snapshot protection
→ Google Sheets persistence
→ React read
→ fullscreen popup

## Constraints

- No paid service.
- No paid API.
- No new backend infrastructure.
- Preserve existing Google OAuth behavior.
- Preserve existing Google Sheets authentication.
- Never fabricate job-description content.
- Never erase a valid stored description because a refresh failed.
- Expired offers retain their last valid description.
- Existing historical rows without description fields must continue to load.
- Tracking columns L, S, T, U, V, W must remain unchanged.
- Description columns remain Z through AG.
- The existing strict M2 industry internship policy remains unchanged.

## Existing Description Fields

| Column | Field |
| --- | --- |
| Z | descriptionRaw |
| AA | about |
| AB | roleMission |
| AC | expectations |
| AD | mustHaveSkills |
| AE | descriptionSource |
| AF | descriptionFetchedAt |
| AG | descriptionStatus |

Allowed description statuses:

- live
- cached
- unavailable

## Existing Modules

Reuse:

- src/offerDescription/descriptionExtractor.mjs
- src/offerDescription/descriptionSnapshot.mjs
- src/offerDescription/descriptionEnrichment.mjs
- src/services/sheetsApi.js

Do not introduce duplicate enrichment logic.

## Acquisition Strategy

### Priority 1 — Discovery supplied description

When the upstream discovery process already has the real offer description, that text is the preferred source.

It is passed as discoveryDescription into enrichOfferDescription().

### Priority 2 — Official or ATS page acquisition

If discovery does not provide description text but an official offer URL exists, the server-side ingestion layer may retrieve the page.

This must happen outside the React browser runtime.

The first implementation uses Google Apps Script because JobDrive already contains an Apps Script layer and it introduces no paid infrastructure.

Supported fetch targets should prioritize:

- official company career pages
- Greenhouse
- Lever
- SmartRecruiters
- Teamtailor
- other accessible official ATS pages

The system must not treat LinkedIn, Indeed, search engines, or intermediary listing pages as authoritative company content when an official source is unavailable.

## Page Retrieval Safety

Apps Script uses server-side HTTP retrieval.

Retrieval must:

- follow normal redirects where supported
- tolerate HTTP failures
- tolerate malformed HTML
- tolerate blocked pages
- avoid throwing away existing stored data
- never create generic fallback claims

A fetch failure produces an empty incoming description and allows snapshot preservation logic to decide whether the stored description remains cached or becomes unavailable.

## HTML to Text Normalization

Fetched HTML must be converted to clean deterministic text before extraction.

The normalizer should:

- remove script
- remove style
- remove noscript
- remove markup
- decode common HTML entities
- preserve useful line boundaries from headings, paragraphs and list items
- collapse excessive whitespace
- return an empty string when no meaningful content remains

No AI model is required for this normalization.

## Structured Extraction

extractOfferSections() remains deterministic.

It extracts:

- about
- roleMission
- expectations
- mustHaveSkills

Missing sections use the existing explicit fallback:

Not specified in the available offer description.

The extractor must not infer claims that do not exist in the source.

## Snapshot Protection

mergeDescriptionSnapshot() remains the protection layer.

Rules:

1. Valid new real description replaces the old snapshot.
2. Failed refresh does not erase an existing snapshot.
3. Empty incoming description does not erase an existing snapshot.
4. Expired offer keeps its previous valid description.
5. A job that has never had a valid description may become unavailable.

## Runtime Coordinator

A runtime coordinator will connect acquisition, enrichment and persistence.

Conceptual interface:

refreshOfferDescription({
  job,
  token,
  spreadsheetId,
  discoveryDescription,
  fetchDescription,
  now,
})

Responsibilities:

1. Determine whether enrichment is needed.
2. Prefer supplied discovery description.
3. Otherwise request description from the acquisition layer.
4. Call enrichOfferDescription().
5. Compare the resulting snapshot with the current stored snapshot.
6. Persist only when description fields changed.
7. Return the updated job object.

## Refresh Policy

The dashboard must not continuously refetch every offer on every render.

Initial policy:

- no refresh when descriptionStatus is live and descriptionRaw is non-empty
- refresh when description is missing
- refresh when status is unavailable
- preserve expired snapshots without remote refresh
- manual or future scheduled refresh can be added later without changing the data model

## React Runtime Integration

AppPro.jsx remains responsible for:

- Google authentication
- reading jobs
- filtering internships
- dashboard state

Description enrichment is inserted as a controlled post-read phase.

The dashboard must remain usable even when enrichment fails.

A description failure must not fail the full loadJobs() operation.

The job list should load first from Google Sheets.

Description enrichment may then update eligible jobs and persist successful snapshots.

## Google Sheets Persistence

updateDescriptionFields() remains the only browser-side description persistence function.

It updates only:

- Z
- AA
- AB
- AC
- AD
- AE
- AF
- AG

It must never update application tracking columns.

## Apps Script Role

apps-script/Code.gs will be extended to expose description acquisition functionality while preserving its existing jobs-read behavior.

Its responsibilities are limited to:

- fetch an allowed URL
- normalize fetched HTML
- return real normalized source text
- return acquisition metadata
- fail safely

Apps Script must not invent structured sections.

The shared JavaScript enrichment modules remain the authority for structuring and snapshot logic.

## Error Handling

Description errors are non-fatal to JobDrive.

Examples:

- HTTP failure
- blocked page
- empty page
- malformed HTML
- unsupported source
- persistence failure

Expected behavior:

- dashboard remains loaded
- existing snapshot remains visible
- error does not delete stored description
- unavailable content displays the explicit existing fallback
- application tracking remains operational

## Existing Rows

Rows created before columns Z:AG must remain valid.

Normalization continues to default missing description cells to empty strings.

No data migration is required before the application can load.

## Success Criteria

The feature is complete only when:

1. enrichOfferDescription() is called from a real runtime path.
2. updateDescriptionFields() is called from a real runtime path.
3. A real available description can travel from acquisition to Google Sheets.
4. The four structured fields are displayed by the popup.
5. Failed retrieval cannot erase a stored description.
6. Expired offers retain their cached description.
7. Historical rows still load.
8. No paid dependency is introduced.
9. Existing OAuth flow remains unchanged.
10. Full tests and production build pass.
