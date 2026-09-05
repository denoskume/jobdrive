import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

const ACTION_CENTER = "apps-script/ActionCenter.gs";
const ACTION_DIGEST = "apps-script/ActionDigest.gs";
const NOW_ISO = "2026-09-05T08:00:00.000Z";

function makeRow(overrides = {}) {
  const row = Array(45).fill("");
  row[0] = overrides.id || "JOB-1";
  row[1] = "Stage M2";
  row[2] = overrides.company || "Industrial AI";
  row[3] = overrides.role || "Machine Learning Intern";
  row[4] = overrides.domain || "Machine Learning";
  row[9] = overrides.postedDate || "2026-09-04";
  row[10] = overrides.deadline || "";
  row[11] = overrides.status || "Nouveau";
  row[13] = String(overrides.fitScore ?? 90);
  row[15] = overrides.link || "https://example.com/job";
  row[17] = overrides.detectedDate || "2026-09-04T10:00:00.000Z";
  row[19] = overrides.appliedDate || "";
  row[20] = overrides.followUpDate || "";
  row[40] = overrides.lastFollowUp || "";
  row[41] = String(overrides.followUpCount ?? 0);
  return row;
}

function parisDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(
    parts
      .filter((part) => ["year", "month", "day"].includes(part.type))
      .map((part) => [part.type, part.value])
  );
  return `${map.year}-${map.month}-${map.day}`;
}

