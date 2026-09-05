var JOBDRIVE_DIGEST_EMAIL_PROPERTY_ = "JOBDRIVE_DIGEST_EMAIL";
var JOBDRIVE_LAST_DIGEST_DATE_PROPERTY_ = "JOBDRIVE_LAST_DIGEST_DATE";
var JOBDRIVE_ACTION_DIGEST_HANDLER_ = "runJobDriveActionDigest";

function jobDriveActionNowIso_() {
  return new Date().toISOString();
}

function actionDigestWorthy_(action) {
  if (!action || !action.active) return false;

  if (
    action.actionType === ACTION_TYPES_.FOLLOW_UP_OVERDUE ||
    action.actionType === ACTION_TYPES_.FOLLOW_UP_TODAY ||
    action.actionType === ACTION_TYPES_.FOLLOW_UP_TOMORROW
  ) {
    return true;
  }

  if (action.actionType === ACTION_TYPES_.DEADLINE_RISK) {
    return (
      action.actionPriority === "Critical" ||
      action.actionPriority === "High"
    );
  }

  if (action.actionType === ACTION_TYPES_.APPLY_NOW) {
    return action.actionPriority === "High";
  }

  return false;
}

function actionDigestSection_(action) {
  if (action.actionType === ACTION_TYPES_.FOLLOW_UP_OVERDUE) {
    return "OVERDUE FOLLOW-UP";
  }
  if (action.actionType === ACTION_TYPES_.FOLLOW_UP_TODAY) {
    return "FOLLOW-UP TODAY";
  }
  if (action.actionType === ACTION_TYPES_.DEADLINE_RISK) {
    return "DEADLINE RISK";
  }
  if (action.actionType === ACTION_TYPES_.APPLY_NOW) {
    return "APPLY NOW";
  }
  if (action.actionType === ACTION_TYPES_.FOLLOW_UP_TOMORROW) {
    return "TOMORROW";
  }
  return "";
}

function actionDigestSectionOrder_(section) {
  var order = {
    "OVERDUE FOLLOW-UP": 0,
    "FOLLOW-UP TODAY": 1,
    "DEADLINE RISK": 2,
    "APPLY NOW": 3,
    "TOMORROW": 4
  };
  return Object.prototype.hasOwnProperty.call(order, section)
    ? order[section]
    : 99;
}

function actionDigestItemCompare_(a, b) {
  var sectionDelta =
    actionDigestSectionOrder_(a.section) -
    actionDigestSectionOrder_(b.section);
  if (sectionDelta) return sectionDelta;

  var priorityOrder = {
    Critical: 0,
    High: 1,
    Normal: 2,
    None: 3
  };
  var priorityDelta =
    (priorityOrder[a.action.actionPriority] == null
      ? 99
      : priorityOrder[a.action.actionPriority]) -
    (priorityOrder[b.action.actionPriority] == null
      ? 99
      : priorityOrder[b.action.actionPriority]);
  if (priorityDelta) return priorityDelta;

  var urgencyA =
    typeof a.action.urgencyDays === "number"
      ? Math.abs(a.action.urgencyDays)
      : 999999;
  var urgencyB =
    typeof b.action.urgencyDays === "number"
      ? Math.abs(b.action.urgencyDays)
      : 999999;
  if (urgencyA !== urgencyB) return urgencyA - urgencyB;

  var scoreDelta =
    Number(b.job.fitScore || 0) - Number(a.job.fitScore || 0);
  if (scoreDelta) return scoreDelta;

  return actionClean_(a.job.id).localeCompare(actionClean_(b.job.id));
}

