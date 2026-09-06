var DISCOVERY_RUN_SHEET_NAME_ = "Discovery Runs";

var DISCOVERY_RUN_HEADERS_ = [
  "runId", "mode", "startedAt", "finishedAt", "totalKnownSources",
  "activeSources", "sourcesAttempted", "sourcesSucceeded", "sourcesFailed",
  "sourcesRestricted", "sourcesPending", "sourcesSkippedByBudget",
  "rawListingsInspected", "normalizedCandidates", "duplicatesDetected",
  "rejectedLocation", "rejectedInternshipType", "rejectedDuration",
  "rejectedAcademic", "rejectedDefense", "rejectedTechnicalAlignment",
  "rejectedScore", "acceptedStored", "runtimeBudgetReached",
  "rotationCompleted", "lastRotationCompletedAt", "sourceHealthJson"
];

function discoveryCoverageTime_(value) {
  if (!value) return 0;
  if (value && typeof value.getTime === "function") {
    var direct = value.getTime();
    return isFinite(direct) ? direct : 0;
  }
  var parsed = new Date(value).getTime();
  return isFinite(parsed) ? parsed : 0;
}

function discoveryCoverageNow_(now) {
  var time = discoveryCoverageTime_(now);
  return time ? new Date(time) : new Date();
}

function discoveryCoverageNumber_(value) {
  var number = Number(value || 0);
  return isFinite(number) ? number : 0;
}

function discoveryCoverageAccessible_(source) {
  return Boolean(source && source.active === true && String(source.verificationStatus || "") === "verified");
}

function discoveryCoverageRestricted_(source) {
  return String(source && source.verificationStatus || "") === "restricted";
}

function discoveryCoveragePending_(source) {
  if (!source || source.active !== true) return false;
  var verification = String(source.verificationStatus || "");
  var health = String(source.healthState || "");
  if (verification === "unverified" || verification === "configuration_required") return true;
  if (verification === "verified" && (!source.lastAttemptAt || health === "pending")) return true;
  return false;
}

function discoveryCoverageFailed_(source) {
  if (!source || source.active !== true) return false;
  var verification = String(source.verificationStatus || "");
  var health = String(source.healthState || "");
  return verification === "failed" || (verification === "verified" && health === "fetch_error");
}

function computeDiscoveryCoverageSnapshot_(sources, runs, now) {
  sources = Array.isArray(sources) ? sources : [];
  runs = Array.isArray(runs) ? runs : [];
  var currentTime = discoveryCoverageNow_(now).getTime();
  var cutoff = currentTime - 24 * 60 * 60 * 1000;
  var accessible = sources.filter(discoveryCoverageAccessible_);
  var restricted = sources.filter(discoveryCoverageRestricted_).length;
  var pending = sources.filter(discoveryCoveragePending_).length;
  var failed = sources.filter(discoveryCoverageFailed_).length;
  var scanned24h = accessible.filter(function(source) {
    var attempt = discoveryCoverageTime_(source.lastAttemptAt);
    return attempt >= cutoff && attempt <= currentTime;
  }).length;

  var recentRuns = runs.filter(function(run) {
    var finished = discoveryCoverageTime_(run.finishedAt);
    return finished >= cutoff && finished <= currentTime;
  });
  var rawListings24h = recentRuns.reduce(function(total, run) {
    return total + discoveryCoverageNumber_(run.rawListingsInspected);
  }, 0);
  var retained24h = recentRuns.reduce(function(total, run) {
    return total + discoveryCoverageNumber_(run.acceptedStored);
  }, 0);

  var completedRuns = runs.filter(function(run) { return Boolean(run.rotationCompleted); }).sort(function(a, b) {
    return discoveryCoverageTime_(b.lastRotationCompletedAt || b.finishedAt) - discoveryCoverageTime_(a.lastRotationCompletedAt || a.finishedAt);
  });
  var lastRotationCompletedAt = completedRuns.length ? String(completedRuns[0].lastRotationCompletedAt || completedRuns[0].finishedAt || "") : "";
  var hasRecentCompletedRotation = completedRuns.some(function(run) {
    var completed = discoveryCoverageTime_(run.lastRotationCompletedAt || run.finishedAt);
    return completed >= cutoff && completed <= currentTime;
  });

  var state = "incomplete";
  var accessibleComplete = accessible.length > 0 && failed === 0 && pending === 0 && scanned24h >= accessible.length && hasRecentCompletedRotation;
  if (accessibleComplete) state = restricted > 0 ? "restricted" : "complete";
  else if (accessible.length === 0 && restricted > 0 && pending === 0 && failed === 0) state = "restricted";

  return {
    totalKnownSources: sources.length,
    activeSources: accessible.length,
    scanned24h: scanned24h,
    pending: pending,
    failed: failed,
    restricted: restricted,
    rawListings24h: rawListings24h,
    retained24h: retained24h,
    lastRotationCompletedAt: lastRotationCompletedAt,
    state: state
  };
}

function discoveryRunSheet_() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = book.getSheetByName(DISCOVERY_RUN_SHEET_NAME_);
  if (!sheet) sheet = book.insertSheet(DISCOVERY_RUN_SHEET_NAME_);
  var current = sheet.getRange(1, 1, 1, DISCOVERY_RUN_HEADERS_.length).getDisplayValues()[0] || [];
  var changed = DISCOVERY_RUN_HEADERS_.some(function(header, index) {
    return String(current[index] || "") !== header;
  });
  if (changed) sheet.getRange(1, 1, 1, DISCOVERY_RUN_HEADERS_.length).setValues([DISCOVERY_RUN_HEADERS_]);
  return sheet;
}

