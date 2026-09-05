# JobDrive Phase 2C — Application Action Center & Smart Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic daily Action Center that turns Phase 2B-ranked internships into clear application and follow-up actions, persists follow-up/action metadata safely, and sends at most one useful Gmail digest per day.

**Architecture:** Keep Phase 2B scoring upstream and immutable. Add a pure browser action subsystem under `src/actions/`, mirror its decision contract in Apps Script, extend Sheet reads/writes from `A:AN` to `A:AS`, and render a dedicated Action Center inside the existing JobDrive dashboard shell. Backend snapshots are diagnostic only; all date-sensitive UI and email decisions are recomputed from live row data using Europe/Paris calendar semantics.

**Tech Stack:** React 19, Vite 7, native Node test runner, Google Sheets API, Google Apps Script, MailApp, Script Properties, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-05-phase2c-action-center-design.md`

## Global Constraints

- Phase 2B `fitScore`, weights `45/20/15/10/5/5`, grade, and acceptance threshold `>= 75` are immutable in Phase 2C.
- Calendar-sensitive logic uses `Europe/Paris`.
- Terminal statuses are exactly `Accepté`, `Refusé`, `Expiré`.
- Application-tracking statuses are exactly `Candidature envoyée`, `Entretien`, `Offre`.
- Pre-application statuses are exactly `Nouveau`, `À candidater`.
- Old pre-application rows without `fitScore >= 75` never become Apply Now or Deadline Risk actions.
- Existing columns `S:W`, `X:Y:Z`, and `AA:AN` retain their meanings.
- Phase 2C fields are `AO lastFollowUp`, `AP followUpCount`, `AQ actionPriority`, `AR actionReason`, `AS actionUpdatedAt`.
- Scheduling a first follow-up does not count as completing a follow-up: it changes `U followUpDate` and `W lastUpdated` only. `AO lastFollowUp` and `AP followUpCount` change only after `Mark Followed Up`.
- `AQ:AS` are snapshots only; live date-sensitive action computation is authoritative.
- No paid API, new backend server, database, LinkedIn/Indeed scraping, auto-application, or generated recruiter message.
- The existing 12-hour Discovery trigger stays unchanged.
- The Phase 2C trigger targets the 09:00 hour in `Europe/Paris` and is idempotent.
- A normal digest sends at most once per Paris calendar date and sends nothing when no digest-worthy action exists.
- Final verification is `npm test`, `npm run build`, `git diff --check`.

## File Map

Create:

```text
src/actions/actionConfig.mjs
src/actions/actionEngine.mjs
src/actions/followUpActions.mjs
src/actions/ActionCenterView.jsx
src/actions/action-center.css
apps-script/ActionCenter.gs
apps-script/ActionDigest.gs
tests/phase2c-action-engine.test.mjs
tests/phase2c-follow-up.test.mjs
tests/phase2c-sheet-fields.test.mjs
tests/phase2c-action-ui.test.mjs
tests/apps-script-action-parity.test.mjs
tests/apps-script-action-digest.test.mjs
```

Modify:

```text
src/utils/jobDrive.mjs
src/services/sheetsApi.js
src/AppPro.jsx
src/JobDriveDashboard.jsx
apps-script/Code.gs
```

---

### Task 1: Pure Browser Action Engine

**Files:**
- Create: `src/actions/actionConfig.mjs`
- Create: `src/actions/actionEngine.mjs`
- Test: `tests/phase2c-action-engine.test.mjs`

**Interfaces:**
- Produces: `ACTION_TIME_ZONE`, action/status constants and deterministic order maps.
- Produces: `parisDateKey(value)`.
- Produces: `calendarDayDelta(fromValue, toValue)`.
- Produces: `evaluateAction(job, { now } = {})`.
- Produces: `buildActionItems(jobs, { now } = {})`.
- Produces: `sortActionItems(items)`, `groupActionItems(items)`, `actionKpi(items)`.

- [ ] **Step 1: Write the failing engine tests**

Create `tests/phase2c-action-engine.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  actionKpi,
  buildActionItems,
  evaluateAction,
  groupActionItems,
  sortActionItems,
} from "../src/actions/actionEngine.mjs";

