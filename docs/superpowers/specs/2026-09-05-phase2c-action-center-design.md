# JobDrive Phase 2C — Application Action Center & Smart Follow-ups

Date: 2026-09-05
Status: Design approved in chat; written spec pending final user review

## Goal

Turn JobDrive from a strong internship discovery and ranking system into a daily execution system.

Phase 2A discovers relevant industrial M2 internships. Phase 2B scores and ranks them. Phase 2C answers the next operational question:

> What should I do now so I do not miss a strong internship or forget an application follow-up?

The feature remains deterministic, explainable, free to operate, and compatible with the existing Google Sheets + Apps Script + GitHub Pages architecture.

## Core principle

Phase 2C separates two concerns:

- `M2 Internships` remains the place to explore and compare opportunities.
- `Action Center` becomes the place to execute the next best actions.

Phase 2C must never change the Phase 2B `fitScore` merely because a deadline or follow-up is urgent.

Technical fit answers "how good is this internship?".

Action priority answers "how urgently should I act on it?".

These values are related but must remain independent.

## Current system to preserve

The current JobDrive production system already includes:

- Google OAuth in the frontend;
- Google Sheets as the source of truth;
- M2 industrial internship filtering;
- automated discovery on an existing 12-hour schedule;
- offer-description enrichment;
- company identity enrichment;
- Phase 2B scoring version `2.0`;
- `fitScore`, grade, priority, domain, strengths, weaknesses and score breakdown;
- application statuses;
- `appliedDate`;
- `followUpDate`;
- notes and `lastUpdated`;
- GitHub Pages deployment;
- Apps Script deployment through clasp.

Phase 2C must preserve all of these behaviors.

## Scope

Phase 2C includes:

- a new `Action Center` navigation page;
- a deterministic action engine;
- Apply Now actions;
- Deadline Risk actions;
- Overdue Follow-up actions;
- Follow-up Today actions;
- Follow-up Tomorrow / Upcoming actions;
- a Schedule Follow-up action when an active application has no next follow-up;
- one-click follow-up completion and rescheduling;
- Last Follow-up tracking;
- Follow-up Count tracking;
- action-priority snapshots in Google Sheets;
- an Overview KPI for current actions;
- a single daily Gmail digest;
- a separate daily Apps Script trigger around 09:00 Europe/Paris;
- mobile-safe Action Center behavior;
- regression protection for Discovery, Phase 2B scoring, Sheets tracking and the current UI.

## Non-goals

Phase 2C does not:

- automatically submit job applications;
- generate or send cover letters;
- generate or send recruiter messages;
- scrape LinkedIn or Indeed;
- introduce a paid API;
- introduce a separate backend server;
- introduce a separate database;
- use browser push notifications;
- use PWA push notifications;
- recreate or replace the existing 12-hour discovery trigger;
- modify Phase 2B scoring weights;
- modify the Phase 2B acceptance threshold;
- optimize primarily for compensation;
- include academic or research-lab internships;
- include defense-oriented opportunities;
- create one reminder email per opportunity;
- require ChatGPT reminders as part of this phase.

## Action engine contract

The action engine receives a normalized JobDrive opportunity and an explicit current time.

It returns a deterministic object with at least:

- `active` — whether the opportunity currently requires action;
- `actionType`;
- `actionPriority`;
- `actionReason`;
- `actionDate` when applicable;
- `urgencyDays` when a relevant date exists.

Supported `actionType` values:

- `APPLY_NOW`
- `DEADLINE_RISK`
- `FOLLOW_UP_OVERDUE`
- `FOLLOW_UP_TODAY`
- `FOLLOW_UP_TOMORROW`
- `UPCOMING_FOLLOW_UP`
- `SCHEDULE_FOLLOW_UP`
- `NONE`

Supported `actionPriority` values:

- `Critical`
- `High`
- `Normal`
- `None`

The engine must produce the same result for the same normalized job and current instant.

## Status policy

Terminal statuses never create active actions:

- `Accepté`
- `Refusé`
- `Expiré`

Application-tracking statuses are:

- `Candidature envoyée`
- `Entretien`
- `Offre`

Pre-application statuses are:

- `Nouveau`
- `À candidater`

Phase 2C must not silently change a status. Status transitions remain user-owned actions.

## Calendar and timezone semantics

All day-based Phase 2C classifications use `Europe/Paris` as the canonical timezone.

