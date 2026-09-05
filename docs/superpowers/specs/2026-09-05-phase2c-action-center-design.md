# JobDrive Phase 2C — Application Action Center & Smart Follow-ups

Date: 2026-09-05
Status: Approved; clarified during implementation-plan self-review

## Goal

Turn JobDrive from a strong internship discovery and ranking system into a daily execution system.

Phase 2A discovers relevant industrial M2 internships. Phase 2B scores and ranks them. Phase 2C answers the operational question:

> What should I do now so I do not miss a strong internship or forget an application follow-up?

The feature remains deterministic, explainable, free to operate, and compatible with the existing Google Sheets + Apps Script + GitHub Pages architecture.

## Core principle

Phase 2C separates two concerns:

- `M2 Internships` remains the place to explore and compare opportunities.
- `Action Center` becomes the place to execute the next best actions.

Phase 2C never changes the Phase 2B `fitScore` because a deadline or follow-up is urgent.

Technical fit answers "how good is this internship?".

Action priority answers "how urgently should I act on it?".

## Current system to preserve

The production system already includes:

- Google OAuth in the frontend;
- Google Sheets as the source of truth;
- M2 industrial internship filtering;
- automated Discovery on the existing 12-hour schedule;
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

Phase 2C preserves all of these behaviors.

## Scope

Phase 2C includes:

- a new `Action Center` navigation page;
- a deterministic action engine;
- Apply Now actions;
- Deadline Risk actions;
- Overdue Follow-up actions;
- Follow-up Today actions;
- Follow-up Tomorrow / Upcoming actions;
- a Schedule Follow-up action for applications that have never had a follow-up and have no next follow-up;
- one-click completed-follow-up rescheduling;
- Last Follow-up tracking;
- Follow-up Count tracking;
- action-priority snapshots in Google Sheets;
- an Overview KPI for current Critical + High actions;
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
- use browser or PWA push notifications;
- recreate or replace the existing 12-hour Discovery trigger;
- modify Phase 2B scoring weights or threshold;
- optimize primarily for compensation;
- include academic/research-lab internships;
- include defense-oriented opportunities;
- create one reminder email per opportunity;
- require ChatGPT reminders as part of this phase.

## Action engine contract

The action engine receives a normalized JobDrive opportunity and the current time.

It returns:

- `active`;
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

The same job, current time and timezone must produce the same result.

## Calendar policy

All date-sensitive action classification uses `Europe/Paris` calendar dates.

The browser and Apps Script implementations must compare calendar-day keys rather than relying on the machine's local midnight.

## Status policy

Terminal statuses never create active actions:

- `Accepté`
- `Refusé`
- `Expiré`

Application-tracking statuses:

- `Candidature envoyée`
- `Entretien`
- `Offre`

Pre-application statuses:

- `Nouveau`
- `À candidater`

Phase 2C never silently changes a status.

## Follow-up rules

For application-tracking statuses with a populated `followUpDate`:

- before today → `FOLLOW_UP_OVERDUE`, `Critical`;
- today → `FOLLOW_UP_TODAY`, `Critical`;
- tomorrow → `FOLLOW_UP_TOMORROW`, `High`;
- after tomorrow → `UPCOMING_FOLLOW_UP`, `Normal`.

Follow-up urgency takes precedence over pre-application logic.

For an application-tracking status with no `followUpDate` and no `lastFollowUp`:

- return `SCHEDULE_FOLLOW_UP`;
- default priority is `Normal`;
- if `appliedDate` exists and is at least 3 Paris calendar days old, priority becomes `High`.

For an application-tracking status with no `followUpDate` but a populated `lastFollowUp`:

- return `NONE`;
- reason indicates that no further follow-up is currently requested.

This rule makes `No further follow-up` durable without adding another Sheet column.

Missing or malformed dates must not crash the engine.

## Pre-application rules

For `Nouveau` and `À candidater`, Phase 2C requires a trustworthy Phase 2B `fitScore >= 75` before creating an active application action.

Old pre-application rows without such a score remain visible elsewhere in JobDrive but are not promoted by Action Center.

### Passed deadline

If a valid deadline is before today:

- no Apply Now action;
- return `NONE`;
- do not automatically change status to `Expiré`.

### Deadline today or tomorrow

For stored internships with `fitScore >= 75`:

- `DEADLINE_RISK`;
- `Critical`.

### Deadline within 2–3 days

- score >=85 → `DEADLINE_RISK`, `Critical`;
- score 75–84 → `DEADLINE_RISK`, `High`.

### Deadline within 4–7 days

- score >=85 → `DEADLINE_RISK`, `High`;
- score 75–84 → `DEADLINE_RISK`, `Normal`.

### Deadline later than 7 days or missing

- score >=90 → `APPLY_NOW`, `High`;
- score 85–89 → `APPLY_NOW`, `High`;
- score 75–84 → `APPLY_NOW`, `Normal`.

Deadline urgency never changes the underlying fit score.