const NOW = new Date("2026-09-05T08:00:00.000Z");

function job(overrides = {}) {
  return {
    id: "J-1",
    type: "Stage M2",
    company: "Industrial AI",
    role: "Machine Learning Intern",
    status: "Nouveau",
    fitScore: 90,
    postedDate: "2026-09-04",
    detectedDate: "2026-09-04T10:00:00.000Z",
    deadline: "",
    appliedDate: "",
    followUpDate: "",
    ...overrides,
  };
}

test("terminal statuses never create actions", () => {
  for (const status of ["Accepté", "Refusé", "Expiré"]) {
    const result = evaluateAction(job({ status }), { now: NOW });
    assert.equal(result.active, false);
    assert.equal(result.actionType, "NONE");
    assert.equal(result.actionPriority, "None");
  }
});

test("pre-application rows below the Phase 2B threshold stay inactive", () => {
  for (const fitScore of [0, 74]) {
    const result = evaluateAction(job({ fitScore, deadline: "2026-09-06" }), { now: NOW });
    assert.equal(result.actionType, "NONE");
  }
});

test("application follow-up states have precedence", () => {
  const cases = [
    ["2026-09-04", "FOLLOW_UP_OVERDUE", "Critical"],
    ["2026-09-05", "FOLLOW_UP_TODAY", "Critical"],
    ["2026-09-06", "FOLLOW_UP_TOMORROW", "High"],
    ["2026-09-10", "UPCOMING_FOLLOW_UP", "Normal"],
  ];

  for (const [followUpDate, actionType, actionPriority] of cases) {
    const result = evaluateAction(job({ status: "Candidature envoyée", followUpDate }), { now: NOW });
    assert.equal(result.actionType, actionType);
    assert.equal(result.actionPriority, actionPriority);
  }
});

test("application without a next follow-up becomes Schedule Follow-up", () => {
  const fresh = evaluateAction(job({ status: "Candidature envoyée", appliedDate: "2026-09-04" }), { now: NOW });
  const old = evaluateAction(job({ status: "Candidature envoyée", appliedDate: "2026-09-01" }), { now: NOW });
  assert.equal(fresh.actionType, "SCHEDULE_FOLLOW_UP");
  assert.equal(fresh.actionPriority, "Normal");
  assert.equal(old.actionPriority, "High");
});

test("deadline matrix matches the approved thresholds", () => {
  const cases = [
    [90, "2026-09-05", "Critical"],
    [75, "2026-09-06", "Critical"],
    [85, "2026-09-08", "Critical"],
    [84, "2026-09-08", "High"],
    [85, "2026-09-12", "High"],
    [84, "2026-09-12", "Normal"],
  ];

  for (const [fitScore, deadline, actionPriority] of cases) {
    const result = evaluateAction(job({ fitScore, deadline }), { now: NOW });
    assert.equal(result.actionType, "DEADLINE_RISK");
    assert.equal(result.actionPriority, actionPriority);
  }
});

test("distant or missing deadlines create Apply Now by score", () => {
  for (const [fitScore, actionPriority] of [[90, "High"], [85, "High"], [75, "Normal"]]) {
    const result = evaluateAction(job({ fitScore, deadline: "2026-10-01" }), { now: NOW });
    assert.equal(result.actionType, "APPLY_NOW");
    assert.equal(result.actionPriority, actionPriority);
  }
});

test("passed deadline produces no active pre-application action", () => {
  assert.equal(evaluateAction(job({ deadline: "2026-09-04" }), { now: NOW }).actionType, "NONE");
});

test("action ordering is deterministic", () => {
  const items = buildActionItems([
    job({ id: "apply", fitScore: 95 }),
    job({ id: "deadline", fitScore: 85, deadline: "2026-09-08" }),
    job({ id: "today", status: "Candidature envoyée", followUpDate: "2026-09-05" }),
    job({ id: "overdue", status: "Candidature envoyée", followUpDate: "2026-09-04" }),
  ], { now: NOW });

  assert.deepEqual(sortActionItems(items).map((item) => item.job.id), ["overdue", "today", "deadline", "apply"]);
});

