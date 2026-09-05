var DISCOVERY_STALE_SOURCE_MS_ = 24 * 60 * 60 * 1000;

function discoverySchedulerTime_(value) {
  if (!value) return 0;
  var time = new Date(value).getTime();
  return isFinite(time) ? time : 0;
}

function discoverySchedulerEligible_(source, nowIso) {
  if (!source || source.active !== true) return false;
  if (["restricted", "configuration_required", "unsupported"].indexOf(String(source.verificationStatus || "")) >= 0) return false;
  if (String(source.verificationStatus || "") !== "verified") return false;
  var next = discoverySchedulerTime_(source.nextEligibleScanAt);
  var now = discoverySchedulerTime_(nowIso) || Date.now();
  if (next && next > now) return false;
  return true;
}

function discoverySchedulerTier_(source, nowIso) {
  if (String(source.cursor || "").trim()) return 0;
  var now = discoverySchedulerTime_(nowIso) || Date.now();
  var last = discoverySchedulerTime_(source.lastSuccessfulScanAt);
  if (!last || now - last >= DISCOVERY_STALE_SOURCE_MS_) return 1;
  return 2;
}

function selectDiscoveryBatch_(sources, nowIso, options) {
  options = options || {};
  var maxSources = Math.max(1, Number(options.maxSources || 25));
  return (sources || []).filter(function(source) {
    return discoverySchedulerEligible_(source, nowIso);
  }).sort(function(a, b) {
    var tierDelta = discoverySchedulerTier_(a, nowIso) - discoverySchedulerTier_(b, nowIso);
    if (tierDelta) return tierDelta;
    var priorityDelta = Number(b.priority || 0) - Number(a.priority || 0);
    if (priorityDelta) return priorityDelta;
    var aLast = discoverySchedulerTime_(a.lastSuccessfulScanAt);
    var bLast = discoverySchedulerTime_(b.lastSuccessfulScanAt);
    if (aLast !== bLast) return aLast - bLast;
    return String(a.sourceKey || a.key || "").localeCompare(String(b.sourceKey || b.key || ""));
  }).slice(0, maxSources);
}

function nextFailureScanAt_(consecutiveFailures, nowIso) {
  var failures = Math.max(0, Number(consecutiveFailures || 0));
  var hours = Math.min(24, Math.pow(2, Math.min(failures, 4)));
  var base = discoverySchedulerTime_(nowIso) || Date.now();
  return new Date(base + hours * 60 * 60 * 1000).toISOString();
}

function sourceHealthPatch_(source, result, nowIso) {
  source = source || {};
  result = result || {};
  var status = String(result.status || "fetch_error");
  var jobs = Array.isArray(result.jobs) ? result.jobs : [];
  var patch = {
    lastAttemptAt: nowIso,
    healthState: status,
    jobsSeenLastRun: jobs.length,
    lastError: String(result.error || ""),
    cursor: result.done === false ? String(result.nextCursor || source.cursor || "") : String(result.nextCursor || "")
  };

  if (status === "ok" || status === "empty") {
    patch.lastSuccessfulScanAt = nowIso;
    patch.consecutiveFailures = 0;
    patch.nextEligibleScanAt = "";
    patch.lastError = "";
    return patch;
  }

  if (status === "restricted" || status === "configuration_required" || status === "unsupported") {
    patch.consecutiveFailures = Number(source.consecutiveFailures || 0);
    patch.nextEligibleScanAt = "";
    return patch;
  }

  var failures = Number(source.consecutiveFailures || 0) + 1;
  patch.consecutiveFailures = failures;
  patch.nextEligibleScanAt = nextFailureScanAt_(failures, nowIso);
  return patch;
}

function persistDiscoverySourceHealth_(source, result, nowIso) {
  var patch = sourceHealthPatch_(source, result, nowIso);
  var updated = Object.assign({}, source, patch, {
    sourceKey: source.sourceKey || source.key,
    sourceType: source.sourceType || source.type
  });
  upsertDiscoverySource_(updated);
  return updated;
}
