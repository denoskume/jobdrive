# JobDrive Phase 2C — Application Action Center & Smart Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic daily Action Center that turns Phase 2B-ranked internships into clear application and follow-up actions, persists follow-up/action metadata safely, and sends at most one useful Gmail digest per day.

**Architecture:** Keep Phase 2B scoring upstream and immutable. Add a pure browser action subsystem under `src/actions/`, mirror its decision contract in Apps Script, extend Sheet reads/writes from `A:AN` to `A:AS`, and render a dedicated Action Center inside the existing JobDrive dashboard shell. Backend snapshots are diagnostic only; all date-sensitive UI and email decisions are recomputed from live row data using Europe/Paris calendar semantics.

**Tech Stack:** React 19, Vite 7, native Node test runner, Google Sheets API, Google Apps Script, MailApp, Script Properties, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-05-phase2c-action-center-design.md`

## Global Constraints

- Phase 2B `fitScore`, weights `45/20/15/10/5/5`, grade, and acceptance threshold `>= 75` must not be changed by Phase 2C.
- Calendar-sensitive action logic uses `Europe/Paris`.
- Terminal statuses are exactly `Accepté`, `Refusé`, `Expiré`.
- Application-tracking statuses are exactly `Candidature envoyée`, `Entretien`, `Offre`.
- Pre-application statuses are exactly `Nouveau`, `À candidater`.
- Old pre-application rows without a trustworthy `fitScore >= 75` must not be promoted into Apply Now or Deadline Risk actions.
- Google Sheet columns `S:W`, `X:Y:Z`, `AA:AN` keep their current meanings. Phase 2C owns only `AO:AS` plus explicit writes to existing `U` and `W` during follow-up actions.
- `AO = lastFollowUp`, `AP = followUpCount`, `AQ = actionPriority`, `AR = actionReason`, `AS = actionUpdatedAt`.
- `AQ:AS` are snapshots only; stale snapshots never override live action computation.
- No paid APIs, no new backend server, no new database, no LinkedIn/Indeed scraping, no auto-application, no generated recruiter messages.
- The existing 12-hour Discovery trigger must remain unchanged.
- The daily Phase 2C trigger targets the 09:00 hour in `Europe/Paris` and must be idempotent.
- A normal digest run sends at most once per Paris calendar date and sends nothing when there are no digest-worthy actions.
- Final verification is `npm test`, `npm run build`, and `git diff --check`.

---

## File Structure

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

Responsibilities:

- `actionConfig.mjs`: immutable action/status constants and deterministic order tables.
- `actionEngine.mjs`: Europe/Paris date-key helpers, single-job action classification, action sorting/grouping, KPI computation.
- `followUpActions.mjs`: pure +3/+7/+14/no-further-follow-up payload generation.
- `ActionCenterView.jsx`: operational grouping/cards and follow-up controls; no Sheets logic.
- `action-center.css`: Action Center desktop/mobile presentation only.
- `ActionCenter.gs`: Apps Script mirror of the browser action contract, Sheet row mapping, AO:AS header/snapshot helpers.
- `ActionDigest.gs`: digest selection/formatting, MailApp send, idempotency, daily trigger setup.

---

### Task 1: Browser Action Engine

**Files:**
- Create: `src/actions/actionConfig.mjs`
- Create: `src/actions/actionEngine.mjs`
- Test: `tests/phase2c-action-engine.test.mjs`

**Interfaces:**
- Produces: `ACTION_TIME_ZONE`, `ACTION_TYPES`, `ACTION_PRIORITY_ORDER`, `ACTION_TYPE_ORDER`, `TERMINAL_STATUSES`, `APPLICATION_TRACKING_STATUSES`, `PRE_APPLICATION_STATUSES`.
- Produces: `parisDateKey(value) -> "YYYY-MM-DD" | ""`.
- Produces: `calendarDayDelta(fromKey, toKey) -> integer | null`.
- Produces: `evaluateAction(job, { now } = {}) -> { active, actionType, actionPriority, actionReason, actionDate, urgencyDays }`.
- Produces: `buildActionItems(jobs, { now } = {}) -> Array<{ job, action }>`.
- Produces: `sortActionItems(items) -> sorted copy`.
- Produces: `groupActionItems(items) -> { overdue, today, deadlineRisk, applyNow, upcoming }`.
- Produces: `actionKpi(items) -> { todayCount, criticalCount, highCount }`, where `todayCount = Critical + High` only.

- [ ] **Step 1: Write the failing action-engine tests**

Create `tests/phase2c-action-engine.test.mjs` with fixed-time fixtures so every boundary is deterministic:

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

test("terminal statuses produce no active action", () => {
  for (const status of ["Accepté", "Refusé", "Expiré"]) {
    const action = evaluateAction(job({ status }), { now: NOW });
    assert.equal(action.active, false);
    assert.equal(action.actionType, "NONE");
    assert.equal(action.actionPriority, "None");
  }
});

test("old pre-application rows without fitScore >= 75 are not promoted", () => {
  for (const fitScore of [0, 74]) {
    const action = evaluateAction(job({ fitScore, deadline: "2026-09-06" }), { now: NOW });
    assert.equal(action.active, false);
    assert.equal(action.actionType, "NONE");
  }
});

test("follow-up precedence covers overdue today tomorrow and future", () => {
  const cases = [
    ["2026-09-04", "FOLLOW_UP_OVERDUE", "Critical"],
    ["2026-09-05", "FOLLOW_UP_TODAY", "Critical"],
    ["2026-09-06", "FOLLOW_UP_TOMORROW", "High"],
    ["2026-09-10", "UPCOMING_FOLLOW_UP", "Normal"],
  ];

  for (const [followUpDate, actionType, priority] of cases) {
    const action = evaluateAction(job({
      status: "Candidature envoyée",
      followUpDate,
    }), { now: NOW });

    assert.equal(action.actionType, actionType);
    assert.equal(action.actionPriority, priority);
  }
});

test("applied rows without follow-up become schedule actions", () => {
  const fresh = evaluateAction(job({
    status: "Candidature envoyée",
    appliedDate: "2026-09-04",
  }), { now: NOW });

  const old = evaluateAction(job({
    status: "Candidature envoyée",
    appliedDate: "2026-09-01",
  }), { now: NOW });

  assert.equal(fresh.actionType, "SCHEDULE_FOLLOW_UP");
  assert.equal(fresh.actionPriority, "Normal");
  assert.equal(old.actionType, "SCHEDULE_FOLLOW_UP");
  assert.equal(old.actionPriority, "High");
});

test("deadline risk boundaries follow the approved matrix", () => {
  const cases = [
    [90, "2026-09-05", "Critical"],
    [75, "2026-09-06", "Critical"],
    [85, "2026-09-08", "Critical"],
    [84, "2026-09-08", "High"],
    [85, "2026-09-12", "High"],
    [84, "2026-09-12", "Normal"],
  ];

  for (const [fitScore, deadline, priority] of cases) {
    const action = evaluateAction(job({ fitScore, deadline }), { now: NOW });
    assert.equal(action.actionType, "DEADLINE_RISK");
    assert.equal(action.actionPriority, priority);
  }
});

test("distant or missing deadlines become Apply Now according to fit", () => {
  for (const [fitScore, priority] of [[90, "High"], [85, "High"], [75, "Normal"]]) {
    const action = evaluateAction(job({ fitScore, deadline: "2026-10-01" }), { now: NOW });
    assert.equal(action.actionType, "APPLY_NOW");
    assert.equal(action.actionPriority, priority);
  }
});

test("passed deadline produces no active pre-application action", () => {
  const action = evaluateAction(job({ deadline: "2026-09-04" }), { now: NOW });
  assert.equal(action.active, false);
  assert.equal(action.actionType, "NONE");
});

test("sorting is priority then action type then date then score then recency then id", () => {
  const items = buildActionItems([
    job({ id: "apply", fitScore: 95 }),
    job({ id: "deadline", fitScore: 85, deadline: "2026-09-08" }),
    job({ id: "today", status: "Candidature envoyée", followUpDate: "2026-09-05" }),
    job({ id: "overdue", status: "Candidature envoyée", followUpDate: "2026-09-04" }),
  ], { now: NOW });

  assert.deepEqual(
    sortActionItems(items).map((item) => item.job.id),
    ["overdue", "today", "deadline", "apply"]
  );
});

test("grouping and KPI exclude Normal backlog from Actions Today", () => {
  const items = buildActionItems([
    job({ id: "critical", deadline: "2026-09-05" }),
    job({ id: "high", fitScore: 90 }),
    job({ id: "normal", fitScore: 75 }),
  ], { now: NOW });

  const groups = groupActionItems(items);
  const kpi = actionKpi(items);

  assert.equal(groups.deadlineRisk.length, 1);
  assert.equal(groups.applyNow.length, 2);
  assert.deepEqual(kpi, {
    todayCount: 2,
    criticalCount: 1,
    highCount: 1,
  });
});

test("malformed dates are safe and repeat evaluation is deterministic", () => {
  const input = job({ deadline: "not-a-date" });
  const first = evaluateAction(input, { now: NOW });
  const second = evaluateAction(input, { now: NOW });
  assert.deepEqual(first, second);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/phase2c-action-engine.test.mjs
```