test("Actions Today counts only Critical plus High", () => {
  const items = buildActionItems([
    job({ id: "critical", deadline: "2026-09-05" }),
    job({ id: "high", fitScore: 90 }),
    job({ id: "normal", fitScore: 75 }),
  ], { now: NOW });

  assert.equal(groupActionItems(items).deadlineRisk.length, 1);
  assert.deepEqual(actionKpi(items), { todayCount: 2, criticalCount: 1, highCount: 1 });
});

test("malformed dates are safe and identical inputs are deterministic", () => {
  const input = job({ deadline: "not-a-date" });
  assert.deepEqual(evaluateAction(input, { now: NOW }), evaluateAction(input, { now: NOW }));
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --test tests/phase2c-action-engine.test.mjs
```

Expected: FAIL because the action modules do not exist.

- [ ] **Step 3: Add `actionConfig.mjs`**

```js
export const ACTION_TIME_ZONE = "Europe/Paris";

export const ACTION_TYPES = Object.freeze({
  APPLY_NOW: "APPLY_NOW",
  DEADLINE_RISK: "DEADLINE_RISK",
  FOLLOW_UP_OVERDUE: "FOLLOW_UP_OVERDUE",
  FOLLOW_UP_TODAY: "FOLLOW_UP_TODAY",
  FOLLOW_UP_TOMORROW: "FOLLOW_UP_TOMORROW",
  UPCOMING_FOLLOW_UP: "UPCOMING_FOLLOW_UP",
  SCHEDULE_FOLLOW_UP: "SCHEDULE_FOLLOW_UP",
  NONE: "NONE",
});

export const TERMINAL_STATUSES = new Set(["Accepté", "Refusé", "Expiré"]);
export const APPLICATION_TRACKING_STATUSES = new Set(["Candidature envoyée", "Entretien", "Offre"]);
export const PRE_APPLICATION_STATUSES = new Set(["Nouveau", "À candidater"]);

export const ACTION_PRIORITY_ORDER = Object.freeze({ Critical: 0, High: 1, Normal: 2, None: 3 });
export const ACTION_TYPE_ORDER = Object.freeze({
  FOLLOW_UP_OVERDUE: 0,
  FOLLOW_UP_TODAY: 1,
  DEADLINE_RISK: 2,
  FOLLOW_UP_TOMORROW: 3,
  APPLY_NOW: 4,
  UPCOMING_FOLLOW_UP: 5,
  SCHEDULE_FOLLOW_UP: 6,
  NONE: 7,
});
```

- [ ] **Step 4: Implement `actionEngine.mjs` with exact reason semantics**

Use `Intl.DateTimeFormat` with `timeZone: "Europe/Paris"` to derive a `YYYY-MM-DD` Paris key, then compare date keys through UTC midnight arithmetic so DST cannot shift calendar-day deltas.

Return these exact reason forms so browser/Apps Script parity is testable:

```text
Terminal status
Phase 2B fit score below 75 or unavailable
Application deadline has passed
Application deadline is today
Application deadline is tomorrow
Application deadline in N days
Follow-up overdue by N days
Follow-up due today
Follow-up due tomorrow
Follow-up scheduled in N days
No follow-up scheduled
No follow-up scheduled after N days
Strong Phase 2B fit; application not yet submitted
No active action
```

Decision order:

```text
terminal
application tracking with followUpDate
application tracking without followUpDate
unknown/non-pre-application status
pre-application fitScore < 75
passed deadline
0-1 day deadline
2-3 day deadline
4-7 day deadline
distant/missing deadline Apply Now
```

Use the approved priority matrix. `buildActionItems()` catches a single-row evaluation failure, produces a safe inactive result for that row, and continues evaluating the rest. `sortActionItems()` follows priority, action-type order, nearest action date, fitScore descending, publication date descending, detected date descending, then stable Job ID. `groupActionItems()` maps to `overdue`, `today`, `deadlineRisk`, `applyNow`, `upcoming`. `actionKpi()` counts only Critical and High.

- [ ] **Step 5: Verify GREEN and regressions**

```bash
node --test tests/phase2c-action-engine.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/actions/actionConfig.mjs src/actions/actionEngine.mjs tests/phase2c-action-engine.test.mjs
git commit -m "feat: add deterministic phase 2C action engine"
```

---

### Task 2: Follow-up Calculations and A:AS Sheet Contract

**Files:**
- Create: `src/actions/followUpActions.mjs`
- Modify: `src/utils/jobDrive.mjs`
- Modify: `src/services/sheetsApi.js`
- Test: `tests/phase2c-follow-up.test.mjs`
- Test: `tests/phase2c-sheet-fields.test.mjs`

**Interfaces:**
- Produces: `buildCompletedFollowUpPatch(job, choice, { now })` for `3`, `7`, `14`, `"none"`.
- Produces: `buildScheduleFollowUpPatch(days, { now })` for first scheduling; this never changes follow-up count or last-follow-up timestamp.
- Extends normalized jobs and writable Sheet fields through AS.

- [ ] **Step 1: Write failing follow-up tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompletedFollowUpPatch,
  buildScheduleFollowUpPatch,
} from "../src/actions/followUpActions.mjs";

const NOW = new Date("2026-09-05T08:00:00.000Z");

for (const [choice, expected] of [[3, "2026-09-08"], [7, "2026-09-12"], [14, "2026-09-19"]]) {
  test(`completed follow-up +${choice} increments once`, () => {
    const patch = buildCompletedFollowUpPatch({ followUpCount: 2 }, choice, { now: NOW });
    assert.equal(patch.followUpDate, expected);
    assert.equal(patch.followUpCount, 3);
    assert.equal(patch.lastFollowUp, NOW.toISOString());
    assert.equal(patch.lastUpdated, NOW.toISOString());
  });
}

test("No further follow-up clears date and increments completion count", () => {
  const patch = buildCompletedFollowUpPatch({ followUpCount: 4 }, "none", { now: NOW });
  assert.equal(patch.followUpDate, "");
  assert.equal(patch.followUpCount, 5);
});

test("first scheduling does not pretend a follow-up happened", () => {
  const patch = buildScheduleFollowUpPatch(7, { now: NOW });
  assert.deepEqual(patch, {
    followUpDate: "2026-09-12",
    lastUpdated: NOW.toISOString(),
  });
});
```

Create `tests/phase2c-sheet-fields.test.mjs` and assert row indices `40..44` normalize as AO:AS; old 40-column rows default to `lastFollowUp:""`, `followUpCount:0`, and empty action snapshot strings. Read source text and assert `sheetsApi.js` uses `A:AS` and mappings `AO`, `AP`, `AQ`, `AR`, `AS`.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/phase2c-follow-up.test.mjs tests/phase2c-sheet-fields.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement `followUpActions.mjs`**

Use `parisDateKey()` from Task 1 plus UTC date-key addition:

```js
import { parisDateKey } from "./actionEngine.mjs";

function addDateKeyDays(key, days) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextDate(days, now) {
  return addDateKeyDays(parisDateKey(now), days);
}

export function buildScheduleFollowUpPatch(days, { now = new Date() } = {}) {
  if (![3, 7, 14].includes(days)) throw new Error("Unsupported follow-up schedule");
  return { followUpDate: nextDate(days, now), lastUpdated: now.toISOString() };
}

export function buildCompletedFollowUpPatch(job = {}, choice, { now = new Date() } = {}) {
  if (![3, 7, 14, "none"].includes(choice)) throw new Error("Unsupported follow-up action");
  const current = Number.isFinite(Number(job.followUpCount)) ? Number(job.followUpCount) : 0;
  return {
    lastFollowUp: now.toISOString(),
    followUpCount: current + 1,
    followUpDate: choice === "none" ? "" : nextDate(choice, now),
    lastUpdated: now.toISOString(),
  };
}
```

- [ ] **Step 4: Extend normalization and Sheets API**

In `normalizeJobs()` after `scoringUpdatedAt` add:

```js
lastFollowUp: String(row[40] || "").trim(),
followUpCount: Number.isFinite(Number(row[41])) ? Number(row[41]) : 0,
actionPriority: String(row[42] || "").trim(),
actionReason: String(row[43] || "").trim(),
actionUpdatedAt: String(row[44] || "").trim(),
```

In `sheetsApi.js`, change `A:AN` to `A:AS` and extend `COLUMNS`:

```js
lastFollowUp: "AO",
followUpCount: "AP",
actionPriority: "AQ",
actionReason: "AR",
actionUpdatedAt: "AS",
```

Keep stable Job ID lookup in column A and keep `DESCRIPTION_COLUMNS` unchanged.

- [ ] **Step 5: Verify GREEN**

```bash
node --test tests/phase2c-follow-up.test.mjs tests/phase2c-sheet-fields.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/actions/followUpActions.mjs src/utils/jobDrive.mjs src/services/sheetsApi.js tests/phase2c-follow-up.test.mjs tests/phase2c-sheet-fields.test.mjs
git commit -m "feat: add phase 2C follow-up and sheet fields"
```

---

### Task 3: Action Center UI, KPI, and Atomic Tracking Writes

**Files:**
- Create: `src/actions/ActionCenterView.jsx`
- Create: `src/actions/action-center.css`
- Modify: `src/AppPro.jsx`
- Modify: `src/JobDriveDashboard.jsx`
- Test: `tests/phase2c-action-ui.test.mjs`

**Interfaces:**
- Consumes Task 1 action computation and Task 2 follow-up patches.
- Produces `ActionCenterView({ items, onOpenDetails, onScheduleFollowUp, onMarkFollowUp, savingJobId })`.
- Extends `JobDriveDashboard` with `actionKpi`.

- [ ] **Step 1: Write failing UI wiring tests**

Create a static-source test that asserts:

```js
assert.match(fs.readFileSync("src/JobDriveDashboard.jsx", "utf8"), /onViewChange\("actions"\)/);
assert.match(fs.readFileSync("src/JobDriveDashboard.jsx", "utf8"), /ACTIONS TODAY/);
assert.match(fs.readFileSync("src/AppPro.jsx", "utf8"), /buildActionItems/);
assert.match(fs.readFileSync("src/AppPro.jsx", "utf8"), /view === "actions"/);
assert.match(fs.readFileSync("src/AppPro.jsx", "utf8"), /buildCompletedFollowUpPatch/);
assert.match(fs.readFileSync("src/AppPro.jsx", "utf8"), /buildScheduleFollowUpPatch/);
```

Assert `ActionCenterView.jsx` contains the group labels `Overdue Follow-up`, `Follow-up Today`, `Deadline Risk`, `Apply Now`, `Upcoming`, plus both `Schedule Follow-up` and `Mark Followed Up` controls.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/phase2c-action-ui.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement presentational Action Center**

`ActionCenterView.jsx` calls `groupActionItems(items)` and renders only non-empty groups. Every card shows available company, role, fit score, grade, domain, status, action priority/reason, relevant dates, follow-up count, official URL, and `Open Details`.

For `SCHEDULE_FOLLOW_UP`, render `Schedule Follow-up` with `+3`, `+7`, `+14` only and call `onScheduleFollowUp(job, days)`.

For application-tracking rows that already have a follow-up context, render `Mark Followed Up` with `+3`, `+7`, `+14`, `No further follow-up` and call `onMarkFollowUp(job, choice)`.

Never mutate a job inside the presentational component.

- [ ] **Step 4: Add mobile-safe CSS**

Create `action-center.css` with focused `.jd-action-*` classes. Under `@media (max-width: 760px)`, force action cards to one column, allow action controls to wrap, and give buttons/links `min-height: 44px`. No horizontal scrolling is required to reach a primary action.

- [ ] **Step 5: Wire live actions into `AppPro.jsx`**

Import the new component and helpers. Add:

```js
const [savingFollowUpJobId, setSavingFollowUpJobId] = useState("");
const actionItems = useMemo(() => buildActionItems(jobs), [jobs]);
const actionKpi = useMemo(() => calculateActionKpi(actionItems), [actionItems]);
```

Add one helper that enriches any successful tracking patch with a fresh snapshot:

```js
function withActionSnapshot(job, patch, now) {
  const nextJob = { ...job, ...patch };
  const action = evaluateAction(nextJob, { now });
  return {
    ...patch,
    actionPriority: action.actionPriority,
    actionReason: action.actionReason,
    actionUpdatedAt: now.toISOString(),
  };
}
```

`markFollowedUp(job, choice)` builds a completed-follow-up patch, adds a snapshot, calls `updateJobFields`, and only after successful resolution updates React state.

`scheduleFollowUp(job, days)` builds a first-schedule patch, adds a snapshot, calls `updateJobFields`, and only after success updates React state. It must not change `lastFollowUp` or `followUpCount`.

Update existing `saveJob()` to add a fresh action snapshot to status/follow-up edits without modifying Phase 2B fields.

For `view === "actions"`, set `alternateContent` to `ActionCenterView` and pass handlers.

- [ ] **Step 6: Add navigation and KPI in `JobDriveDashboard.jsx`**

Add Sidebar button `Action Center` calling `onViewChange("actions")`.

Extend `KPI` with optional `onClick` while retaining the existing `jd-kpi` class. Add:

```jsx
<KPI
  label="ACTIONS TODAY"
  value={actionKpi.todayCount}
  hint={`${actionKpi.criticalCount} critical`}
  icon="bell"
  tone="orange"
  onClick={() => onViewChange("actions")}
/>
```

Pass `actionKpi` from AppPro. This KPI intentionally excludes Normal backlog.

- [ ] **Step 7: Verify GREEN and build**

```bash
node --test tests/phase2c-action-ui.test.mjs
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add src/actions/ActionCenterView.jsx src/actions/action-center.css src/AppPro.jsx src/JobDriveDashboard.jsx tests/phase2c-action-ui.test.mjs
git commit -m "feat: add phase 2C action center interface"
```

---

### Task 4: Apps Script Action Parity and Snapshot Helpers

**Files:**
- Create: `apps-script/ActionCenter.gs`
- Modify: `apps-script/Code.gs`
- Test: `tests/apps-script-action-parity.test.mjs`
- Extend: `tests/phase2c-sheet-fields.test.mjs`

**Interfaces:**
- Produces: `evaluateJobDriveAction_(job, nowIso)` with the same fields and exact reason strings as Task 1.
- Produces: `actionJobFromRow_(row)`, `ensureActionCenterHeaders_(sheet)`, `refreshActionSnapshotRow_(sheet, rowNumber, job, nowIso)`.

- [ ] **Step 1: Write failing parity tests**

Use the same Node `vm` pattern as `tests/apps-script-scoring-parity.test.mjs`. Compare browser `evaluateAction()` and Apps Script `evaluateJobDriveAction_()` for fixed fixtures covering terminal, score below 75, deadline risk, Apply Now, overdue/today follow-up, and Schedule Follow-up. Assert deep equality for `active`, `actionType`, `actionPriority`, `actionReason`, `actionDate`, `urgencyDays`.

Extend the Sheet test to assert `ActionCenter.gs` owns headers exactly:

```text
lastFollowUp
followUpCount
actionPriority
actionReason
actionUpdatedAt
```

and `Code.gs` exposes row indices `40..44` without moving older fields.

- [ ] **Step 2: Verify RED**

```bash
node --test tests/apps-script-action-parity.test.mjs tests/phase2c-sheet-fields.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement `ActionCenter.gs`**

Use ES5-compatible Apps Script code and `Utilities.formatDate(new Date(value), "Europe/Paris", "yyyy-MM-dd")` for Paris keys.

Required functions:

```text
actionParisDateKey_
actionCalendarDayDelta_
evaluateJobDriveAction_
actionJobFromRow_
ensureActionCenterHeaders_
refreshActionSnapshotRow_
```

`actionJobFromRow_()` maps only the required fields using existing indices, including `lastFollowUp row[40]`, `followUpCount row[41]`, `actionPriority row[42]`, `actionReason row[43]`, `actionUpdatedAt row[44]`.

`ensureActionCenterHeaders_()` writes row 1 columns 41–45 only when needed.

`refreshActionSnapshotRow_()` writes only `AQ:AS`. It never writes `S:W`, `X:Z`, or `AA:AN`.

- [ ] **Step 4: Extend `Code.gs` diagnostic mapping**

After `scoringUpdatedAt`, add:

```js
lastFollowUp: row[40] || "",
followUpCount: Number(row[41] || 0),
actionPriority: row[42] || "",
actionReason: row[43] || "",
actionUpdatedAt: row[44] || ""
```

- [ ] **Step 5: Verify GREEN**

```bash
node --test tests/apps-script-action-parity.test.mjs tests/phase2c-sheet-fields.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add apps-script/ActionCenter.gs apps-script/Code.gs tests/apps-script-action-parity.test.mjs tests/phase2c-sheet-fields.test.mjs
git commit -m "feat: mirror phase 2C action engine in apps script"
```

---

### Task 5: Gmail Digest, Snapshot Refresh, and Idempotent Trigger

**Files:**
- Create: `apps-script/ActionDigest.gs`
- Test: `tests/apps-script-action-digest.test.mjs`

**Interfaces:**
- Consumes Task 4 Apps Script action helpers.
- Produces: `buildJobDriveActionDigest_(jobs, nowIso)` as a formatting/selection function with no mail send.
- Produces: `resolveJobDriveDigestRecipient_()`.
- Produces: `runJobDriveActionDigest()`.
- Produces: `installJobDriveActionDigestTrigger()`.

- [ ] **Step 1: Write failing digest tests**

Use `vm` stubs for `Utilities`, `SpreadsheetApp`, `PropertiesService`, `Session`, `MailApp`, `ScriptApp`, and `console`. Cover:

```text
overdue/today/tomorrow follow-ups included
Critical/High Deadline Risk included
High Apply Now included
Normal Apply Now omitted
Normal future follow-up omitted
empty digest sends no email
JOBDRIVE_DIGEST_EMAIL overrides effective-user fallback
missing recipient sends nothing
same JOBDRIVE_LAST_DIGEST_DATE skips duplicate normal send
failed MailApp send does not set sent-date property
successful send sets sent-date property only after send
existing runJobDriveActionDigest trigger prevents duplicate trigger creation
```

- [ ] **Step 2: Verify RED**

```bash
node --test tests/apps-script-action-digest.test.mjs
```

Expected: FAIL.

- [ ] **Step 3: Implement digest selection and formatting**

Use Script Property keys:

```js
var JOBDRIVE_DIGEST_EMAIL_PROPERTY_ = "JOBDRIVE_DIGEST_EMAIL";
var JOBDRIVE_LAST_DIGEST_DATE_PROPERTY_ = "JOBDRIVE_LAST_DIGEST_DATE";
```

Digest-worthy logic is exactly:

```text
FOLLOW_UP_OVERDUE always
FOLLOW_UP_TODAY always
FOLLOW_UP_TOMORROW always
DEADLINE_RISK only Critical or High
APPLY_NOW only High
all Normal future noise omitted
```

`buildJobDriveActionDigest_(jobs, nowIso)` evaluates supplied normalized jobs and returns `{ dateKey, subject, body, items }` without sending mail or changing the idempotency key.

Sections are emitted only when non-empty and ordered:

```text
OVERDUE FOLLOW-UP
FOLLOW-UP TODAY
DEADLINE RISK
APPLY NOW
TOMORROW
```

- [ ] **Step 4: Implement the scheduled runner**

`runJobDriveActionDigest()`:

1. derives the current Paris date key;
2. skips if `JOBDRIVE_LAST_DIGEST_DATE` already equals today;
3. opens `SPREADSHEET_ID` / `SHEET_NAME` and ensures AO:AS headers;
4. reads rows through AS and evaluates every non-empty row independently;
5. refreshes `AQ:AS` snapshots for evaluated rows;
6. builds digest content from normalized jobs;
7. skips send if items are empty;
8. resolves recipient first from `JOBDRIVE_DIGEST_EMAIL`, then `Session.getEffectiveUser().getEmail()`;
9. skips with a clear configuration result if no recipient exists;
10. calls `MailApp.sendEmail({ to, subject, body })`;
11. only after successful send writes `JOBDRIVE_LAST_DIGEST_DATE`;
12. returns a summary object with `sent`, `count`, `dateKey`, and `skipped` when applicable.

A MailApp exception may be logged but must be rethrown or reported as failure without writing the sent-date property.

- [ ] **Step 5: Implement idempotent trigger setup**

```js
function installJobDriveActionDigestTrigger() {
  var existing = ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction() === "runJobDriveActionDigest";
  });

  if (existing.length) return existing[0];

  return ScriptApp
    .newTrigger("runJobDriveActionDigest")
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .inTimezone("Europe/Paris")
    .create();
}
```

Do not call this installer automatically from Discovery, module load, or deployment.

- [ ] **Step 6: Verify GREEN**

```bash
node --test tests/apps-script-action-digest.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add apps-script/ActionDigest.gs tests/apps-script-action-digest.test.mjs
git commit -m "feat: add phase 2C daily action digest"
```

---

### Task 6: Regression Gate and Production Handoff

**Files:**
- Verify all files changed in Tasks 1–5.
- Modify only if verification exposes a concrete regression.

**Interfaces:**
- Produces a merge-ready Phase 2C branch and exact post-merge deployment steps.

- [ ] **Step 1: Run the complete suite**

```bash
npm test
```

Expected: zero failures, including existing Discovery and Phase 2B tests.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: exit code 0.

- [ ] **Step 3: Run diff validation**

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 4: Review branch diff against `main`**

```bash
git diff --stat main...HEAD
git diff main...HEAD -- src/actions src/AppPro.jsx src/JobDriveDashboard.jsx src/services/sheetsApi.js src/utils/jobDrive.mjs apps-script/ActionCenter.gs apps-script/ActionDigest.gs apps-script/Code.gs tests
```

Confirm from the diff:

```text
Phase 2B weights and score threshold unchanged
Discovery source registry unchanged
runJobDriveDiscovery 12-hour trigger unchanged
S:AN meanings unchanged
AO:AS only used for Phase 2C metadata
first scheduling does not increment followUpCount
completed follow-up increments followUpCount exactly once
no personal email or secret hard-coded
Action Center computes live state rather than trusting AQ:AS
Phase 2C trigger installer is not called automatically
```

- [ ] **Step 5: Push and use the existing CI workflow**

The current CI already runs `npm test`, `npm run build`, and `git diff --check`. Do not create a duplicate workflow. Confirm the PR CI is green.

- [ ] **Step 6: Create/update the PR**

Title:

```text
Phase 2C: application action center and smart follow-ups
```

Body summary:

```text
- deterministic Europe/Paris action engine
- Action Center + Actions Today KPI
- first-time follow-up scheduling without false completion count
- atomic +3/+7/+14/no-further completed-follow-up flow
- AO:AS persistence without repurposing S:AN
- browser/Apps Script parity
- one daily idempotent Gmail digest
- dedicated 09:00 Europe/Paris trigger setup
- Phase 2A Discovery and Phase 2B scoring preserved
```

- [ ] **Step 7: After merge, synchronize Apps Script once from current `main`**

```bash
git checkout main
git pull --ff-only
npx clasp push
```

The output must include both:

```text
apps-script/ActionCenter.gs
apps-script/ActionDigest.gs
```

- [ ] **Step 8: Configure digest recipient only when needed**

If the effective-user fallback is empty or undesirable, set Apps Script Script Property:

```text
JOBDRIVE_DIGEST_EMAIL=<desired recipient>
```

Never commit that address to GitHub.

- [ ] **Step 9: Install the Phase 2C trigger exactly once**

Run Apps Script function:

```text
installJobDriveActionDigestTrigger
```

Verify one `runJobDriveActionDigest` trigger exists and the existing `runJobDriveDiscovery` trigger is still present.

- [ ] **Step 10: Production smoke test**

Verify:

```text
Google OAuth login
A:AS live read
Action Center navigation
Actions Today KPI = live Critical + High count
old rows without AO:AS still load
Schedule Follow-up changes date without incrementing count
Mark Followed Up +3 persists and increments count once
Last Follow-up persists in AO
Phase 2B Fit Intelligence unchanged
one useful digest can be generated/sent
no duplicate normal digest for the same Paris date
mobile Action Center needs no horizontal scrolling
```

Restore any temporary real-row tracking edits after the smoke test.