function loadDigestContext({
  rows = [],
  properties = {},
  effectiveEmail = "owner@example.com",
  mailError = null,
  triggers = [],
} = {}) {
  assert.equal(fs.existsSync(ACTION_CENTER), true);
  assert.equal(
    fs.existsSync(ACTION_DIGEST),
    true,
    "apps-script/ActionDigest.gs must exist"
  );

  const sent = [];
  const snapshotWrites = [];
  const propertyStore = { ...properties };
  const header = Array(45).fill("");
  const sheetRows = [header, ...rows.map((row) => [...row])];

  const sheet = {
    getRange(row, column, numRows, numColumns) {
      return {
        getValues() {
          return Array.from({ length: numRows }, (_, r) =>
            Array.from({ length: numColumns }, (_, c) =>
              sheetRows[row - 1 + r]?.[column - 1 + c] ?? ""
            )
          );
        },
        getDisplayValues() {
          return this.getValues().map((values) => values.map(String));
        },
        setValues(values) {
          for (let r = 0; r < numRows; r += 1) {
            for (let c = 0; c < numColumns; c += 1) {
              sheetRows[row - 1 + r][column - 1 + c] = values[r][c];
            }
          }
          if (row > 1 && column === 43 && numColumns === 3) {
            snapshotWrites.push({ row, values: values[0] });
          }
        },
      };
    },
    getLastRow() {
      return sheetRows.length;
    },
  };

  const scriptProperties = {
    getProperty(key) {
      return propertyStore[key] || "";
    },
    setProperty(key, value) {
      propertyStore[key] = String(value);
    },
  };

  const triggerList = [...triggers];
  const context = {
    console,
    SPREADSHEET_ID: "sheet-id",
    SHEET_NAME: "Opportunités",
    Utilities: {
      formatDate(date, timeZone, format) {
        assert.equal(timeZone, "Europe/Paris");
        assert.equal(format, "yyyy-MM-dd");
        return parisDateKey(date);
      },
    },
    SpreadsheetApp: {
      openById(id) {
        assert.equal(id, "sheet-id");
        return {
          getSheetByName(name) {
            assert.equal(name, "Opportunités");
            return sheet;
          },
        };
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return scriptProperties;
      },
    },
    Session: {
      getEffectiveUser() {
        return {
          getEmail() {
            return effectiveEmail;
          },
        };
      },
    },
    MailApp: {
      sendEmail(payload) {
        if (mailError) throw mailError;
        sent.push(payload);
      },
    },
    ScriptApp: {
      getProjectTriggers() {
        return triggerList;
      },
      newTrigger(handler) {
        const builder = {
          timeBased() { return builder; },
          atHour(hour) { builder.hour = hour; return builder; },
          everyDays(days) { builder.days = days; return builder; },
          inTimezone(timeZone) { builder.timeZone = timeZone; return builder; },
          create() {
            const trigger = {
              handler,
              hour: builder.hour,
              days: builder.days,
              timeZone: builder.timeZone,
              getHandlerFunction() { return handler; },
            };
            triggerList.push(trigger);
            return trigger;
          },
        };
        return builder;
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(ACTION_CENTER, "utf8"), context, {
    filename: ACTION_CENTER,
  });
  vm.runInContext(fs.readFileSync(ACTION_DIGEST, "utf8"), context, {
    filename: ACTION_DIGEST,
  });

  context.jobDriveActionNowIso_ = () => NOW_ISO;

  return {
    context,
    sent,
    snapshotWrites,
    propertyStore,
    triggerList,
  };
}

function jobObject(overrides = {}) {
  const row = makeRow(overrides);
  return {
    id: row[0],
    type: row[1],
    company: row[2],
    role: row[3],
    domain: row[4],
    postedDate: row[9],
    deadline: row[10],
    status: row[11],
    fitScore: Number(row[13] || 0),
    link: row[15],
    detectedDate: row[17],
    appliedDate: row[19],
    followUpDate: row[20],
    lastFollowUp: row[40],
    followUpCount: Number(row[41] || 0),
  };
}

test("digest selection includes only approved action categories", () => {
  const { context } = loadDigestContext();
  const jobs = [
    jobObject({ id: "overdue", status: "Candidature envoyée", followUpDate: "2026-09-04" }),
    jobObject({ id: "today", status: "Candidature envoyée", followUpDate: "2026-09-05" }),
    jobObject({ id: "tomorrow", status: "Candidature envoyée", followUpDate: "2026-09-06" }),
    jobObject({ id: "critical-deadline", fitScore: 90, deadline: "2026-09-05" }),
    jobObject({ id: "high-deadline", fitScore: 84, deadline: "2026-09-08" }),
    jobObject({ id: "high-apply", fitScore: 90, deadline: "2026-10-01" }),
    jobObject({ id: "normal-apply", fitScore: 75, deadline: "2026-10-01" }),
    jobObject({ id: "future-follow", status: "Candidature envoyée", followUpDate: "2026-09-12" }),
    jobObject({ id: "no-further", status: "Candidature envoyée", lastFollowUp: "2026-09-04T08:00:00.000Z" }),
  ];

  const digest = context.buildJobDriveActionDigest_(jobs, NOW_ISO);
  const ids = digest.items.map((item) => item.job.id);

  assert.deepEqual(
    JSON.parse(JSON.stringify(ids)),
    ["overdue", "today", "critical-deadline", "high-deadline", "high-apply", "tomorrow"]
  );
  assert.match(digest.body, /OVERDUE FOLLOW-UP/);
  assert.match(digest.body, /FOLLOW-UP TODAY/);
  assert.match(digest.body, /DEADLINE RISK/);
  assert.match(digest.body, /APPLY NOW/);
  assert.match(digest.body, /TOMORROW/);
  assert.doesNotMatch(digest.body, /normal-apply/);
});

test("empty digest sends no email", () => {
  const { context, sent } = loadDigestContext({
    rows: [makeRow({ id: "normal", fitScore: 75, deadline: "2026-10-01" })],
  });

  const result = context.runJobDriveActionDigest();
  assert.equal(result.sent, false);
  assert.equal(result.skipped, "empty");
  assert.equal(sent.length, 0);
});

test("configured digest email overrides effective-user fallback", () => {
  const { context, sent } = loadDigestContext({
    rows: [makeRow({ id: "urgent", deadline: "2026-09-05" })],
    properties: { JOBDRIVE_DIGEST_EMAIL: "configured@example.com" },
    effectiveEmail: "fallback@example.com",
  });

  const result = context.runJobDriveActionDigest();
  assert.equal(result.sent, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "configured@example.com");
});

test("missing recipient skips without setting sent-date property", () => {
  const { context, sent, propertyStore } = loadDigestContext({
    rows: [makeRow({ id: "urgent", deadline: "2026-09-05" })],
    effectiveEmail: "",
  });

  const result = context.runJobDriveActionDigest();
  assert.equal(result.sent, false);
  assert.equal(result.skipped, "recipient");
  assert.equal(sent.length, 0);
  assert.equal(propertyStore.JOBDRIVE_LAST_DIGEST_DATE, undefined);
});

test("same Paris date skips duplicate normal send", () => {
  const { context, sent } = loadDigestContext({
    rows: [makeRow({ id: "urgent", deadline: "2026-09-05" })],
    properties: { JOBDRIVE_LAST_DIGEST_DATE: "2026-09-05" },
  });

  const result = context.runJobDriveActionDigest();
  assert.equal(result.sent, false);
  assert.equal(result.skipped, "already_sent");
  assert.equal(sent.length, 0);
});

test("failed mail send does not mark digest as sent", () => {
  const { context, propertyStore } = loadDigestContext({
    rows: [makeRow({ id: "urgent", deadline: "2026-09-05" })],
    mailError: new Error("mail failed"),
  });

  assert.throws(() => context.runJobDriveActionDigest(), /mail failed/);
  assert.equal(propertyStore.JOBDRIVE_LAST_DIGEST_DATE, undefined);
});

test("successful send marks sent-date only after MailApp succeeds and refreshes snapshots", () => {
  const { context, sent, propertyStore, snapshotWrites } = loadDigestContext({
    rows: [makeRow({ id: "urgent", deadline: "2026-09-05" })],
  });

  const result = context.runJobDriveActionDigest();
  assert.equal(result.sent, true);
  assert.equal(sent.length, 1);
  assert.equal(propertyStore.JOBDRIVE_LAST_DIGEST_DATE, "2026-09-05");
  assert.equal(snapshotWrites.length, 1);
  assert.equal(snapshotWrites[0].row, 2);
  assert.equal(snapshotWrites[0].values[0], "Critical");
});

test("trigger installer is idempotent and targets 09:00 Europe/Paris", () => {
  const existing = {
    getHandlerFunction() {
      return "runJobDriveActionDigest";
    },
  };
  const withExisting = loadDigestContext({ triggers: [existing] });
  assert.equal(withExisting.context.installJobDriveActionDigestTrigger(), existing);
  assert.equal(withExisting.triggerList.length, 1);

  const fresh = loadDigestContext();
  const created = fresh.context.installJobDriveActionDigestTrigger();
  assert.equal(created.handler, "runJobDriveActionDigest");
  assert.equal(created.hour, 9);
  assert.equal(created.days, 1);
  assert.equal(created.timeZone, "Europe/Paris");
  assert.equal(fresh.triggerList.length, 1);
});