Expected: FAIL because `src/actions/actionEngine.mjs` does not exist yet.

- [ ] **Step 3: Add immutable action configuration**

Create `src/actions/actionConfig.mjs`:

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

- [ ] **Step 4: Implement the pure browser action engine**

Create `src/actions/actionEngine.mjs`. Use Europe/Paris date keys rather than local-machine midnight. The implementation must follow this shape:

```js
import {
  ACTION_PRIORITY_ORDER,
  ACTION_TIME_ZONE,
  ACTION_TYPE_ORDER,
  ACTION_TYPES,
  APPLICATION_TRACKING_STATUSES,
  PRE_APPLICATION_STATUSES,
  TERMINAL_STATUSES,
} from "./actionConfig.mjs";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function parisDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACTION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function normalizeDateKey(value) {
  const text = String(value || "").trim();
  if (DATE_KEY.test(text)) return text;
  return parisDateKey(value);
}

export function calendarDayDelta(fromKey, toKey) {
  const from = normalizeDateKey(fromKey);
  const to = normalizeDateKey(toKey);
  if (!from || !to) return null;
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toMs - fromMs) / 86400000);
}

function none(reason = "No active action") {
  return {
    active: false,
    actionType: ACTION_TYPES.NONE,
    actionPriority: "None",
    actionReason: reason,
    actionDate: "",
    urgencyDays: null,
  };
}

function active(type, priority, reason, actionDate = "", urgencyDays = null) {
  return {
    active: true,
    actionType: type,
    actionPriority: priority,
    actionReason: reason,
    actionDate,
    urgencyDays,
  };
}
```

