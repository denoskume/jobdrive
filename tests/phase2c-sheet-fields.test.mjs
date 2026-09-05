import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeJobs } from "../src/utils/jobDrive.mjs";

function rowWithPhase2C() {
  const row = Array(45).fill("");
  row[0] = "JOB-2C-1";
  row[1] = "Stage M2";
  row[2] = "Industrial AI";
  row[3] = "ML Intern";
  row[11] = "Candidature envoyée";
  row[13] = "91";
  row[40] = "2026-09-05T08:00:00.000Z";
  row[41] = "3";
  row[42] = "Critical";
  row[43] = "Follow-up due today";
  row[44] = "2026-09-05T08:05:00.000Z";
  return row;
}

test("normalizes AO:AS phase 2C fields", () => {
  const [job] = normalizeJobs([
    Array(45).fill("header"),
    rowWithPhase2C(),
  ]);

  assert.equal(job.lastFollowUp, "2026-09-05T08:00:00.000Z");
  assert.equal(job.followUpCount, 3);
  assert.equal(job.actionPriority, "Critical");
  assert.equal(job.actionReason, "Follow-up due today");
  assert.equal(job.actionUpdatedAt, "2026-09-05T08:05:00.000Z");
});

test("historical A:AN rows default phase 2C fields safely", () => {
  const oldRow = Array(40).fill("");
  oldRow[0] = "OLD-JOB";
  oldRow[1] = "Stage M2";

  const [job] = normalizeJobs([
    Array(40).fill("header"),
    oldRow,
  ]);

  assert.equal(job.lastFollowUp, "");
  assert.equal(job.followUpCount, 0);
  assert.equal(job.actionPriority, "");
  assert.equal(job.actionReason, "");
  assert.equal(job.actionUpdatedAt, "");
});

test("Sheets client reads Phase 2C fields inside the expanded A:BC range and maps writes", () => {
  const source = fs.readFileSync("src/services/sheetsApi.js", "utf8");

  assert.match(source, /'\$\{SHEET_NAME\}'!A:BC/);
  assert.match(source, /lastFollowUp:\s*"AO"/);
  assert.match(source, /followUpCount:\s*"AP"/);
  assert.match(source, /actionPriority:\s*"AQ"/);
  assert.match(source, /actionReason:\s*"AR"/);
  assert.match(source, /actionUpdatedAt:\s*"AS"/);

  assert.match(source, /status:\s*"L"/);
  assert.match(source, /favorite:\s*"S"/);
  assert.match(source, /appliedDate:\s*"T"/);
  assert.match(source, /followUpDate:\s*"U"/);
  assert.match(source, /notes:\s*"V"/);
  assert.match(source, /lastUpdated:\s*"W"/);
});

test("Apps Script ActionCenter owns AO:AS headers and AQ:AS snapshots only", () => {
  const source = fs.readFileSync("apps-script/ActionCenter.gs", "utf8");

  for (const header of [
    "lastFollowUp",
    "followUpCount",
    "actionPriority",
    "actionReason",
    "actionUpdatedAt",
  ]) {
    assert.match(source, new RegExp(`"${header}"`));
  }

  assert.match(source, /getRange\(1,\s*41,\s*1,\s*5\)/);
  assert.match(source, /getRange\(rowNumber,\s*43,\s*1,\s*3\)/);
  assert.doesNotMatch(source, /getRange\(rowNumber,\s*19/);
  assert.doesNotMatch(source, /getRange\(rowNumber,\s*27/);
  assert.doesNotMatch(source, /getRange\(rowNumber,\s*35/);
});

test("Apps Script read API exposes AO:AS without moving Phase 2B fields", () => {
  const source = fs.readFileSync("apps-script/Code.gs", "utf8");

  assert.match(source, /scoringUpdatedAt:\s*row\[39\]/);
  assert.match(source, /lastFollowUp:\s*row\[40\]/);
  assert.match(source, /followUpCount:\s*Number\(row\[41\]/);
  assert.match(source, /actionPriority:\s*row\[42\]/);
  assert.match(source, /actionReason:\s*row\[43\]/);
  assert.match(source, /actionUpdatedAt:\s*row\[44\]/);
});
