var ACTION_TIME_ZONE_ = "Europe/Paris";

var ACTION_TYPES_ = {
  APPLY_NOW: "APPLY_NOW",
  DEADLINE_RISK: "DEADLINE_RISK",
  FOLLOW_UP_OVERDUE: "FOLLOW_UP_OVERDUE",
  FOLLOW_UP_TODAY: "FOLLOW_UP_TODAY",
  FOLLOW_UP_TOMORROW: "FOLLOW_UP_TOMORROW",
  UPCOMING_FOLLOW_UP: "UPCOMING_FOLLOW_UP",
  SCHEDULE_FOLLOW_UP: "SCHEDULE_FOLLOW_UP",
  NONE: "NONE"
};

var ACTION_TERMINAL_STATUSES_ = {
  "Accepté": true,
  "Refusé": true,
  "Expiré": true
};

var ACTION_TRACKING_STATUSES_ = {
  "Candidature envoyée": true,
  "Entretien": true,
  "Offre": true
};

var ACTION_PRE_APPLICATION_STATUSES_ = {
  "Nouveau": true,
  "À candidater": true
};

function actionClean_(value) {
  return String(value == null ? "" : value).trim();
}

function actionValidDateOnly_(text) {
  var match = actionClean_(text).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  var year = Number(match[1]);
  var month = Number(match[2]);
  var day = Number(match[3]);
  var value = new Date(Date.UTC(year, month - 1, day));

  return (
    value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
  );
}

function actionParisDateKey_(value) {
  var text = actionClean_(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return actionValidDateOnly_(text) ? text : "";
  }

  if (!text && !(value instanceof Date)) return "";

  var date = value instanceof Date ? value : new Date(value);
  if (!date || isNaN(date.getTime())) return "";

  return Utilities.formatDate(
    date,
    ACTION_TIME_ZONE_,
    "yyyy-MM-dd"
  );
}

function actionKeyToUtcMs_(key) {
  var match = actionClean_(key).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
}

function actionCalendarDayDelta_(fromValue, toValue) {
  var fromKey = actionParisDateKey_(fromValue);
  var toKey = actionParisDateKey_(toValue);
  var fromMs = actionKeyToUtcMs_(fromKey);
  var toMs = actionKeyToUtcMs_(toKey);

  if (fromMs === null || toMs === null) return null;
  return Math.round((toMs - fromMs) / 86400000);
}

function actionInactive_(reason) {
  return {
    active: false,
    actionType: ACTION_TYPES_.NONE,
    actionPriority: "None",
    actionReason: reason || "No active action",
    actionDate: "",
    urgencyDays: null
  };
}

function actionActive_(actionType, actionPriority, actionReason, actionDate, urgencyDays) {
  return {
    active: true,
    actionType: actionType,
    actionPriority: actionPriority,
    actionReason: actionReason,
    actionDate: actionDate || "",
    urgencyDays:
      typeof urgencyDays === "number" && isFinite(urgencyDays)
        ? urgencyDays
        : null
  };
}