Implement `evaluateAction()` in this exact decision order:

1. terminal status → `NONE`;
2. application-tracking status → follow-up rules, then schedule-follow-up rules;
3. unknown/non-pre-application status → `NONE`;
4. pre-application with `fitScore < 75` → `NONE`;
5. valid passed deadline → `NONE`;
6. valid deadline 0–1 days → Critical Deadline Risk;
7. valid deadline 2–3 days → Critical when score >=85 else High;
8. valid deadline 4–7 days → High when score >=85 else Normal;
9. otherwise score >=85 → High Apply Now;
10. otherwise score 75–84 → Normal Apply Now.

For application statuses with no follow-up, compute `appliedAgeDays = calendarDayDelta(appliedDate, todayKey)`. Use High when `appliedAgeDays >= 3`, otherwise Normal. Missing `appliedDate` stays Normal.

Implement `buildActionItems()` as a safe per-row loop that catches one malformed row and returns a `NONE` action for that row rather than throwing for the entire list. Filter to `action.active === true` before returning.

Implement `sortActionItems()` with the spec order, then nearest `actionDate`, `fitScore` descending, `postedDate` descending, `detectedDate` descending, stable `job.id` lexical order.

Implement `groupActionItems()` mapping:

```js
FOLLOW_UP_OVERDUE -> overdue
FOLLOW_UP_TODAY -> today
DEADLINE_RISK -> deadlineRisk
APPLY_NOW -> applyNow
FOLLOW_UP_TOMORROW | UPCOMING_FOLLOW_UP | SCHEDULE_FOLLOW_UP -> upcoming
```

Implement `actionKpi()` so only `Critical` and `High` active items count toward `todayCount`.

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
node --test tests/phase2c-action-engine.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Run the existing suite to detect regressions**

Run:

```bash
npm test
```

Expected: existing Phase 2A/2B tests plus the new action-engine tests PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/actions/actionConfig.mjs src/actions/actionEngine.mjs tests/phase2c-action-engine.test.mjs
git commit -m "feat: add deterministic phase 2C action engine"
```

---

### Task 2: Follow-up Payloads and A:AS Sheet Contract

**Files:**
- Create: `src/actions/followUpActions.mjs`
- Modify: `src/utils/jobDrive.mjs`
- Modify: `src/services/sheetsApi.js`
- Test: `tests/phase2c-follow-up.test.mjs`
- Test: `tests/phase2c-sheet-fields.test.mjs`

**Interfaces:**
- Consumes: `parisDateKey()` from Task 1.
- Produces: `buildFollowUpPatch(job, choice, { now } = {}) -> patch` where `choice` is `3`, `7`, `14`, or `"none"`.
- Extends normalized jobs with `lastFollowUp`, `followUpCount`, `actionPriority`, `actionReason`, `actionUpdatedAt`.
- Extends `updateJobFields()` writable fields through `AS`.

- [ ] **Step 1: Write failing follow-up and Sheet tests**

Create `tests/phase2c-follow-up.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildFollowUpPatch } from "../src/actions/followUpActions.mjs";

const NOW = new Date("2026-09-05T08:00:00.000Z");

for (const [choice, expected] of [[3, "2026-09-08"], [7, "2026-09-12"], [14, "2026-09-19"]]) {
  test(`follow-up +${choice} builds one atomic tracking patch`, () => {
    const patch = buildFollowUpPatch({ followUpCount: 2 }, choice, { now: NOW });
    assert.equal(patch.followUpDate, expected);
    assert.equal(patch.followUpCount, 3);
    assert.equal(patch.lastFollowUp, NOW.toISOString());
    assert.equal(patch.lastUpdated, NOW.toISOString());
  });
}

test("no further follow-up clears date and increments once", () => {
  const patch = buildFollowUpPatch({ followUpCount: 4 }, "none", { now: NOW });
  assert.equal(patch.followUpDate, "");
  assert.equal(patch.followUpCount, 5);
  assert.equal(patch.lastFollowUp, NOW.toISOString());
});

test("malformed follow-up count starts from zero", () => {
  assert.equal(buildFollowUpPatch({ followUpCount: "bad" }, 3, { now: NOW }).followUpCount, 1);
});
```

Create `tests/phase2c-sheet-fields.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeJobs } from "../src/utils/jobDrive.mjs";

test("A:AS Phase 2C fields normalize safely", () => {
  const header = Array(45).fill("");
  const row = Array(45).fill("");
  row[0] = "JOB-1";
  row[1] = "Stage M2";
  row[40] = "2026-09-05T08:00:00.000Z";
  row[41] = "3";
  row[42] = "Critical";
  row[43] = "Follow-up is overdue";
  row[44] = "2026-09-05T08:01:00.000Z";

  const [job] = normalizeJobs([header, row]);
  assert.equal(job.lastFollowUp, "2026-09-05T08:00:00.000Z");
  assert.equal(job.followUpCount, 3);
  assert.equal(job.actionPriority, "Critical");
  assert.equal(job.actionReason, "Follow-up is overdue");
  assert.equal(job.actionUpdatedAt, "2026-09-05T08:01:00.000Z");
});

