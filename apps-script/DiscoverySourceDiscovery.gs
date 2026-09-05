function discoverySourceSlug_(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function discoverSourceCandidateFromUrl_(url, discoveredFrom) {
  var text = String(url || "").trim();
  if (!/^https:\/\//i.test(text)) return null;

  var patterns = [
    {type:"ashby", regex:/^https:\/\/jobs\.ashbyhq\.com\/([^\/?#]+)/i},
    {type:"greenhouse", regex:/^https:\/\/(?:job-boards|boards)\.greenhouse\.io\/([^\/?#]+)/i},
    {type:"lever", regex:/^https:\/\/jobs\.lever\.co\/([^\/?#]+)/i},
    {type:"smartrecruiters", regex:/^https:\/\/jobs\.smartrecruiters\.com\/([^\/?#]+)/i}
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i].regex);
    if (!match) continue;
    var tenant = decodeURIComponent(match[1]);
    return {
      sourceKey: discoverySourceSlug_(tenant) + "-" + patterns[i].type,
      company: tenant,
      sourceType: patterns[i].type,
      tenant: tenant,
      endpoint: "",
      countryScope: "GLOBAL",
      active: false,
      priority: 50,
      healthState: "pending",
      verificationStatus: "unverified",
      verifiedAt: "",
      lastAttemptAt: "",
      lastSuccessfulScanAt: "",
      lastError: "",
      jobsSeenLastRun: 0,
      consecutiveFailures: 0,
      nextEligibleScanAt: "",
      cursor: "",
      discoveredFrom: String(discoveredFrom || "auto-discovery"),
      notes: "Automatically discovered from a supported ATS URL."
    };
  }
  return null;
}

function verifyDiscoveredSource_(source, nowIso) {
  source = Object.assign({}, source || {});
  var now = String(nowIso || new Date().toISOString());
  var result;
  try {
    result = discoverSourcePage_(source, "");
  } catch (error) {
    result = {status:"fetch_error",jobs:[],nextCursor:"",done:false,error:String(error && error.message || error)};
  }

  source.lastAttemptAt = now;
  source.jobsSeenLastRun = Array.isArray(result.jobs) ? result.jobs.length : 0;
  source.lastError = String(result.error || "");
  source.healthState = String(result.status || "fetch_error");

  if (result.status === "ok" || result.status === "empty") {
    source.active = true;
    source.verificationStatus = "verified";
    source.verifiedAt = now;
    source.lastSuccessfulScanAt = now;
    source.lastError = "";
    source.consecutiveFailures = 0;
    source.nextEligibleScanAt = "";
    return source;
  }

  source.active = false;
  source.verificationStatus = result.status === "restricted" ? "restricted" :
    result.status === "configuration_required" ? "configuration_required" : "failed";
  source.consecutiveFailures = Number(source.consecutiveFailures || 0) + (result.status === "fetch_error" ? 1 : 0);
  return source;
}

function registerDiscoveredCareerSource_(url, discoveredFrom) {
  var candidate = discoverSourceCandidateFromUrl_(url, discoveredFrom);
  if (!candidate) return {registered:false, reason:"unsupported_url", source:null};

  var existing = loadDiscoverySources_();
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].sourceKey || "") === candidate.sourceKey) {
      return {registered:false, reason:"already_known", source:existing[i]};
    }
  }

  var validation = validateDiscoverySource_(candidate);
  if (!validation.valid) return {registered:false, reason:validation.errors.join(","), source:null};
  upsertDiscoverySource_(candidate);
  return {registered:true, reason:"registered_unverified", source:candidate};
}

function verifyPendingDiscoverySources_(limit, nowIso) {
  var max = Math.max(0, Number(limit == null ? 5 : limit));
  var sources = loadDiscoverySources_().filter(function(source) {
    return !source.active && source.verificationStatus === "unverified";
  }).slice(0, max);
  var results = [];
  sources.forEach(function(source) {
    var verified = verifyDiscoveredSource_(source, nowIso || new Date().toISOString());
    upsertDiscoverySource_(verified);
    results.push({sourceKey:verified.sourceKey, status:verified.verificationStatus, active:verified.active});
  });
  return results;
}
