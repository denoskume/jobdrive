import {
  ACTION_PRIORITY_ORDER,
  ACTION_TIME_ZONE,
  ACTION_TYPE_ORDER,
  ACTION_TYPES,
  APPLICATION_TRACKING_STATUSES,
  PRE_APPLICATION_STATUSES,
  TERMINAL_STATUSES,
} from "./actionConfig.mjs";

const PARIS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ACTION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function clean(value) {
  return String(value ?? "").trim();
}

function safeDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const text = clean(value);
  if (!text) return null;

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const utc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      utc.getUTCFullYear() === Number(year) &&
      utc.getUTCMonth() === Number(month) - 1 &&
      utc.getUTCDate() === Number(day)
    ) {
      return utc;
    }
    return null;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parisDateKey(value) {
  const text = clean(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = safeDate(text);
    return parsed ? text : "";
  }

  const date = safeDate(value);
  if (!date) return "";

  const parts = Object.fromEntries(
    PARIS_FORMATTER.formatToParts(date)
      .filter((part) => ["year", "month", "day"].includes(part.type))
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function keyToUtcMs(key) {
  const match = clean(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

export function calendarDayDelta(fromValue, toValue) {
  const fromKey = parisDateKey(fromValue);
  const toKey = parisDateKey(toValue);
  const fromMs = keyToUtcMs(fromKey);
  const toMs = keyToUtcMs(toKey);

  if (fromMs === null || toMs === null) return null;
  return Math.round((toMs - fromMs) / 86400000);
}

function inactive(reason = "No active action") {
  return {
    active: false,
    actionType: ACTION_TYPES.NONE,
    actionPriority: "None",
    actionReason: reason,
    actionDate: "",
    urgencyDays: null,
  };
}

function active(actionType, actionPriority, actionReason, actionDate = "", urgencyDays = null) {
  return {
    active: true,
    actionType,
    actionPriority,
    actionReason,
    actionDate: actionDate || "",
    urgencyDays: Number.isFinite(urgencyDays) ? urgencyDays : null,
  };
}

export function evaluateAction(job = {}, { now = new Date() } = {}) {
  const status = clean(job.status);
  const fitScore = Number(job.fitScore || 0);

  if (TERMINAL_STATUSES.has(status)) {
    return inactive("Terminal status");
  }

  if (APPLICATION_TRACKING_STATUSES.has(status)) {
    const followUpKey = parisDateKey(job.followUpDate);

    if (followUpKey) {
      const days = calendarDayDelta(now, followUpKey);

      if (days < 0) {
        return active(
          ACTION_TYPES.FOLLOW_UP_OVERDUE,
          "Critical",
          `Follow-up overdue by ${Math.abs(days)} days`,
          followUpKey,
          days
        );
      }

      if (days === 0) {
        return active(
          ACTION_TYPES.FOLLOW_UP_TODAY,
          "Critical",
          "Follow-up due today",
          followUpKey,
          0
        );
      }

      if (days === 1) {
        return active(
          ACTION_TYPES.FOLLOW_UP_TOMORROW,
          "High",
          "Follow-up due tomorrow",
          followUpKey,
          1
        );
      }

      return active(
        ACTION_TYPES.UPCOMING_FOLLOW_UP,
        "Normal",
        `Follow-up scheduled in ${days} days`,
        followUpKey,
        days
      );
    }

    if (clean(job.lastFollowUp)) {
      return inactive("No further follow-up requested");
    }

    const appliedKey = parisDateKey(job.appliedDate);
    const age = appliedKey ? calendarDayDelta(appliedKey, now) : null;

    if (age !== null && age >= 3) {
      return active(
        ACTION_TYPES.SCHEDULE_FOLLOW_UP,
        "High",
        `No follow-up scheduled after ${age} days`,
        "",
        null
      );
    }

    return active(
      ACTION_TYPES.SCHEDULE_FOLLOW_UP,
      "Normal",
      "No follow-up scheduled",
      "",
      null
    );
  }

  if (!PRE_APPLICATION_STATUSES.has(status)) {
    return inactive("No active action");
  }

  if (!Number.isFinite(fitScore) || fitScore < 75) {
    return inactive("Phase 2B fit score below 75 or unavailable");
  }

  const deadlineKey = parisDateKey(job.deadline);
  const deadlineDays = deadlineKey ? calendarDayDelta(now, deadlineKey) : null;

  if (deadlineDays !== null && deadlineDays < 0) {
    return inactive("Application deadline has passed");
  }

  if (deadlineDays === 0) {
    return active(
      ACTION_TYPES.DEADLINE_RISK,
      "Critical",
      "Application deadline is today",
      deadlineKey,
      0
    );
  }

  if (deadlineDays === 1) {
    return active(
      ACTION_TYPES.DEADLINE_RISK,
      "Critical",
      "Application deadline is tomorrow",
      deadlineKey,
      1
    );
  }

  if (deadlineDays !== null && deadlineDays >= 2 && deadlineDays <= 3) {
    return active(
      ACTION_TYPES.DEADLINE_RISK,
      fitScore >= 85 ? "Critical" : "High",
      `Application deadline in ${deadlineDays} days`,
      deadlineKey,
      deadlineDays
    );
  }

  if (deadlineDays !== null && deadlineDays >= 4 && deadlineDays <= 7) {
    return active(
      ACTION_TYPES.DEADLINE_RISK,
      fitScore >= 85 ? "High" : "Normal",
      `Application deadline in ${deadlineDays} days`,
      deadlineKey,
      deadlineDays
    );
  }

  return active(
    ACTION_TYPES.APPLY_NOW,
    fitScore >= 85 ? "High" : "Normal",
    "Strong Phase 2B fit; application not yet submitted",
    deadlineKey,
    deadlineDays
  );
}

function sortableDate(value, fallback) {
  const date = safeDate(value);
  return date ? date.getTime() : fallback;
}

function relevantDistance(item) {
  return Number.isFinite(item.urgencyDays)
    ? Math.abs(item.urgencyDays)
    : Number.POSITIVE_INFINITY;
}

export function sortActionItems(items = []) {
  return [...items].sort((a, b) => {
    const priorityDelta =
      (ACTION_PRIORITY_ORDER[a.actionPriority] ?? 99) -
      (ACTION_PRIORITY_ORDER[b.actionPriority] ?? 99);
    if (priorityDelta) return priorityDelta;

    const typeDelta =
      (ACTION_TYPE_ORDER[a.actionType] ?? 99) -
      (ACTION_TYPE_ORDER[b.actionType] ?? 99);
    if (typeDelta) return typeDelta;

    const distanceDelta = relevantDistance(a) - relevantDistance(b);
    if (distanceDelta) return distanceDelta;

    const scoreDelta = Number(b.job?.fitScore || 0) - Number(a.job?.fitScore || 0);
    if (scoreDelta) return scoreDelta;

    const postedDelta =
      sortableDate(b.job?.postedDate, Number.NEGATIVE_INFINITY) -
      sortableDate(a.job?.postedDate, Number.NEGATIVE_INFINITY);
    if (postedDelta) return postedDelta;

    const detectedDelta =
      sortableDate(b.job?.detectedDate, Number.NEGATIVE_INFINITY) -
      sortableDate(a.job?.detectedDate, Number.NEGATIVE_INFINITY);
    if (detectedDelta) return detectedDelta;

    return clean(a.job?.id).localeCompare(clean(b.job?.id));
  });
}

export function buildActionItems(jobs = [], options = {}) {
  const items = [];

  for (const job of jobs) {
    try {
      const result = evaluateAction(job, options);
      if (result.active) {
        items.push({ job, ...result });
      }
    } catch {
      // A single malformed row must never block the rest of the Action Center.
    }
  }

  return sortActionItems(items);
}

export function groupActionItems(items = []) {
  const groups = {
    overdue: [],
    today: [],
    deadlineRisk: [],
    applyNow: [],
    upcoming: [],
  };

  for (const item of sortActionItems(items)) {
    if (item.actionType === ACTION_TYPES.FOLLOW_UP_OVERDUE) {
      groups.overdue.push(item);
    } else if (item.actionType === ACTION_TYPES.FOLLOW_UP_TODAY) {
      groups.today.push(item);
    } else if (item.actionType === ACTION_TYPES.DEADLINE_RISK) {
      groups.deadlineRisk.push(item);
    } else if (item.actionType === ACTION_TYPES.APPLY_NOW) {
      groups.applyNow.push(item);
    } else {
      groups.upcoming.push(item);
    }
  }

  return groups;
}

export function actionKpi(items = []) {
  const active = items.filter((item) => item?.active !== false);
  const criticalCount = active.filter((item) => item.actionPriority === "Critical").length;
  const highCount = active.filter((item) => item.actionPriority === "High").length;

  return {
    todayCount: criticalCount + highCount,
    criticalCount,
    highCount,
  };
}