This applies to:

- deadline day comparisons;
- follow-up day comparisons;
- applied-age calculations;
- digest date/idempotency;
- trigger intent.

Date-only values such as `2026-09-10` are calendar dates, not UTC-midnight instants.

ISO timestamps such as Last Follow-up and Last Updated are stored as timestamps, then converted to the Paris calendar day only when a day-based comparison is required.

Frontend and Apps Script implementations must use equivalent date semantics and parity tests must cover timezone-sensitive fixtures.

## Follow-up rules

For application-tracking statuses with a populated `followUpDate`:

- date before today → `FOLLOW_UP_OVERDUE`, `Critical`;
- date today → `FOLLOW_UP_TODAY`, `Critical`;
- date tomorrow → `FOLLOW_UP_TOMORROW`, `High`;
- date after tomorrow → `UPCOMING_FOLLOW_UP`, `Normal`.

Follow-up urgency takes precedence over generic Apply Now logic because the application has already been submitted.

For an application-tracking status with no `followUpDate`:

- return `SCHEDULE_FOLLOW_UP`;
- default priority is `Normal`;
- if an `appliedDate` exists and is at least 3 Paris calendar days old, priority becomes `High`.

Follow-up tracking remains active regardless of whether an already-applied historical row has a current Phase 2B score. A user must not lose follow-up visibility because a legacy score is missing.

Missing or malformed dates must not crash the engine.

## Pre-application rules

For `Nouveau` and `À candidater`, use the Phase 2B score and deadline without modifying either.

Only pre-application opportunities with a numeric `fitScore >= 75` are promoted into Apply Now or Deadline Risk actions.

A legacy pre-application row with a missing or lower score remains visible elsewhere in JobDrive but returns `NONE` from Phase 2C until it has a qualifying score. Phase 2C must not invent one.

### Passed deadline

If a valid application deadline is before today:

- no Apply Now action is generated;
- the engine returns `NONE` for active application work;
- Phase 2C does not automatically change the job status to `Expiré`.

A separate visible expired-deadline warning may remain in the opportunity detail UI.

### Deadline today or tomorrow

For every qualifying stored internship with `fitScore >= 75`:

- return `DEADLINE_RISK`;
- priority `Critical`.

### Deadline within 2–3 days

- `fitScore >= 85` → `DEADLINE_RISK`, `Critical`;
- `fitScore 75–84` → `DEADLINE_RISK`, `High`.

### Deadline within 4–7 days

- `fitScore >= 85` → `DEADLINE_RISK`, `High`;
- `fitScore 75–84` → `DEADLINE_RISK`, `Normal`.

### Deadline later than 7 days or not specified

- `fitScore >= 90` → `APPLY_NOW`, `High`;
- `fitScore 85–89` → `APPLY_NOW`, `High`;
- `fitScore 75–84` → `APPLY_NOW`, `Normal`.

This ensures an excellent technical match is surfaced even without a near deadline while preventing freshness or deadline urgency from changing the underlying fit score.

## Action ordering

Action Center ordering is deterministic.

Primary order:

1. `Critical`;
2. `High`;
3. `Normal`.

Within the same priority:

1. overdue follow-up first;
2. due-today follow-up;
3. deadline risk;
4. follow-up tomorrow;
5. Apply Now;
6. upcoming follow-up;
7. schedule follow-up.

Tie-breakers:

1. nearest relevant action date;
2. `fitScore` descending;
3. publication date descending;
4. detected date descending;
5. stable Job ID.

## Action Center UI

Add `Action Center` to the main navigation.

The page is operational rather than analytical.

It contains the following visible groups when non-empty:

- `Overdue Follow-up`
- `Follow-up Today`
- `Deadline Risk`
- `Apply Now`
- `Upcoming`

`Upcoming` may contain follow-up tomorrow, future follow-ups and schedule-follow-up items.

Empty groups are not rendered as large blank sections.

Each action card shows, when available:

- company;
- role;
- Phase 2B fit score;
- Phase 2B grade;
- dominant domain;
- current status;
- action priority;
- concise action reason;
- deadline;
- follow-up date;
- applied date;
- follow-up count;
- official offer link.

Each card supports:

- Open Details;
- Open Official Offer;
- Favorite behavior already supported by JobDrive;
- status editing through existing JobDrive controls;
- follow-up action where applicable.

