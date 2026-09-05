var JOBDRIVE_BACKFILL_ACTIVE_ = "JOBDRIVE_BACKFILL_ACTIVE";
var JOBDRIVE_BACKFILL_STARTED_AT_ = "JOBDRIVE_BACKFILL_STARTED_AT";
var JOBDRIVE_BACKFILL_COMPLETED_AT_ = "JOBDRIVE_BACKFILL_COMPLETED_AT";
var JOBDRIVE_ROTATION_STARTED_AT_ = "JOBDRIVE_ROTATION_STARTED_AT";

function discoveryBackfillProperties_() {
  return PropertiesService.getScriptProperties();
}

function discoveryBackfillNow_(now) {
  if (now && typeof now.getTime === "function" && isFinite(now.getTime())) {
    return new Date(now.getTime());
  }
  return new Date();
}

function discoveryBackfillIso_(now) {
  return discoveryBackfillNow_(now).toISOString();
}

function discoveryBackfillBool_(value) {
  return String(value || "").toLowerCase() === "true";
}

function refreshFranceTravailRegistryConfig_() {
  if (typeof franceTravailConfigStatus_ !== "function") return null;
  var config = franceTravailConfigStatus_();
  var sources = loadDiscoverySources_();
  var source = sources.filter(function(item){ return item.sourceType === "france_travail"; })[0];
  if (!source) return config;

  if (config.configured && source.verificationStatus === "configuration_required") {
    source.active = false;
    source.verificationStatus = "unverified";
    source.healthState = "pending";
    source.lastError = "";
    upsertDiscoverySource_(source);
  } else if (!config.configured) {
    source.active = true;
    source.verificationStatus = "configuration_required";
    source.healthState = "configuration_required";
    source.lastError = config.reason || "missing_credentials";
    upsertDiscoverySource_(source);
  }
  return config;
}

function previewJobDriveDiscoveryConfiguration() {
  seedDiscoveryRegistry_();
  var franceTravail = refreshFranceTravailRegistryConfig_();
  var sources = loadDiscoverySources_();
  var active = sources.filter(function(source){ return source.active; });
  return {
    totalKnownSources: sources.length,
    activeSources: active.length,
    verifiedSources: sources.filter(function(source){ return source.verificationStatus === "verified" && source.active; }).length,
    restrictedSources: sources.filter(function(source){ return source.verificationStatus === "restricted"; }).length,
    configurationRequiredSources: sources.filter(function(source){ return source.verificationStatus === "configuration_required"; }).length,
    unverifiedSources: sources.filter(function(source){ return source.verificationStatus === "unverified"; }).length,
    franceTravail: franceTravail || {configured:false,reason:"adapter_unavailable"}
  };
}

function startJobDriveBackfill(now) {
  var date = discoveryBackfillNow_(now);
  var iso = date.toISOString();
  seedDiscoveryRegistry_();
  refreshFranceTravailRegistryConfig_();
  var sources = loadDiscoverySources_();
  sources.forEach(function(source) {
    if (!source.active) return;
    source.cursor = "";
    upsertDiscoverySource_(source);
  });

  var properties = discoveryBackfillProperties_();
  properties.setProperty(JOBDRIVE_BACKFILL_ACTIVE_, "true");
  properties.setProperty(JOBDRIVE_BACKFILL_STARTED_AT_, iso);
  properties.setProperty(JOBDRIVE_ROTATION_STARTED_AT_, iso);
  properties.deleteProperty(JOBDRIVE_BACKFILL_COMPLETED_AT_);
  return {active:true, startedAt:iso, rotationStartedAt:iso, totalKnownSources:sources.length};
}

function sourceAccountedForBackfill_(source, rotationStartedAt) {
  if (!source || !source.active) return true;
  var verification = String(source.verificationStatus || "");
  if (["restricted", "configuration_required", "unsupported", "failed"].indexOf(verification) >= 0) return true;
  if (verification !== "verified") return false;
  if (String(source.cursor || "").trim()) return false;
  var rotationTime = new Date(rotationStartedAt || 0).getTime();
  var attemptTime = new Date(source.lastAttemptAt || 0).getTime();
  return isFinite(attemptTime) && attemptTime >= rotationTime;
}

function isBackfillRotationComplete_(sources, rotationStartedAt) {
  if (!rotationStartedAt) return false;
  return (sources || []).every(function(source) {
    return sourceAccountedForBackfill_(source, rotationStartedAt);
  });
}

function getJobDriveBackfillStatus() {
  var properties = discoveryBackfillProperties_();
  var sources = loadDiscoverySources_();
  var rotationStartedAt = properties.getProperty(JOBDRIVE_ROTATION_STARTED_AT_) || "";
  var accounted = sources.filter(function(source){ return sourceAccountedForBackfill_(source, rotationStartedAt); }).length;
  return {
    active: discoveryBackfillBool_(properties.getProperty(JOBDRIVE_BACKFILL_ACTIVE_)),
    startedAt: properties.getProperty(JOBDRIVE_BACKFILL_STARTED_AT_) || "",
    completedAt: properties.getProperty(JOBDRIVE_BACKFILL_COMPLETED_AT_) || "",
    rotationStartedAt: rotationStartedAt,
    totalSources: sources.length,
    accountedSources: accounted,
    complete: Boolean(rotationStartedAt) && isBackfillRotationComplete_(sources, rotationStartedAt)
  };
}

function runJobDriveBackfillBatch(now) {
  var date = discoveryBackfillNow_(now);
  var properties = discoveryBackfillProperties_();
  if (!discoveryBackfillBool_(properties.getProperty(JOBDRIVE_BACKFILL_ACTIVE_))) {
    return Object.assign({ran:false}, getJobDriveBackfillStatus());
  }
  var rotationStartedAt = properties.getProperty(JOBDRIVE_ROTATION_STARTED_AT_) || properties.getProperty(JOBDRIVE_BACKFILL_STARTED_AT_);
  var summary = runDiscoveryBatch_({mode:"backfill", now:date, rotationStartedAt:rotationStartedAt});
  var sources = loadDiscoverySources_();
  var complete = isBackfillRotationComplete_(sources, rotationStartedAt);
  if (complete) {
    properties.setProperty(JOBDRIVE_BACKFILL_ACTIVE_, "false");
    properties.setProperty(JOBDRIVE_BACKFILL_COMPLETED_AT_, date.toISOString());
  }
  return Object.assign({ran:true, complete:complete}, summary);
}

function resetJobDriveBackfillState() {
  var properties = discoveryBackfillProperties_();
  [JOBDRIVE_BACKFILL_ACTIVE_, JOBDRIVE_BACKFILL_STARTED_AT_, JOBDRIVE_BACKFILL_COMPLETED_AT_, JOBDRIVE_ROTATION_STARTED_AT_].forEach(function(key) {
    properties.deleteProperty(key);
  });
  loadDiscoverySources_().forEach(function(source) {
    if (!source.cursor) return;
    source.cursor = "";
    upsertDiscoverySource_(source);
  });
  return getJobDriveBackfillStatus();
}
