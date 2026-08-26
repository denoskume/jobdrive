# JobDrive Pro Phase 2 — Follow-up Center & Smart Reminders

Date: 2026-08-26
Status: Approved

## Objective

Add a complete follow-up management layer to JobDrive Pro so that submitted
applications can be tracked, followed up, rescheduled, and surfaced through
daily reminders without requiring manual spreadsheet management.

The Google Sheet remains the source of truth.

## Scope

Phase 2 includes:

- Follow-ups page in JobDrive Pro
- Dashboard follow-up KPI
- Overdue / Today / Tomorrow / Upcoming classification
- Mark Followed Up action
- Quick rescheduling: +3, +7, +14 days
- No Further Follow-up action
- Last Follow-up tracking
- Follow-up Count tracking
- Daily reminder logic
- ChatGPT reminder
- Gmail digest
- Mobile support
- Regression coverage for existing JobDrive features

Phase 2 does not include:

- PWA push notifications
- browser push notifications
- separate backend database
- full follow-up event history
- CRM-style communication logging

## Data Model

Existing Google Sheet:
AI Job Tracking - Stages & Remote Jobs

Existing sheet:
Opportunités

Current columns A:W remain unchanged.

Add:

X — Last Follow-up
Y — Follow-up Count

### Last Follow-up

Stores the ISO timestamp of the most recently completed follow-up.

Example:

2026-09-02T09:15:00.000Z

### Follow-up Count

Integer starting at 0.

Each successful Mark Followed Up action increments the value by 1.

## Follow-up Eligibility

A job participates in follow-up monitoring when:

- Follow-up Date is populated
- Status is not terminal

Terminal statuses excluded from reminders:

- Accepté
- Refusé
- Expiré

An empty Follow-up Date means no active follow-up reminder.

## Follow-up Classification

For an active Follow-up Date:

- date < today → Overdue
- date = today → Today
- date = tomorrow → Tomorrow
- date > tomorrow → Upcoming

Dates are interpreted using Europe/Paris for reminder purposes.

## Follow-ups Page

Add `Follow-ups` to the main sidebar.

The page contains four sections:

1. Overdue
2. Today
3. Tomorrow
4. Upcoming

Overdue and Today have the highest visual priority.

Each follow-up item displays:

- company
- job title
- type
- application date
- next follow-up date
- days since application
- follow-up count
- priority
- match score when available
- official offer link
- Open Details action
- Mark Followed Up action

## Mark Followed Up Flow

Selecting Mark Followed Up opens a quick action menu:

- +3 days
- +7 days
- +14 days
- No further follow-up

After the user selects an option, JobDrive updates the row.

For +3 / +7 / +14:

- Last Follow-up = current timestamp
- Follow-up Count = previous value + 1
- Follow-up Date = selected future date
- Last Updated = current timestamp

For No further follow-up:

- Last Follow-up = current timestamp
- Follow-up Count = previous value + 1
- Follow-up Date = empty
- Last Updated = current timestamp

The spreadsheet write must succeed before the UI considers the operation
completed.

If the Sheets API request fails:

- retain the previous UI state
- show an error
- do not increment the visible follow-up count
- do not remove the item from its previous group

## Dashboard

Add a Follow-ups KPI.

It shows at minimum:

- number due today
- number overdue

Example:

FOLLOW-UPS
3 due
2 overdue

Selecting the KPI opens the Follow-ups page.

## Existing Job Details

The job details drawer gains follow-up information:

- Applied Date
- Last Follow-up
- Follow-up Count
- Next Follow-up

Existing Follow-up Date editing remains supported.

## Reminder Schedule

One daily check runs at:

09:00 Europe/Paris

The reminder engine reads the current Google Sheet and builds three groups:

- Tomorrow
- Due Today
- Overdue

Reminder behavior:

Follow-up Date = tomorrow:
J-1 reminder

Follow-up Date = today:
Due Today reminder

Follow-up Date < today:
Repeat every day until resolved or rescheduled

Terminal statuses:
Ignored

Empty Follow-up Date:
Ignored

If there are no relevant follow-ups:
No unnecessary reminder email is sent.

## ChatGPT Reminder

A single daily JobDrive follow-up digest is preferred over one automation per
application.

Example:

JobDrive Follow-up — 27 Aug

DUE TODAY
- Mistral AI — Applied Scientist
  Applied: 20 Aug
  Follow-up #1

TOMORROW
- Example Company — ML Engineer Intern

OVERDUE
- Another Company — Data Scientist
  2 days overdue

## Gmail Reminder

Send one daily digest containing the same relevant follow-ups.

Each entry should include when available:

- company
- role
- application date
- follow-up date
- follow-up count
- status
- official job link
- useful notes

One digest is preferred to one email per opportunity.

## Architecture

Data flow:

Job Watches
    ↓
Private Google Sheet
    ↕
Google Sheets API
    ↕
JobDrive Pro
    ↓
Follow-up classification

Independent daily reminder:
Google Sheet
    ↓
09:00 Europe/Paris check
    ├── ChatGPT notification
    └── Gmail digest

JobDrive remains a static GitHub Pages application.

No OAuth client secret, service-account key, or permanent access token is
stored in the frontend.

## Files Expected to Change

Likely implementation areas:

- src/AppPro.jsx
- src/pro.css
- src/services/sheetsApi.js
- src/utils/jobDrive.mjs
- tests/jobDrive.test.mjs

Additional focused components/modules may be introduced where this improves
maintainability.

## Sheets API Changes

Extend normalized sheet range from A:W to A:Y.

Add writable column mappings:

- lastFollowUp → X
- followUpCount → Y

All writes continue to locate rows by stable Job ID rather than current UI row
position.

## Testing Requirements

Automated tests must cover:

- Overdue classification
- Today classification
- Tomorrow classification
- Upcoming classification
- terminal status exclusion
- empty Follow-up Date exclusion
- +3 day scheduling
- +7 day scheduling
- +14 day scheduling
- No further follow-up
- Follow-up Count increment
- existing analytics remain valid

Manual verification must cover:

- Google OAuth login
- live A:Y read
- successful Mark Followed Up write
- persistence after browser refresh
- dashboard KPI
- Follow-ups page
- mobile layout
- Favorites regression
- Applied status regression
- Pipeline regression
- production GitHub Pages build

## Deployment Safety

Implementation must be tested before merging to main.

Required verification:

npm test
npm run build
git diff --check

A real test application may temporarily receive a follow-up date to validate
the complete production workflow.

## Success Criteria

Phase 2 is complete when:

1. JobDrive identifies follow-ups correctly.
2. A user can complete and reschedule a follow-up in one flow.
3. Google Sheets persists Last Follow-up and Follow-up Count.
4. Page refresh preserves the state.
5. Terminal applications generate no reminders.
6. Overdue follow-ups remain visible until action is taken.
7. Daily reminder output can be generated from current Sheet data.
8. ChatGPT and Gmail reminder channels are operational.
9. Existing JobDrive Pro Phase 1 functionality still works.