function discoveryCoverageSafeHealth_(sourceHealth) {
  return (Array.isArray(sourceHealth) ? sourceHealth : []).map(function(item) {
    item = item || {};
    return {
      source: String(item.source || ""),
      type: String(item.type || ""),
      status: String(item.status || ""),
      jobsFound: discoveryCoverageNumber_(item.jobsFound),
      elapsedMs: discoveryCoverageNumber_(item.elapsedMs),
      error: String(item.error || "").slice(0, 500)
    };
  });
}

function discoveryRunSummaryToObject_(summary) {
  summary = summary || {};
  var sources = typeof loadDiscoverySources_ === "function" ? loadDiscoverySources_() : [];
  var accessible = sources.filter(discoveryCoverageAccessible_);
  var restricted = sources.filter(discoveryCoverageRestricted_).length;
  var pending = sources.filter(discoveryCoveragePending_).length;
  var failed = sources.filter(discoveryCoverageFailed_).length;
  var sourceHealth = discoveryCoverageSafeHealth_(summary.sourceHealth);
  var generatedId = typeof Utilities !== "undefined" && Utilities.getUuid ? Utilities.getUuid() : String(Date.now());
  return {
    runId: String(summary.runId || generatedId),
    mode: String(summary.mode || "continuous"),
    startedAt: String(summary.startedAt || ""),
    finishedAt: String(summary.finishedAt || ""),
    totalKnownSources: sources.length,
    activeSources: accessible.length,
    sourcesAttempted: discoveryCoverageNumber_(summary.sourcesAttempted),
    sourcesSucceeded: discoveryCoverageNumber_(summary.sourcesSucceeded),
    sourcesFailed: discoveryCoverageNumber_(summary.sourcesFailed || failed),
    sourcesRestricted: discoveryCoverageNumber_(summary.sourcesRestricted || restricted),
    sourcesPending: discoveryCoverageNumber_(summary.sourcesPending || pending),
    sourcesSkippedByBudget: discoveryCoverageNumber_(summary.sourcesSkippedByBudget),
    rawListingsInspected: discoveryCoverageNumber_(summary.rawListingsInspected || summary.rawJobsFound),
    normalizedCandidates: discoveryCoverageNumber_(summary.normalizedCandidates || summary.normalizedJobs),
    duplicatesDetected: discoveryCoverageNumber_(summary.duplicatesDetected || summary.duplicatesSkipped),
    rejectedLocation: discoveryCoverageNumber_(summary.rejectedLocation || summary.rejectedByCountry),
    rejectedInternshipType: discoveryCoverageNumber_(summary.rejectedInternshipType || summary.rejectedByInternshipType),
    rejectedDuration: discoveryCoverageNumber_(summary.rejectedDuration),
    rejectedAcademic: discoveryCoverageNumber_(summary.rejectedAcademic || summary.rejectedByAcademicPolicy),
    rejectedDefense: discoveryCoverageNumber_(summary.rejectedDefense),
    rejectedTechnicalAlignment: discoveryCoverageNumber_(summary.rejectedTechnicalAlignment || summary.rejectedByTechnicalAlignment),
    rejectedScore: discoveryCoverageNumber_(summary.rejectedScore || summary.rejectedByScore),
    acceptedStored: discoveryCoverageNumber_(summary.acceptedStored || (discoveryCoverageNumber_(summary.inserted) + discoveryCoverageNumber_(summary.updated))),
    runtimeBudgetReached: Boolean(summary.runtimeBudgetReached),
    rotationCompleted: Boolean(summary.rotationCompleted),
    lastRotationCompletedAt: String(summary.lastRotationCompletedAt || ""),
    sourceHealthJson: JSON.stringify(sourceHealth)
  };
}

function appendDiscoveryRun_(summary) {
  if (typeof seedTargetCompanies_ === "function") seedTargetCompanies_();
  if (typeof refreshTargetCompanyCoverage_ === "function") {
    summary.targetCompanyCoverage = refreshTargetCompanyCoverage_(summary.finishedAt || new Date().toISOString());
  }
  var object = discoveryRunSummaryToObject_(summary);
  var sheet = discoveryRunSheet_();
  var row = DISCOVERY_RUN_HEADERS_.map(function(header) { return object[header] == null ? "" : object[header]; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  return object;
}

function loadDiscoveryRuns_() {
  var sheet = discoveryRunSheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).filter(function(row) { return String(row[0] || "").trim(); }).map(function(row) {
    var object = {};
    DISCOVERY_RUN_HEADERS_.forEach(function(header, index) { object[header] = row[index] == null ? "" : row[index]; });
    object.rotationCompleted = /^(true|1|yes)$/i.test(String(object.rotationCompleted || ""));
    return object;
  });
}

function getJobDriveCoverageSnapshot_(now) {
  var sources = typeof loadDiscoverySources_ === "function" ? loadDiscoverySources_() : [];
  return computeDiscoveryCoverageSnapshot_(sources, loadDiscoveryRuns_(), now);
}