test("old A:AN rows get safe Phase 2C defaults", () => {
  const header = Array(40).fill("");
  const row = Array(40).fill("");
  row[0] = "OLD-1";
  row[1] = "Stage M2";
  const [job] = normalizeJobs([header, row]);
  assert.equal(job.lastFollowUp, "");
  assert.equal(job.followUpCount, 0);
  assert.equal(job.actionPriority, "");
  assert.equal(job.actionReason, "");
  assert.equal(job.actionUpdatedAt, "");
});

test("Sheets API reads A:AS and exposes AO:AS writable mappings", () => {
  const code = fs.readFileSync("src/services/sheetsApi.js", "utf8");
  assert.match(code, /'\$\{SHEET_NAME\}'!A:AS/);
  assert.match(code, /lastFollowUp:\s*"AO"/);
  assert.match(code, /followUpCount:\s*"AP"/);
  assert.match(code, /actionPriority:\s*"AQ"/);
  assert.match(code, /actionReason:\s*"AR"/);
  assert.match(code, /actionUpdatedAt:\s*"AS"/);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test tests/phase2c-follow-up.test.mjs tests/phase2c-sheet-fields.test.mjs
```

Expected: FAIL because the new module and mappings do not exist.

- [ ] **Step 3: Implement pure follow-up patch generation**

Create `src/actions/followUpActions.mjs`. Use the Paris date key from Task 1 and UTC arithmetic on the date key itself so DST does not shift the calendar result:

```js
import { parisDateKey } from "./actionEngine.mjs";

function addDateKeyDays(key, days) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildFollowUpPatch(job = {}, choice, { now = new Date() } = {}) {
  const isoNow = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const currentCount = Number.isFinite(Number(job.followUpCount)) ? Number(job.followUpCount) : 0;

  if (![3, 7, 14, "none"].includes(choice)) {
    throw new Error("Unsupported follow-up action");
  }

  const today = parisDateKey(now);

  return {
    lastFollowUp: isoNow,
    followUpCount: currentCount + 1,
    followUpDate: choice === "none" ? "" : addDateKeyDays(today, choice),
    lastUpdated: isoNow,
  };
}
```

- [ ] **Step 4: Extend job normalization through AS**

Modify the `normalizeJobs()` row mapping in `src/utils/jobDrive.mjs` after `scoringUpdatedAt`:

```js
lastFollowUp: String(row[40] || "").trim(),
followUpCount: Number.isFinite(Number(row[41])) ? Number(row[41]) : 0,
actionPriority: String(row[42] || "").trim(),
actionReason: String(row[43] || "").trim(),
actionUpdatedAt: String(row[44] || "").trim(),
```

Do not move or reinterpret indices `18..39`.

- [ ] **Step 5: Extend Sheets read/write mappings**

In `src/services/sheetsApi.js`:

1. change the read range from `A:AN` to `A:AS`;
2. add to `COLUMNS`:

```js
lastFollowUp: "AO",
followUpCount: "AP",
actionPriority: "AQ",
actionReason: "AR",
actionUpdatedAt: "AS",
```

Keep row lookup by stable Job ID in column A and keep `DESCRIPTION_COLUMNS` unchanged.

- [ ] **Step 6: Run focused tests and full suite**

```bash
node --test tests/phase2c-follow-up.test.mjs tests/phase2c-sheet-fields.test.mjs
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/actions/followUpActions.mjs src/utils/jobDrive.mjs src/services/sheetsApi.js tests/phase2c-follow-up.test.mjs tests/phase2c-sheet-fields.test.mjs
git commit -m "feat: add phase 2C follow-up and sheet fields"
```

---

### Task 3: Action Center UI, KPI, and Atomic Follow-up Flow

**Files:**
- Create: `src/actions/ActionCenterView.jsx`
- Create: `src/actions/action-center.css`
- Modify: `src/AppPro.jsx`
- Modify: `src/JobDriveDashboard.jsx`
- Test: `tests/phase2c-action-ui.test.mjs`

**Interfaces:**
- Consumes: `buildActionItems`, `groupActionItems`, `actionKpi`, `evaluateAction` from Task 1.
- Consumes: `buildFollowUpPatch` from Task 2.
- Consumes: existing `updateJobFields()` stable-ID write path.
- Produces: `ActionCenterView({ items, onOpenDetails, onMarkFollowUp, savingJobId })`.
- Extends `JobDriveDashboard` props with `actionKpi` and uses existing `onViewChange`.

- [ ] **Step 1: Write failing static UI/integration tests**

Create `tests/phase2c-action-ui.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("dashboard exposes Action Center navigation and Actions Today KPI", () => {
  const code = fs.readFileSync("src/JobDriveDashboard.jsx", "utf8");
  assert.match(code, /onViewChange\("actions"\)/);
  assert.match(code, /Action Center/);
  assert.match(code, /ACTIONS TODAY/);
  assert.match(code, /actionKpi\.todayCount/);
  assert.match(code, /actionKpi\.criticalCount/);
});

test("AppPro wires live action items and Action Center view", () => {
  const code = fs.readFileSync("src/AppPro.jsx", "utf8");
  assert.match(code, /buildActionItems/);
  assert.match(code, /actionKpi/);
  assert.match(code, /view === "actions"/);
  assert.match(code, /ActionCenterView/);
  assert.match(code, /buildFollowUpPatch/);
  assert.match(code, /updateJobFields/);
});

test("Action Center renders required operational groups", () => {
  const code = fs.readFileSync("src/actions/ActionCenterView.jsx", "utf8");
  for (const label of ["Overdue Follow-up", "Follow-up Today", "Deadline Risk", "Apply Now", "Upcoming"]) {
    assert.match(code, new RegExp(label));
  }
  assert.match(code, /Mark Followed Up/);
  assert.match(code, /\+3 days/);
  assert.match(code, /\+7 days/);
  assert.match(code, /\+14 days/);
  assert.match(code, /No further follow-up/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --test tests/phase2c-action-ui.test.mjs
```

Expected: FAIL because the Action Center component and wiring are absent.

- [ ] **Step 3: Implement `ActionCenterView` as a presentational component**

Create `src/actions/ActionCenterView.jsx` and import `./action-center.css`.

The component must:

- call `groupActionItems(items)` once;
- render only non-empty groups;
- render one card per `{ job, action }`;
- show company, role, fitScore, scoreGrade, domain, status, actionPriority, actionReason, deadline/follow-up/applied dates, followUpCount and official link when present;
- expose `Open Details` through `onOpenDetails(job)`;
- render `Mark Followed Up` only for follow-up action types or application-tracking statuses;
- open a compact local menu with buttons `+3 days`, `+7 days`, `+14 days`, `No further follow-up`;
- call `onMarkFollowUp(job, 3|7|14|"none")` without mutating the job locally;
- disable follow-up buttons while `savingJobId === job.id`.

Use a group definition like:

```js
const GROUPS = [
  ["overdue", "Overdue Follow-up"],
  ["today", "Follow-up Today"],
  ["deadlineRisk", "Deadline Risk"],
  ["applyNow", "Apply Now"],
  ["upcoming", "Upcoming"],
];
```

Do not add a network call to this component.

- [ ] **Step 4: Add Action Center styles with mobile safety**

Create `src/actions/action-center.css` with focused class names such as `.jd-action-center`, `.jd-action-section`, `.jd-action-card`, `.jd-action-priority`, `.jd-action-followup-menu`.

Required responsive rule:

```css
@media (max-width: 760px) {
  .jd-action-card {
    grid-template-columns: 1fr;
  }

  .jd-action-card-actions,
  .jd-action-followup-menu {
    width: 100%;
    flex-wrap: wrap;
  }

  .jd-action-card-actions button,
  .jd-action-card-actions a,
  .jd-action-followup-menu button {
    min-height: 44px;
  }
}
```

Do not introduce horizontal scrolling as a required interaction.

- [ ] **Step 5: Wire live actions into `AppPro.jsx`**

Import:

```js
import ActionCenterView from "./actions/ActionCenterView.jsx";
import { actionKpi as calculateActionKpi, buildActionItems, evaluateAction } from "./actions/actionEngine.mjs";
import { buildFollowUpPatch } from "./actions/followUpActions.mjs";
```

Add state:

```js
const [savingFollowUpJobId, setSavingFollowUpJobId] = useState("");
```

Add memoized live action data from unfiltered `jobs`:

```js
const actionItems = useMemo(() => buildActionItems(jobs), [jobs]);
const actionKpi = useMemo(() => calculateActionKpi(actionItems), [actionItems]);
```

Add an atomic handler. The key requirement is no optimistic UI mutation before the Sheet write succeeds:

```js
async function markFollowedUp(job, choice) {
  setSavingFollowUpJobId(job.id);
  setError("");

  try {
    const now = new Date();
    const trackingPatch = buildFollowUpPatch(job, choice, { now });
    const nextJob = { ...job, ...trackingPatch };
    const nextAction = evaluateAction(nextJob, { now });
    const patch = {
      ...trackingPatch,
      actionPriority: nextAction.actionPriority,
      actionReason: nextAction.actionReason,
      actionUpdatedAt: now.toISOString(),
    };

    await updateJobFields({
      token,
      spreadsheetId: SPREADSHEET_ID,
      jobId: job.id,
      patch,
    });

    const localUpdate = { ...job, ...patch };
    setJobs((current) => current.map((item) => item.id === job.id ? localUpdate : item));
    if (selectedJob?.id === job.id) setSelectedJob(localUpdate);
    setLastUpdated(new Date());
  } catch (err) {
    setError(err.message);
  } finally {
    setSavingFollowUpJobId("");
  }
}
```

Update `saveJob()` so status/follow-up edits also persist a fresh action snapshot in the same batch. After the existing status/applied-date defaults are prepared, compute:

```js
const nextJob = { ...job, ...patch };
const nextAction = evaluateAction(nextJob, { now: new Date(now) });
patch.actionPriority = nextAction.actionPriority;
patch.actionReason = nextAction.actionReason;
patch.actionUpdatedAt = now;
```

Do not alter `fitScore`, `priority`, Phase 2B metadata, or description fields.

Add `view === "actions"` to `alternateContent`:

```jsx
<ActionCenterView
  items={actionItems}
  onOpenDetails={setSelectedJob}
  onMarkFollowUp={markFollowedUp}
  savingJobId={savingFollowUpJobId}
/>
```

- [ ] **Step 6: Add Action Center navigation and KPI to `JobDriveDashboard.jsx`**

Extend the component props with `actionKpi`.

Add a Sidebar button:

```jsx
<button
  className={view === "actions" ? "active" : ""}
  onClick={() => onViewChange("actions")}
>
  <Icon name="bell" />
  Action Center
</button>
```

Make `KPI` accept optional `onClick`. Preserve existing KPI styling while making the action KPI keyboard/click accessible. Add on Overview:

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

Pass `actionKpi={actionKpi}` from `AppPro` to `JobDriveDashboard`.

- [ ] **Step 7: Run focused tests, full suite, and build**

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

### Task 4: Apps Script Action Parity and AO:AS Snapshot Helpers

**Files:**
- Create: `apps-script/ActionCenter.gs`
- Modify: `apps-script/Code.gs`
- Test: `tests/apps-script-action-parity.test.mjs`
- Test: `tests/phase2c-sheet-fields.test.mjs`

**Interfaces:**
- Consumes: the Task 1 browser action contract as the behavior reference.
- Produces: `evaluateJobDriveAction_(job, nowIso) -> same action object shape`.
- Produces: `ensureActionCenterHeaders_(sheet)`.
- Produces: `actionJobFromRow_(row) -> normalized subset`.
- Produces: `refreshActionSnapshotRow_(sheet, rowNumber, job, nowIso)`.
- Extends `doGet()` job JSON with Phase 2C fields for diagnostic parity.

- [ ] **Step 1: Write failing browser ↔ Apps Script parity tests**

Create `tests/apps-script-action-parity.test.mjs`. Follow the same Node `vm` technique already used by `tests/apps-script-scoring-parity.test.mjs`: load `apps-script/ActionCenter.gs` into a sandbox and compare `evaluateJobDriveAction_()` with browser `evaluateAction()` for representative fixtures.

Use at least these fixtures:

```js
[
  { id: "terminal", status: "Accepté", fitScore: 95 },
  { id: "old-row", status: "Nouveau", fitScore: 0, deadline: "2026-09-06" },
  { id: "deadline-critical", status: "Nouveau", fitScore: 90, deadline: "2026-09-08" },
  { id: "apply-high", status: "À candidater", fitScore: 92 },
  { id: "followup-overdue", status: "Candidature envoyée", fitScore: 90, followUpDate: "2026-09-04" },
  { id: "followup-today", status: "Entretien", fitScore: 90, followUpDate: "2026-09-05" },
  { id: "schedule-high", status: "Candidature envoyée", fitScore: 90, appliedDate: "2026-09-01" },
]
```

Use `NOW = "2026-09-05T08:00:00.000Z"` and assert deep equality on:

```js
active
actionType
actionPriority
actionReason
actionDate
urgencyDays
```

Extend `tests/phase2c-sheet-fields.test.mjs` with static assertions that `ActionCenter.gs` defines AO:AS header names and `Code.gs` exposes `lastFollowUp`, `followUpCount`, `actionPriority`, `actionReason`, `actionUpdatedAt` from indices `40..44`.

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
node --test tests/apps-script-action-parity.test.mjs tests/phase2c-sheet-fields.test.mjs
```

Expected: FAIL because `ActionCenter.gs` does not exist and `Code.gs` does not expose Phase 2C fields.

- [ ] **Step 3: Implement the Apps Script action mirror**

Create `apps-script/ActionCenter.gs` as ES5-compatible Apps Script code. Keep constants and decision order semantically identical to Task 1. Use helper names suffixed with `_`.

Required functions:

```js
var JOBDRIVE_ACTION_TIME_ZONE_ = "Europe/Paris";

function actionParisDateKey_(value) { ... }
function actionCalendarDayDelta_(fromValue, toValue) { ... }
function evaluateJobDriveAction_(job, nowIso) { ... }
function actionJobFromRow_(row) { ... }
function ensureActionCenterHeaders_(sheet) { ... }
function refreshActionSnapshotRow_(sheet, rowNumber, job, nowIso) { ... }
```

For Apps Script Paris date keys, use:

```js
Utilities.formatDate(new Date(value), JOBDRIVE_ACTION_TIME_ZONE_, "yyyy-MM-dd")
```

`actionJobFromRow_()` maps only fields needed by Phase 2C:

```js
{
  id: row[0] || "",
  company: row[2] || "",
  role: row[3] || "",
  deadline: row[10] || "",
  status: row[11] || "Nouveau",
  fitScore: Number(row[13] || 0),
  link: row[15] || "",
  detectedDate: row[17] || "",
  appliedDate: row[19] || "",
  followUpDate: row[20] || "",
  postedDate: row[9] || "",
  lastFollowUp: row[40] || "",
  followUpCount: Number(row[41] || 0),
  actionPriority: row[42] || "",
  actionReason: row[43] || "",
  actionUpdatedAt: row[44] || ""
}
```

`ensureActionCenterHeaders_()` must write exactly:

```js
["lastFollowUp", "followUpCount", "actionPriority", "actionReason", "actionUpdatedAt"]
```

to row 1 columns 41–45 (`AO:AS`) only when the current values differ.

`refreshActionSnapshotRow_()` must write only `AQ:AS` for the supplied row. It must never write `S:W`, `X:Z`, or `AA:AN`.

- [ ] **Step 4: Extend Apps Script diagnostic JSON mapping**

In `apps-script/Code.gs`, extend each returned job object after `scoringUpdatedAt`:

```js
lastFollowUp: row[40] || "",
followUpCount: Number(row[41] || 0),
actionPriority: row[42] || "",
actionReason: row[43] || "",
actionUpdatedAt: row[44] || ""
```

Do not change existing indices.

- [ ] **Step 5: Run parity and full tests**

```bash
node --test tests/apps-script-action-parity.test.mjs tests/phase2c-sheet-fields.test.mjs
npm test
```

Expected: browser and Apps Script fixtures match exactly and the full suite passes.

- [ ] **Step 6: Commit Task 4**

```bash
git add apps-script/ActionCenter.gs apps-script/Code.gs tests/apps-script-action-parity.test.mjs tests/phase2c-sheet-fields.test.mjs
git commit -m "feat: mirror phase 2C action engine in apps script"
```

---

### Task 5: Daily Gmail Digest, Snapshot Refresh, and Idempotent Trigger

**Files:**
- Create: `apps-script/ActionDigest.gs`
- Test: `tests/apps-script-action-digest.test.mjs`

**Interfaces:**
- Consumes: `evaluateJobDriveAction_`, `actionJobFromRow_`, `ensureActionCenterHeaders_` from Task 4.
- Produces: `buildJobDriveActionDigest_(nowIso) -> { dateKey, subject, body, items }` without sending.
- Produces: `resolveJobDriveDigestRecipient_() -> email | ""`.
- Produces: `runJobDriveActionDigest() -> summary`.
- Produces: `installJobDriveActionDigestTrigger() -> existing or created trigger`.

- [ ] **Step 1: Write failing digest tests**

Create `tests/apps-script-action-digest.test.mjs` using `vm` with stubs for `Utilities`, `SpreadsheetApp`, `PropertiesService`, `Session`, `MailApp`, `ScriptApp`, and `console`.

Test these behaviors explicitly:

```js
// 1. digest-worthy: overdue/today/tomorrow, Critical/High deadline risk, High Apply Now
// 2. Normal Apply Now and Normal future follow-up omitted from email
// 3. empty eligible set => MailApp.sendEmail not called
// 4. JOBDRIVE_DIGEST_EMAIL property wins over Session effective user
// 5. missing both recipient sources => no send and summary reports configuration error
// 6. JOBDRIVE_LAST_DIGEST_DATE equal to Paris date => duplicate normal send skipped
// 7. MailApp failure => sent-date property is not written
// 8. successful send => sent-date property written after MailApp.sendEmail
// 9. install function does not create a second trigger when handler already exists
```

Also assert snapshot refresh writes `AQ:AS` for evaluated rows but does not write tracking/scoring columns.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --test tests/apps-script-action-digest.test.mjs
```

Expected: FAIL because `apps-script/ActionDigest.gs` does not exist.

- [ ] **Step 3: Implement digest selection and formatting**

Create `apps-script/ActionDigest.gs`.

Use Script Property keys:

```js
var JOBDRIVE_DIGEST_EMAIL_PROPERTY_ = "JOBDRIVE_DIGEST_EMAIL";
var JOBDRIVE_LAST_DIGEST_DATE_PROPERTY_ = "JOBDRIVE_LAST_DIGEST_DATE";
```

Define digest-worthy predicate exactly as:

```js
function isDigestWorthyAction_(action) {
  if (!action || !action.active) return false;

  if ([
    "FOLLOW_UP_OVERDUE",
    "FOLLOW_UP_TODAY",
    "FOLLOW_UP_TOMORROW"
  ].indexOf(action.actionType) >= 0) return true;

  if (action.actionType === "DEADLINE_RISK") {
    return action.actionPriority === "Critical" || action.actionPriority === "High";
  }

  if (action.actionType === "APPLY_NOW") {
    return action.actionPriority === "High";
  }

  return false;
}
```

`buildJobDriveActionDigest_(nowIso)` must:

1. open `SPREADSHEET_ID` / `SHEET_NAME`;
2. call `ensureActionCenterHeaders_()`;
3. read current rows through column AS;
4. evaluate each non-empty row independently with `evaluateJobDriveAction_()`;
5. collect digest-worthy actions;
6. refresh `AQ:AS` snapshots for evaluated rows;
7. return subject/body/items without sending.

Use subject:

```text
JobDrive Action Digest — 05 Sep 2026
```

Create body sections in this order when non-empty:

```text
OVERDUE FOLLOW-UP
FOLLOW-UP TODAY
DEADLINE RISK
APPLY NOW
TOMORROW
```

Each item includes only available real values: company, role, action reason, fit score, relevant date, status, URL.

- [ ] **Step 4: Implement recipient resolution and idempotent send**

Recipient resolution:

```js
function resolveJobDriveDigestRecipient_() {
  var properties = PropertiesService.getScriptProperties();
  var configured = String(properties.getProperty(JOBDRIVE_DIGEST_EMAIL_PROPERTY_) || "").trim();
  if (configured) return configured;

  try {
    return String(Session.getEffectiveUser().getEmail() || "").trim();
  } catch (error) {
    return "";
  }
}
```

`runJobDriveActionDigest()` must:

1. compute Paris date key;
2. return `{ sent:false, skipped:"already_sent" }` if property already equals today;
3. build digest;
4. return `{ sent:false, skipped:"empty" }` if no items;
5. resolve recipient, and if missing return `{ sent:false, skipped:"missing_recipient" }` without setting sent-date;
6. call `MailApp.sendEmail({ to, subject, body })`;
7. only after successful send set `JOBDRIVE_LAST_DIGEST_DATE` to today;
8. return `{ sent:true, count, recipient, dateKey }`.

Do not catch MailApp errors merely to mark success. If caught for logging, rethrow after logging and leave the property unchanged.

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

Do not call `installJobDriveActionDigestTrigger()` automatically from module load, Discovery, or deployment code.

- [ ] **Step 6: Run digest tests and full suite**

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

### Task 6: Full Regression Gate, Build, Diff Review, and Production Handoff

**Files:**
- Verify all files changed by Tasks 1–5.
- No new production file is required unless a regression found by this task needs a focused fix.

**Interfaces:**
- Verifies the complete Phase 2C contract against the approved spec.
- Produces a merge-ready branch and an exact post-merge operational checklist.

- [ ] **Step 1: Run the complete automated suite from a clean branch state**

```bash
npm test
```

Expected: zero failed tests, including existing Discovery/Phase 2B tests and all Phase 2C tests.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: Vite exits `0` and produces `dist/` successfully.

- [ ] **Step 3: Run whitespace/diff validation**

```bash
git diff --check
```

Expected: no output and exit code `0`.

- [ ] **Step 4: Review the branch diff against `main`**

```bash
git diff --stat main...HEAD
git diff main...HEAD -- \
  src/actions \
  src/AppPro.jsx \
  src/JobDriveDashboard.jsx \
  src/services/sheetsApi.js \
  src/utils/jobDrive.mjs \
  apps-script/ActionCenter.gs \
  apps-script/ActionDigest.gs \
  apps-script/Code.gs \
  tests
```

Verify manually from the diff that:

- no Phase 2B scoring weight or threshold changed;
- no Discovery source registry or 12-hour trigger changed;
- no existing column meaning through AN changed;
- only explicit tracking updates touch U/W/AO:AS;
- no email address or secret is hard-coded;
- no trigger is automatically recreated on deploy;
- Action Center uses live action computation rather than `AQ:AS` snapshots as truth.

- [ ] **Step 5: Confirm the final test count and CI workflow expectations**

The existing `.github/workflows/ci.yml` already runs:

```text
npm test
npm run build
git diff --check
```

Do not add a second redundant CI workflow. Push the branch and confirm the existing PR CI is green.

- [ ] **Step 6: Create/update the Phase 2C pull request**

PR title:

```text
Phase 2C: application action center and smart follow-ups
```

PR body must summarize:

```text
- deterministic Europe/Paris action engine
- Action Center + Actions Today KPI
- atomic +3/+7/+14/no-further follow-up flow
- AO:AS persistence without reusing S:AN
- browser/Apps Script action parity
- one daily idempotent Gmail digest
- dedicated 09:00 Europe/Paris trigger setup
- Phase 2A Discovery and Phase 2B scoring preserved
```

- [ ] **Step 7: After merge, synchronize Apps Script exactly once**

From an up-to-date Codespaces `main`:

```bash
git checkout main
git pull --ff-only
npx clasp push
```

The push output must include:

```text
apps-script/ActionCenter.gs
apps-script/ActionDigest.gs
```

Do not treat a `clasp push` from a stale local `main` as production completion.

- [ ] **Step 8: Configure recipient only if needed**

If `Session.getEffectiveUser().getEmail()` is empty or not the desired recipient, set the Apps Script Script Property:

```text
JOBDRIVE_DIGEST_EMAIL=<desired email address>
```

Do not commit this address to GitHub.

- [ ] **Step 9: Install the Phase 2C trigger exactly once**

Run the Apps Script setup function once:

```text
installJobDriveActionDigestTrigger
```

Then verify Apps Script has one trigger for `runJobDriveActionDigest` and the existing `runJobDriveDiscovery` 12-hour trigger remains present and unchanged.

- [ ] **Step 10: Production smoke test**

Verify with the live Sheet and deployed GitHub Pages UI:

```text
Google OAuth login works
Action Center opens
Actions Today KPI matches live Critical + High actions
old rows without Phase 2C fields still load
one real follow-up +3 write persists after refresh
Follow-up Count increments once
Last Follow-up persists in AO
Phase 2B score and Fit Intelligence are unchanged
A:AS read succeeds
one preview/current digest contains only eligible action categories
no duplicate normal digest is sent for the same Paris date
mobile Action Center has no horizontal-scroll requirement
```

If the smoke test changes a real row temporarily, restore the original tracking values before declaring rollout complete.