function evaluateJobDriveAction_(job, nowIso) {
  job = job || {};
  var now = nowIso || new Date().toISOString();
  var status = actionClean_(job.status);
  var fitScore = Number(job.fitScore || 0);

  if (ACTION_TERMINAL_STATUSES_[status]) {
    return actionInactive_("Terminal status");
  }

  if (ACTION_TRACKING_STATUSES_[status]) {
    var followUpKey = actionParisDateKey_(job.followUpDate);

    if (followUpKey) {
      var followUpDays = actionCalendarDayDelta_(now, followUpKey);

      if (followUpDays < 0) {
        return actionActive_(
          ACTION_TYPES_.FOLLOW_UP_OVERDUE,
          "Critical",
          "Follow-up overdue by " + Math.abs(followUpDays) + " days",
          followUpKey,
          followUpDays
        );
      }

      if (followUpDays === 0) {
        return actionActive_(
          ACTION_TYPES_.FOLLOW_UP_TODAY,
          "Critical",
          "Follow-up due today",
          followUpKey,
          0
        );
      }

      if (followUpDays === 1) {
        return actionActive_(
          ACTION_TYPES_.FOLLOW_UP_TOMORROW,
          "High",
          "Follow-up due tomorrow",
          followUpKey,
          1
        );
      }

      return actionActive_(
        ACTION_TYPES_.UPCOMING_FOLLOW_UP,
        "Normal",
        "Follow-up scheduled in " + followUpDays + " days",
        followUpKey,
        followUpDays
      );
    }

    if (actionClean_(job.lastFollowUp)) {
      return actionInactive_("No further follow-up requested");
    }

    var appliedKey = actionParisDateKey_(job.appliedDate);
    var appliedAge = appliedKey
      ? actionCalendarDayDelta_(appliedKey, now)
      : null;

    if (appliedAge !== null && appliedAge >= 3) {
      return actionActive_(
        ACTION_TYPES_.SCHEDULE_FOLLOW_UP,
        "High",
        "No follow-up scheduled after " + appliedAge + " days",
        "",
        null
      );
    }

    return actionActive_(
      ACTION_TYPES_.SCHEDULE_FOLLOW_UP,
      "Normal",
      "No follow-up scheduled",
      "",
      null
    );
  }

  if (!ACTION_PRE_APPLICATION_STATUSES_[status]) {
    return actionInactive_("No active action");
  }

  if (!isFinite(fitScore) || fitScore < 75) {
    return actionInactive_("Phase 2B fit score below 75 or unavailable");
  }

  var deadlineKey = actionParisDateKey_(job.deadline);
  var deadlineDays = deadlineKey
    ? actionCalendarDayDelta_(now, deadlineKey)
    : null;

  if (deadlineDays !== null && deadlineDays < 0) {
    return actionInactive_("Application deadline has passed");
  }

  if (deadlineDays === 0) {
    return actionActive_(
      ACTION_TYPES_.DEADLINE_RISK,
      "Critical",
      "Application deadline is today",
      deadlineKey,
      0
    );
  }

  if (deadlineDays === 1) {
    return actionActive_(
      ACTION_TYPES_.DEADLINE_RISK,
      "Critical",
      "Application deadline is tomorrow",
      deadlineKey,
      1
    );
  }

  if (deadlineDays !== null && deadlineDays >= 2 && deadlineDays <= 3) {
    return actionActive_(
      ACTION_TYPES_.DEADLINE_RISK,
      fitScore >= 85 ? "Critical" : "High",
      "Application deadline in " + deadlineDays + " days",
      deadlineKey,
      deadlineDays
    );
  }

  if (deadlineDays !== null && deadlineDays >= 4 && deadlineDays <= 7) {
    return actionActive_(
      ACTION_TYPES_.DEADLINE_RISK,
      fitScore >= 85 ? "High" : "Normal",
      "Application deadline in " + deadlineDays + " days",
      deadlineKey,
      deadlineDays
    );
  }

  return actionActive_(
    ACTION_TYPES_.APPLY_NOW,
    fitScore >= 85 ? "High" : "Normal",
    "Strong Phase 2B fit; application not yet submitted",
    deadlineKey,
    deadlineDays
  );
}

function actionJobFromRow_(row) {
  row = row || [];

  return {
    id: row[0] || "",
    type: row[1] || "",
    company: row[2] || "",
    role: row[3] || "",
    domain: row[4] || "",
    postedDate: row[9] || "",
    deadline: row[10] || "",
    status: row[11] || "Nouveau",
    priority: row[12] || "",
    fitScore: Number(row[13] || 0),
    link: row[15] || "",
    detectedDate: row[17] || "",
    appliedDate: row[19] || "",
    followUpDate: row[20] || "",
    lastFollowUp: row[40] || "",
    followUpCount: Number(row[41] || 0),
    actionPriority: row[42] || "",
    actionReason: row[43] || "",
    actionUpdatedAt: row[44] || ""
  };
}

function ensureActionCenterHeaders_(sheet) {
  var headers = [
    "lastFollowUp",
    "followUpCount",
    "actionPriority",
    "actionReason",
    "actionUpdatedAt"
  ];
  var range = sheet.getRange(1, 41, 1, 5);
  var current = range.getValues()[0];
  var changed = false;

  for (var i = 0; i < headers.length; i++) {
    if (current[i] !== headers[i]) {
      current[i] = headers[i];
      changed = true;
    }
  }

  if (changed) {
    range.setValues([current]);
  }

  return headers;
}

function refreshActionSnapshotRow_(sheet, rowNumber, job, nowIso) {
  var evaluatedAt = nowIso || new Date().toISOString();
  var action = evaluateJobDriveAction_(job, evaluatedAt);

  sheet
    .getRange(rowNumber, 43, 1, 3)
    .setValues([[
      action.actionPriority,
      action.actionReason,
      evaluatedAt
    ]]);

  return action;
}
