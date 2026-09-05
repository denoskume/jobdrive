import { parisDateKey } from "./actionEngine.mjs";

function addDateKeyDays(key, days) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextDate(days, now) {
  return addDateKeyDays(parisDateKey(now), days);
}

export function buildScheduleFollowUpPatch(
  days,
  { now = new Date() } = {}
) {
  if (![3, 7, 14].includes(days)) {
    throw new Error("Unsupported follow-up schedule");
  }

  return {
    followUpDate: nextDate(days, now),
    lastUpdated: now.toISOString(),
  };
}

export function buildCompletedFollowUpPatch(
  job = {},
  choice,
  { now = new Date() } = {}
) {
  if (![3, 7, 14, "none"].includes(choice)) {
    throw new Error("Unsupported follow-up action");
  }

  const numeric = Number(job.followUpCount);
  const current = Number.isFinite(numeric) ? numeric : 0;

  return {
    lastFollowUp: now.toISOString(),
    followUpCount: current + 1,
    followUpDate:
      choice === "none"
        ? ""
        : nextDate(choice, now),
    lastUpdated: now.toISOString(),
  };
}