## Action ordering

Primary order:

1. `Critical`;
2. `High`;
3. `Normal`.

Within the same priority:

1. overdue follow-up;
2. follow-up today;
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

Visible groups when non-empty:

- `Overdue Follow-up`
- `Follow-up Today`
- `Deadline Risk`
- `Apply Now`
- `Upcoming`

`Upcoming` may contain tomorrow/future follow-ups and first-time Schedule Follow-up actions.

Each action card shows when available:

- company;
- role;
- Phase 2B fit score and grade;
- domain;
- status;
- action priority and reason;
- deadline;
- follow-up date;
- applied date;
- follow-up count;
- official offer link.

Each card supports:

- Open Details;
- Open Official Offer;
- existing Favorite behavior;
- existing status editing;
- first-time Schedule Follow-up where applicable;
- Mark Followed Up where applicable.

The original job posting remains the source of truth.

## Overview KPI

Add an `ACTIONS TODAY` KPI.

It displays:

- current Critical + High active actions;
- current Critical count.

Normal backlog is intentionally excluded from this KPI.

Selecting the KPI opens Action Center.

## First-time Schedule Follow-up flow

For `SCHEDULE_FOLLOW_UP`, offer:

- `+3 days`
- `+7 days`
- `+14 days`

A first-time schedule writes only:

- existing `followUpDate`;
- existing `lastUpdated`.

It does not set `lastFollowUp` and does not increment `followUpCount`, because no follow-up has yet been completed.

The Sheet write must succeed before the UI changes state.

## Completed Follow-up flow

For an active application with an existing follow-up context, `Mark Followed Up` offers:

- `+3 days`
- `+7 days`
- `+14 days`
- `No further follow-up`

For +3/+7/+14:

- `lastFollowUp` = current ISO timestamp;
- `followUpCount` = previous count + 1;
- existing `followUpDate` = selected future date;
- existing `lastUpdated` = current ISO timestamp.

For `No further follow-up`:

- `lastFollowUp` = current ISO timestamp;
- `followUpCount` = previous count + 1;
- existing `followUpDate` = empty;
- existing `lastUpdated` = current ISO timestamp.

Because `lastFollowUp` is populated and `followUpDate` is empty, the action engine returns `NONE` until the user explicitly schedules another follow-up.

If a Sheet write fails:

- retain previous visible state;
- show an actionable error;
- do not increment count;
- do not move the item;
- do not clear/change the date.

All writes locate rows by stable Job ID, not visual index.

## Google Sheets data model

Current Phase 2B scoring metadata occupies AI:AN.

Phase 2C appends:

- AO — `lastFollowUp`
- AP — `followUpCount`
- AQ — `actionPriority`
- AR — `actionReason`
- AS — `actionUpdatedAt`

Existing columns remain unchanged:

- S favorite;
- T applied date;
- U follow-up date;
- V notes;
- W last updated;
- X:Y:Z existing business fields;
- AA:AH description enrichment;
- AI:AN Phase 2B scoring.

## Action snapshot semantics

`AQ:AS` are diagnostic snapshots, not the source of truth for time-sensitive classification.

Therefore:

- frontend computes action state from live job data and today's Paris date;
- Apps Script digest computes action state from live job data and today's Paris date;
- daily backend job refreshes `AQ:AS`;
- successful tracking writes refresh the affected snapshot when possible;
- stale snapshot values never hide live urgency.

## Read/write range

Extend frontend normalized read range from `A:AN` to `A:AS`.

Old rows remain valid.

Defaults:

- empty `lastFollowUp` → empty string;
- empty/malformed `followUpCount` → 0;
- empty action snapshots → empty strings.

## Daily Gmail digest

Send at most one operational digest per Paris calendar day.

Digest-worthy actions:

- overdue follow-up;
- follow-up today;
- follow-up tomorrow;
- Critical Deadline Risk;
- High Deadline Risk;
- High Apply Now.

Normal future items are omitted to reduce noise.

If no digest-worthy actions exist, send no email.

Suggested subject:

`JobDrive Action Digest — 05 Sep 2026`

Sections:

- `OVERDUE FOLLOW-UP`
- `FOLLOW-UP TODAY`
- `DEADLINE RISK`
- `APPLY NOW`
- `TOMORROW`

Each item includes only real available values: company, role, reason, fit score, relevant date, status, official URL.

## Digest recipient configuration

Do not hard-code a personal email address.

Resolution order:

1. Script Property `JOBDRIVE_DIGEST_EMAIL`;
2. script effective-user email;
3. otherwise skip sending and log a clear configuration error.

Use Apps Script `MailApp`; no paid mail service.

## Digest idempotency

Use Script Property `JOBDRIVE_LAST_DIGEST_DATE` in Europe/Paris.

A normal scheduled run sends at most once for a date.

A preview/build function may generate digest content without sending or changing the sent-date key.

A failed send must not mark the date as sent.

## Reminder schedule

Create one dedicated time-driven trigger:

- daily;
- 09:00 hour;
- `Europe/Paris`.

Apps Script may fire within the hour rather than at an exact minute.

The setup function is idempotent and never creates duplicate Phase 2C triggers.

Do not automatically recreate either the Action Digest trigger or existing Discovery trigger during deployment.

## Architecture

Browser/test structure:

```text
src/actions/
  actionConfig.mjs
  actionEngine.mjs
  followUpActions.mjs
  ActionCenterView.jsx
  action-center.css
```

Apps Script structure:

```text
apps-script/ActionCenter.gs
apps-script/ActionDigest.gs
```

`actionConfig.mjs` owns constants and ordering.

`actionEngine.mjs` owns pure current-action classification, Paris-date urgency, reason and sorting.

`followUpActions.mjs` owns pure first-time scheduling and completed-follow-up payload generation.

`ActionCenter.gs` mirrors the deterministic backend contract and owns Sheet row/header/snapshot helpers.

`ActionDigest.gs` owns digest selection/formatting, current Sheet read, snapshot refresh, MailApp send, idempotency and trigger setup.

If browser and Apps Script cannot share the same file, parity tests protect representative fixtures.

## Data flow

```text
Discovery / tracked opportunities
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
live action recomputation
```

Phase 2B remains upstream:

```text
Discovery → eligibility → scoring → stored opportunity → Phase 2C action engine
```

## Error handling

Malformed optional dates/snapshots never crash the page or digest.

One malformed row never stops evaluation of all other rows.

Google Sheets follow-up writes are not treated as complete until the API succeeds.

Mail failure:

- logged;
- does not alter application tracking fields;
- does not set the sent-date key;
- does not affect Discovery.

## Compatibility

Existing opportunities keep working with:

- no Phase 2C metadata;
- no follow-up date;
- no applied date;
- no deadline;
- old Phase 2B metadata;
- missing description;
- missing compensation.

Phase 2C does not delete or rewrite historical opportunities automatically.

## Mobile behavior

At minimum:

- priority/reason remain visible;
- primary actions are reachable without horizontal scrolling;
- long names wrap;
- official offer remains accessible;
- follow-up menus are tap-friendly.

No separate mobile application.

## Testing requirements

Automated coverage includes:

- terminal statuses inactive;
- pre-application score below 75 inactive;
- overdue/today/tomorrow/future follow-up classification;
- first-time Schedule Follow-up;
- first-time scheduling does not increment count;
- completed follow-up increments once;
- No further follow-up remains inactive after clearing the date;
- applied >=3 days without prior follow-up → High Schedule Follow-up;
- deadline matrix boundaries;
- distant/missing deadline Apply Now boundaries;
- passed deadline inactive;
- deterministic ordering/tie-breakers;
- malformed date safety;
- +3/+7/+14 completed payloads;
- no-further payload;
- A:AS normalization;
- old A:AN row compatibility;
- S:AN protection;
- browser/Apps Script action parity;
- digest inclusion/exclusion rules;
- empty digest sends nothing;
- duplicate normal send prevented;
- failed mail does not set idempotency key;
- Phase 2B scoring tests remain green;
- Discovery tests remain green;
- build remains green.

## Manual verification

Before production completion verify:

- Google OAuth login;
- A:AS live read;
- Action Center navigation;
- Actions Today KPI;
- real Critical/High/Normal grouping;
- official offer links;
- first-time +3/+7/+14 scheduling;
- completed follow-up +3/+7/+14;
- No further follow-up;
- Sheet persistence after refresh;
- Last Follow-up and Follow-up Count;
- one Gmail digest;
- no email when empty;
- mobile layout;
- Favorites/status/Pipeline/M2 ranking/Fit Intelligence regressions;
- GitHub Pages deployment;
- Apps Script clasp deployment.

## Deployment and rollout

Implementation branch:

`feature/phase2c-action-center`

Use test-driven development.

Before merge:

```text
npm test
npm run build
git diff --check
```

Review the full branch diff.

After merge:

- GitHub Pages deploys from `main`;
- run one `npx clasp push` from an up-to-date Codespaces `main`;
- configure `JOBDRIVE_DIGEST_EMAIL` only if needed;
- run the idempotent Phase 2C trigger installer exactly once;
- do not recreate the existing Discovery trigger.

## Success criteria

Phase 2C is complete when JobDrive can:

1. calculate next actions without changing fit scores;
2. surface urgent deadlines and strong Apply Now opportunities;
3. surface overdue/today/tomorrow/upcoming follow-ups;
4. identify applications that have never had a follow-up and need one scheduled;
5. keep No further follow-up inactive until the user explicitly schedules again;
6. order actions deterministically;
7. schedule first follow-ups without falsely incrementing completion count;
8. complete/reschedule follow-ups with safe persistence;
9. expose Action Center and Actions Today KPI on desktop/mobile;
10. send at most one useful Gmail digest per day while preserving Phase 2A, Phase 2B and existing tracking behavior.