The original job posting remains the source of truth for offer content.

## Overview KPI

Add an Action Center KPI to the Overview page.

Label:

`ACTIONS TODAY`

The KPI counts current `Critical` and `High` actions only. `Normal` Upcoming backlog is not included in the headline count.

Minimum display:

- number of current Critical + High actions;
- number of Critical actions.

Example:

`6 active · 2 critical`

Selecting the KPI opens `Action Center`, where the full Critical/High/Normal backlog remains available.

The KPI must be calculated from the current normalized jobs and current Paris date, not from a hard-coded counter or stale AQ:AS snapshots.

## Follow-up completion flow

For active application statuses, `Mark Followed Up` opens a compact action menu:

- `+3 days`
- `+7 days`
- `+14 days`
- `No further follow-up`

For `+3`, `+7` or `+14`:

- `Last Follow-up` = current ISO timestamp;
- `Follow-up Count` = previous count + 1;
- existing `followUpDate` = selected future Paris calendar date;
- existing `lastUpdated` = current ISO timestamp.

For `No further follow-up`:

- `Last Follow-up` = current ISO timestamp;
- `Follow-up Count` = previous count + 1;
- existing `followUpDate` = empty;
- existing `lastUpdated` = current ISO timestamp.

The write to Google Sheets must succeed before the UI treats the operation as complete.

If the write fails:

- retain the previous visible state;
- show an actionable error;
- do not increment Follow-up Count;
- do not move the item to another Action Center group;
- do not clear the follow-up date.

All updates must identify the row through stable Job ID behavior already used by JobDrive, not through the card's current visual index.

## Google Sheets data model

Current Phase 2B scoring metadata occupies AI:AN.

Phase 2C appends system-owned fields after AN:

- AO — `lastFollowUp`
- AP — `followUpCount`
- AQ — `actionPriority`
- AR — `actionReason`
- AS — `actionUpdatedAt`

Existing columns remain unchanged, including:

- S — favorite;
- T — applied date;
- U — follow-up date;
- V — notes;
- W — last updated;
- X:Y:Z — existing reserved/business fields;
- AA:AH — description enrichment;
- AI:AN — Phase 2B scoring.

No existing user-owned or Phase 2B field may be repurposed.

## Action snapshot semantics

`AQ:AS` are system-owned snapshots, not the primary source for date-sensitive UI classification.

Reason: action urgency changes as calendar time advances even when a row is not edited.

Therefore:

- the frontend computes current action state from live row data and the current Paris date;
- the Apps Script digest computes current action state from live row data and the current Paris date;
- `AQ:AS` store the most recently evaluated backend snapshot for observability and diagnostics;
- the daily action job refreshes `AQ:AS`;
- a successful follow-up/status-related write refreshes the affected row's action snapshot when possible.

A stale snapshot must never cause the UI to hide a currently urgent action.

## Read/write range

Extend the normalized Sheet read range from `A:AN` to `A:AS`.

Old rows with no AO:AS values remain valid.

The normalizer must safely interpret:

- empty Last Follow-up;
- empty or malformed Follow-up Count;
- empty action snapshot fields.

Default Follow-up Count is `0`.

## Daily Gmail digest

Phase 2C sends at most one operational digest per Paris calendar day.

The digest includes only useful current actions, prioritizing:

- overdue follow-ups;
- follow-ups due today;
- follow-ups due tomorrow;
- Critical deadline risks;
- High deadline risks;
- High Apply Now opportunities;
- High Schedule Follow-up items.

Normal future items are omitted from email by default to reduce noise.

If there are no digest-worthy actions, no email is sent.

Suggested subject:

`JobDrive Action Digest — 05 Sep 2026`

Suggested sections:

- `OVERDUE FOLLOW-UP`
- `FOLLOW-UP TODAY`
- `DEADLINE RISK`
- `APPLY NOW`
- `TOMORROW`
- `SCHEDULE FOLLOW-UP`

Each digest item includes when available:

- company;
- role;
- action reason;
- fit score;
- deadline or follow-up date;
- current status;
- official job URL.

No invented information is added.

## Digest recipient configuration

Do not hard-code a personal email address into the repository.

Preferred recipient resolution:

1. Apps Script property `JOBDRIVE_DIGEST_EMAIL` when configured;
2. otherwise the script's effective user email when available;
3. if neither is available, skip sending and log a clear configuration error.