function actionDigestDateLabel_(dateKey) {
  var match = actionClean_(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return actionClean_(dateKey);

  var months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return (
    match[3] + " " +
    months[Number(match[2]) - 1] + " " +
    match[1]
  );
}

function actionDigestItemLines_(item) {
  var job = item.job;
  var action = item.action;
  var lines = [];
  var title = [
    actionClean_(job.company),
    actionClean_(job.role)
  ].filter(function(value) {
    return Boolean(value);
  }).join(" — ");

  lines.push("- " + (title || "Internship opportunity"));
  lines.push("  " + action.actionReason);

  if (Number(job.fitScore || 0) > 0) {
    lines.push("  Match: " + Number(job.fitScore || 0) + "%");
  }

  if (action.actionDate) {
    lines.push("  Date: " + action.actionDate);
  }

  if (job.status) {
    lines.push("  Status: " + job.status);
  }

  if (job.link) {
    lines.push("  Offer: " + job.link);
  }

  return lines;
}

function buildJobDriveActionDigest_(jobs, nowIso) {
  var now = nowIso || jobDriveActionNowIso_();
  var dateKey = actionParisDateKey_(now);
  var items = [];

  (jobs || []).forEach(function(job) {
    try {
      var action = evaluateJobDriveAction_(job, now);
      if (!actionDigestWorthy_(action)) return;

      items.push({
        job: job,
        action: action,
        section: actionDigestSection_(action)
      });
    } catch (error) {
      console.log(
        "JobDrive digest evaluation skipped for " +
        actionClean_(job && job.id) + ": " +
        String(error && error.message || error)
      );
    }
  });

  items.sort(actionDigestItemCompare_);

  var lines = [
    "JobDrive Action Digest — " + actionDigestDateLabel_(dateKey),
    ""
  ];
  var currentSection = "";

  items.forEach(function(item) {
    if (item.section !== currentSection) {
      if (currentSection) lines.push("");
      currentSection = item.section;
      lines.push(currentSection);
    }

    Array.prototype.push.apply(lines, actionDigestItemLines_(item));
  });

  return {
    dateKey: dateKey,
    subject: "JobDrive Action Digest — " + actionDigestDateLabel_(dateKey),
    body: lines.join("\n").trim(),
    items: items
  };
}

function resolveJobDriveDigestRecipient_() {
  var properties = PropertiesService.getScriptProperties();
  var configured = actionClean_(
    properties.getProperty(JOBDRIVE_DIGEST_EMAIL_PROPERTY_)
  );
  if (configured) return configured;

  try {
    var effectiveUser = Session.getEffectiveUser();
    var email = effectiveUser && effectiveUser.getEmail
      ? actionClean_(effectiveUser.getEmail())
      : "";
    return email;
  } catch (error) {
    return "";
  }
}

function readJobDriveActionRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, 45)
    .getDisplayValues();
}

function runJobDriveActionDigest() {
  var nowIso = jobDriveActionNowIso_();
  var dateKey = actionParisDateKey_(nowIso);
  var properties = PropertiesService.getScriptProperties();
  var alreadySent = actionClean_(
    properties.getProperty(JOBDRIVE_LAST_DIGEST_DATE_PROPERTY_)
  );

  if (alreadySent === dateKey) {
    return {
      sent: false,
      count: 0,
      dateKey: dateKey,
      skipped: "already_sent"
    };
  }

  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error("Sheet not found");
  }

  ensureActionCenterHeaders_(sheet);

  var rows = readJobDriveActionRows_(sheet);
  var jobs = [];

  rows.forEach(function(row, index) {
    if (!row[0]) return;

    var job = actionJobFromRow_(row);
    try {
      refreshActionSnapshotRow_(sheet, index + 2, job, nowIso);
      jobs.push(job);
    } catch (error) {
      console.log(
        "JobDrive action snapshot skipped for " +
        actionClean_(job.id) + ": " +
        String(error && error.message || error)
      );
    }
  });

  var digest = buildJobDriveActionDigest_(jobs, nowIso);
  if (!digest.items.length) {
    return {
      sent: false,
      count: 0,
      dateKey: dateKey,
      skipped: "empty"
    };
  }

  var recipient = resolveJobDriveDigestRecipient_();
  if (!recipient) {
    console.log(
      "JobDrive digest skipped: no recipient configured in " +
      JOBDRIVE_DIGEST_EMAIL_PROPERTY_
    );
    return {
      sent: false,
      count: digest.items.length,
      dateKey: dateKey,
      skipped: "recipient"
    };
  }

  MailApp.sendEmail({
    to: recipient,
    subject: digest.subject,
    body: digest.body
  });

  properties.setProperty(
    JOBDRIVE_LAST_DIGEST_DATE_PROPERTY_,
    dateKey
  );

  return {
    sent: true,
    count: digest.items.length,
    dateKey: dateKey,
    skipped: ""
  };
}

function installJobDriveActionDigestTrigger() {
  var triggers = ScriptApp.getProjectTriggers();

  for (var i = 0; i < triggers.length; i++) {
    if (
      triggers[i].getHandlerFunction() ===
      JOBDRIVE_ACTION_DIGEST_HANDLER_
    ) {
      return triggers[i];
    }
  }

  return ScriptApp
    .newTrigger(JOBDRIVE_ACTION_DIGEST_HANDLER_)
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .inTimezone(ACTION_TIME_ZONE_)
    .create();
}