No OAuth password, refresh token or mail credential is stored in source code.

Apps Script `MailApp` is sufficient; no paid mail service is introduced.

## Digest idempotency

The daily job must avoid accidental duplicate digests.

Use a Script Property such as `JOBDRIVE_LAST_DIGEST_DATE` in Europe/Paris.

A normal scheduled run sends at most once for a given Paris calendar date.

A separate preview/build function may generate digest content without sending and without updating the idempotency key.

If there is nothing to send, the send-success key is not advanced merely to suppress a later genuinely useful digest on the same day.

A failed send must not mark the digest date as successfully sent.

## Reminder schedule

Create one dedicated time-driven Apps Script trigger for the Phase 2C digest.

Target schedule:

- daily;
- around 09:00 Europe/Paris.

Apps Script time-driven triggers are not guaranteed to fire at an exact minute, so the product requirement is a morning run in the 09:00 hour rather than exact-to-the-minute delivery.

The setup function must be idempotent and must not create duplicate Phase 2C triggers.

The existing 12-hour discovery trigger remains unchanged.

Deploying code must not blindly recreate either trigger.

## Architecture

Introduce an isolated action subsystem.

Target browser/test structure:

```text
src/actions/
  actionConfig.mjs
  actionEngine.mjs
  followUpActions.mjs
```

### `actionConfig.mjs`

Owns:

- action types;
- action priority ordering;
- terminal/application/pre-application status sets;
- deterministic thresholds;
- canonical timezone name.

### `actionEngine.mjs`

Owns:

- current action classification;
- Paris calendar urgency calculation;
- action reason;
- deterministic sorting.

It must not perform network calls or mutate jobs.

### `followUpActions.mjs`

Owns pure calculations for:

- +3 day reschedule;
- +7 day reschedule;
- +14 day reschedule;
- no-further-follow-up payload;
- Follow-up Count increment.

## Apps Script architecture

Expected focused Apps Script modules:

```text
apps-script/ActionCenter.gs
apps-script/ActionDigest.gs
```

`ActionCenter.gs` mirrors the deterministic action contract required by the backend.

`ActionDigest.gs` owns:

- Sheet read;
- backend action evaluation;
- action snapshot refresh;
- digest formatting;
- MailApp send;
- idempotency;
- trigger setup.

If browser modules and Apps Script cannot literally share the same source file, parity tests must protect behavior for representative fixtures.

## Data flow

```text
Discovery / existing tracked opportunities
            ↓
     Google Sheet A:AS
            ↓
      normalized jobs
       ↙          ↘
Browser action     Apps Script action
engine              engine
   ↓                  ↓
Action Center      daily digest
   ↓                  ↓
user action          Gmail
   ↓
Google Sheets write
   ↓
current action recomputation
```

Phase 2B remains upstream of Phase 2C:

```text
Discovery → eligibility → scoring → persisted opportunity
                                      ↓
                                 Phase 2C action engine
```

## Error handling

### Malformed data

A malformed optional date or action snapshot must not crash the page or digest.

Use safe defaults and preserve the original opportunity.

### One-row action failure

An evaluation failure for one malformed row must not stop evaluation of all other jobs.

Log enough context to identify the stable Job ID without exposing secrets.

### Google Sheets write failure

No optimistic follow-up state is committed in the UI before the write succeeds.

### Mail failure

A MailApp failure:

- is logged;
- does not mutate application tracking fields;
- does not mark the digest date as sent;
- does not affect the 12-hour discovery process.

## Compatibility

Existing opportunities must continue to work even if they have:

- no Phase 2C metadata;
- no `followUpDate`;
- no `appliedDate`;
- no deadline;
- old Phase 2B metadata;
- missing offer description;
- missing compensation.

Phase 2C must not delete or rewrite historical opportunities automatically.

## Mobile behavior

Action Center must remain usable on the existing mobile layout.

At minimum:

- priority and action reason remain visible;
- primary action buttons remain reachable without horizontal scrolling;
- long role/company names wrap safely;
- opening official offer remains possible;
- follow-up menu is tap-friendly.

No separate mobile application is introduced.

## Testing requirements

Automated coverage must include at least:

- terminal statuses produce no active action;
- New / To apply status classification;
- application-tracking status classification;
- overdue follow-up → Critical;
- follow-up today → Critical;
- follow-up tomorrow → High;
- future follow-up → Normal;
- applied with no follow-up → Schedule Follow-up;
- applied for at least 3 Paris calendar days with no follow-up → High Schedule Follow-up;
- already-applied legacy row without fit score still receives follow-up actions;
- pre-application row without fit score receives no Phase 2C promotion;
- pre-application row below score 75 receives no Phase 2C promotion;
- deadline today → Critical Deadline Risk;
- deadline tomorrow → Critical Deadline Risk;
- deadline in 2–3 days with score >=85 → Critical;
- deadline in 2–3 days with score 75–84 → High;
- deadline in 4–7 days with score >=85 → High;
- deadline in 4–7 days with score 75–84 → Normal;
- score >=90 with distant or missing deadline → High Apply Now;
- score 85–89 with distant or missing deadline → High Apply Now;
- score 75–84 with distant or missing deadline → Normal Apply Now;
- passed deadline produces no active Apply Now action;
- Europe/Paris date boundary behavior;
- action sorting priority order;
- action sorting tie-breakers;
- malformed date safety;
- deterministic repeatability;
- +3 follow-up payload;
- +7 follow-up payload;
- +14 follow-up payload;
- no-further-follow-up payload;
- Follow-up Count increments exactly once after a successful action;
- old A:AN rows normalize safely after read range extends to A:AS;
- AO:AS normalize safely;
- existing S:W tracking fields remain unchanged unless explicitly updated;
- X:Y:Z remain untouched;
- AA:AN remain untouched;
- browser / Apps Script action parity for representative fixtures;
- KPI excludes Normal Upcoming backlog;
- digest excludes Normal noise;
- digest includes overdue/today/tomorrow/critical/high actions;
- empty digest sends no email;
- empty digest does not prevent a later same-day useful digest;
- digest idempotency prevents duplicate successful normal sends;
- failed email does not set the sent-date key;
- Phase 2B scoring tests remain green;
- Discovery tests remain green;
- dashboard build remains green.

## Manual verification

Before production completion, verify:

- Google OAuth login;
- A:AS live read;
- Action Center navigation;
- Overview Action KPI;
- Critical/High/Normal grouping with real rows;
- official offer links;
- Mark Followed Up +3;
- Mark Followed Up +7;
- Mark Followed Up +14;
- No further follow-up;
- Sheet persistence after browser refresh;
- Last Follow-up and Follow-up Count persistence;
- one Gmail digest to the configured address;
- no email when no digest-worthy actions exist;
- mobile layout;
- Favorites regression;
- status editing regression;
- Pipeline regression;
- M2 Internships ranking regression;
- Fit Intelligence regression;
- GitHub Pages deployment;
- Apps Script clasp deployment.

## Deployment and rollout

Implementation branch:

`feature/phase2c-action-center`

Development follows test-driven development.

Required pre-merge verification:

```text
npm test
npm run build
git diff --check
```

Review the full branch diff before merge.

After merge:

- GitHub Pages deploys the frontend from `main`;
- run one `npx clasp push` from an up-to-date local/Codespaces `main` to synchronize Apps Script;
- configure `JOBDRIVE_DIGEST_EMAIL` if the effective-user fallback is unavailable or undesirable;
- create the Phase 2C daily trigger exactly once through its idempotent setup function;
- do not recreate the existing Discovery trigger.

## Success criteria

Phase 2C is complete when JobDrive can:

1. calculate a deterministic current action or `NONE` for every tracked non-terminal internship without changing its fit score;
2. surface urgent application deadlines and strong Apply Now opportunities only when a qualifying Phase 2B score exists;
3. preserve follow-up visibility for already-applied legacy rows even when their current fit score is missing;
4. surface overdue, today, tomorrow and upcoming follow-ups using Europe/Paris calendar semantics;
5. identify applications that need a follow-up date;
6. order actions deterministically by urgency and relevance;
7. let the user complete and reschedule a follow-up in one flow;
8. persist Last Follow-up and Follow-up Count without corrupting existing Sheet fields;
9. expose a useful Action Center and focused Overview KPI on desktop and mobile;
10. send at most one useful Gmail digest per Paris day and send nothing when there is no useful action;
11. preserve Phase 2A Discovery, Phase 2B scoring, Google OAuth, tracking, descriptions, company identity, Pipeline, Favorites and GitHub Pages behavior.
