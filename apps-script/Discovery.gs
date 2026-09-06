var DISCOVERY_RUNTIME_BUDGET_MS = 240000;
var DISCOVERY_LIFECYCLE_SCAN_PREFIX_ = "JOBDRIVE_DISCOVERY_SCAN_STARTED_";
var DISCOVERY_DESCRIPTION_INTERNSHIP_PATTERNS_ = [
  /\binternship\b/i,
  /\bintern\b/i,
  /\bstagiaire\b/i,
  /\bfin d['’]études\b/i,
  /\bfin d'etudes\b/i,
  /\bpfe\b/i,
  /\bstage\s+(?:de\b|d['’]|en\b|chez\b|au\b|à\b|pour\b|fin\b|\d+\s*(?:mois|months?)\b)/i,
  /\b(?:ce|cet|un|une|notre|votre|le|la)\s+stage\b/i,
  /\b(?:offre|convention|durée|duree|période|periode)\s+(?:de|du)\s+stage\b/i
];

function discoveryLocationText_(c){
  return [c.location,c.country].join(" ").toLowerCase();
}
function discoveryInternshipText_(c){
  return [c.role,c.contract,c.descriptionRaw].join(" ").toLowerCase();
}
function discoveryHasInternshipEvidence_(c){
  var titleOrContract = [c.role,c.contract].join(" ");
  if (/\binternship\b|\bintern\b|\bstage\b|\bstagiaire\b|\bfin d['’]études\b|\bfin d'etudes\b|\bpfe\b/i.test(titleOrContract)) return true;
  var description = String(c.descriptionRaw || "");
  return DISCOVERY_DESCRIPTION_INTERNSHIP_PATTERNS_.some(function(pattern){ return pattern.test(description); });
}
function discoveryDurationText_(c){
  return [c.role,c.contract,c.descriptionRaw].join(" ").toLowerCase();
}
function discoveryDurationCompatible_(c){
  var t=discoveryDurationText_(c);
  var target=/\b(?:5|6)\s*[- ]?(?:month|months|mois)\b|\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\b/i;
  if(target.test(t)) return true;
  var any=/\b(?:[1-9]|1[0-2])\s*[- ]?(?:month|months|mois)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\b/i;
  return !any.test(t);
}

function discoveryLifecycleScanPropertyKey_(sourceKey) {
  return DISCOVERY_LIFECYCLE_SCAN_PREFIX_ + String(sourceKey || "source").replace(/[^a-z0-9_.-]+/gi, "_").slice(0, 120);
}

function discoveryLifecycleScanStartedAt_(source, nowIso) {
  source = source || {};
  nowIso = String(nowIso || new Date().toISOString());
  var cursor = String(source.cursor || "").trim();
  var fallback = cursor ? String(source.lastAttemptAt || nowIso) : nowIso;
  if (typeof PropertiesService === "undefined" || !PropertiesService.getScriptProperties) return fallback;
  var properties = PropertiesService.getScriptProperties();
  var key = discoveryLifecycleScanPropertyKey_(source.sourceKey || source.key || "");
  if (!cursor) {
    properties.setProperty(key, nowIso);
    return nowIso;
  }
  var existing = String(properties.getProperty(key) || "").trim();
  if (existing) return existing;
  properties.setProperty(key, fallback);
  return fallback;
}

function clearDiscoveryLifecycleScanStartedAt_(sourceKey) {
  if (typeof PropertiesService === "undefined" || !PropertiesService.getScriptProperties) return;
  PropertiesService.getScriptProperties().deleteProperty(discoveryLifecycleScanPropertyKey_(sourceKey));
}

function normalizeDiscoveryCandidate_(raw, source) {
  source = source || {};
  return {
    sourceKey:String(source.sourceKey||source.key||"").trim(),
    externalId:String(raw.id||raw.externalId||""),
    company:String(raw.company||source.company||"").trim(),
    role:String(raw.title||raw.role||"").trim(),
    location:String(raw.location||raw.locationName||"").trim(),
    country:String(raw.country||"").trim(),
    postedDate:String(raw.publishedAt||raw.postedDate||raw.createdAt||"").trim(),
    deadline:String(raw.deadline||"").trim(),
    link:String(raw.absoluteUrl||raw.jobUrl||raw.url||raw.applyUrl||"").trim(),
    source:String(source.sourceType||source.type||"").trim(),
    descriptionRaw:String(raw.descriptionPlain||raw.description||raw.descriptionHtml||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),
    contract:String(raw.employmentType||raw.contract||"").trim(),
    compensation:String(raw.compensation||raw.salary||raw.salaryRange||"").trim(),
    detectedAt:new Date().toISOString()
  };
}

function evaluateDiscoveryCandidate_(c) {
  if (!/^https?:\/\//i.test(c.link)) return {accepted:false,reason:"missing_url"};
  var locationText=discoveryLocationText_(c);
  var fr=/france|paris|nantes|lyon|toulouse|bordeaux|grenoble|sophia antipolis|lille|rennes|marseille|aix-en-provence|montpellier|strasbourg|corse|corsica|guadeloupe|martinique|guyane|french guiana|réunion|reunion|mayotte|polynésie française|polynesie francaise|nouvelle-calédonie|nouvelle-caledonie|saint-pierre-et-miquelon/.test(locationText);
  if (!fr) return {accepted:false,reason:"country"};

  var internshipText=discoveryInternshipText_(c);
  if (/alternance|apprenticeship|apprenti|permanent|\bcdi\b|\bphd\b|cifre|postdoc/.test(internshipText)) return {accepted:false,reason:"internship_type"};
  if (!discoveryHasInternshipEvidence_(c)) return {accepted:false,reason:"internship_type"};
  if (!discoveryDurationCompatible_(c)) return {accepted:false,reason:"internship_duration"};

  return {accepted:true,reason:"accepted"};
}

function createDiscoveryRunSummary_(mode, startedAt){
  return {
    mode:mode||"continuous",
    startedAt:startedAt||new Date().toISOString(),
    finishedAt:"",
    sourcesAttempted:0,
    sourcesSucceeded:0,
    rawJobsFound:0,
    normalizedJobs:0,
    rejectedByCountry:0,
    rejectedByInternshipType:0,
    rejectedByAcademicPolicy:0,
    rejectedByTechnicalAlignment:0,
    rejectedByScore:0,
    duplicatesSkipped:0,
    inserted:0,
    updated:0,
    sourceErrors:[],
    sourceHealth:[],
    runtimeBudgetMs:DISCOVERY_RUNTIME_BUDGET_MS,
    runtimeBudgetReached:false,
    sourcesSkippedByBudget:0,
    rotationCompleted:false,
    lastRotationCompletedAt:""
  };
}

function sourceHealthEntry_(source, status, jobsFound, elapsedMs, error) {
  source = source || {};
  return {
    source:source.sourceKey||source.key||"",
    type:source.sourceType||source.type||"",
    status:status,
    jobsFound:jobsFound||0,
    elapsedMs:elapsedMs||0,
    error:error||""
  };
}

function lifecycleListingsFromSourceResult_(jobs) {
  return (jobs || []).map(function(raw) {
    var id = String(raw.id || raw.externalId || "").trim();
    if (!id) return null;
    var status = String(raw.lifecycleStatus || raw.status || raw.state || "").trim();
    if (!status && (raw.closed === true || raw.expired === true)) status = raw.expired === true ? "expired" : "closed";
    return status ? {id:id,status:status} : id;
  }).filter(function(value) { return value != null; });
}

function runDiscoveryBatch_(options) {
  options=options||{};
  var mode=options.mode==="backfill"?"backfill":"continuous";
  var now=options.now instanceof Date?options.now:new Date();
  var nowIso=now.toISOString();
  var startedMs=Date.now();
  var summary=createDiscoveryRunSummary_(mode,nowIso);
  summary.mode=mode;
  var sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if(!sheet) throw new Error("Sheet not found");
  ensureDiscoveryScoringHeaders_(sheet);
  ensureDiscoveryLifecycleHeaders_(sheet);
  var index=loadExistingDiscoveryIndex_(sheet);

  seedDiscoveryRegistry_();
  if(typeof refreshFranceTravailRegistryConfig_==="function") refreshFranceTravailRegistryConfig_();
  verifyPendingDiscoverySources_(5,nowIso);
  var registeredSources=loadDiscoverySources_();
  var activeSources=selectDiscoveryBatch_(registeredSources,nowIso,{
    maxSources:25,
    runtimeBudgetMs:DISCOVERY_RUNTIME_BUDGET_MS,
    mode:mode,
    rotationStartedAt:options.rotationStartedAt||""
  });

  registeredSources.filter(function(s){return !s.active;}).forEach(function(source){
    summary.sourceHealth.push(sourceHealthEntry_(source,"inactive",0,0,""));
  });
  registeredSources.filter(function(s){return s.active&&s.verificationStatus!=="verified";}).forEach(function(source){
    summary.sourceHealth.push(sourceHealthEntry_(source,source.healthState||source.verificationStatus||"pending",0,0,""));
  });

  for(var i=0;i<activeSources.length;i++){
    var source=activeSources[i];
    if(Date.now()-startedMs>=DISCOVERY_RUNTIME_BUDGET_MS){
      summary.runtimeBudgetReached=true;
      summary.sourcesSkippedByBudget=activeSources.length-i;
      break;
    }

    summary.sourcesAttempted++;
    var sourceStartedMs=Date.now();
    var lifecycleScanStartedAt=discoveryLifecycleScanStartedAt_(source,new Date().toISOString());
    var sourceJobsFound=0;
    var sourceSucceeded=false;
    var sourceHealthStatus="";
    var sourceHealthError="";
    try {
      var cursor=String(source.cursor||"").trim();
      var keepPaging=true;
      while(keepPaging){
        if(Date.now()-startedMs>=DISCOVERY_RUNTIME_BUDGET_MS){
          summary.runtimeBudgetReached=true;
          summary.sourcesSkippedByBudget=Math.max(summary.sourcesSkippedByBudget,activeSources.length-i);
          break;
        }

        var result=discoverSourcePage_(source,cursor);
        var pageJobs=Array.isArray(result.jobs)?result.jobs:[];
        persistDiscoverySourceHealth_(source,result,new Date().toISOString());
        source.cursor=result.done===false?String(result.nextCursor||source.cursor||""):String(result.nextCursor||"");

        if(result.status==="fetch_error"){
          sourceHealthStatus="fetch_error";
          sourceHealthError=String(result.error||"");
          summary.sourceErrors.push({source:source.sourceKey||source.key,error:sourceHealthError});
          break;
        }
        if(result.status==="unsupported"||result.status==="restricted"||result.status==="configuration_required"){
          sourceHealthStatus=result.status;
          sourceHealthError=String(result.error||"");
          break;
        }

        sourceSucceeded=true;
        sourceJobsFound+=pageJobs.length;
        summary.rawJobsFound+=pageJobs.length;

        var normalizedPageJobs=pageJobs.map(function(raw){
          return normalizeDiscoveryCandidate_(raw,source);
        });
        if(typeof recordTargetCompanyMarketObservations_==="function"){
          recordTargetCompanyMarketObservations_(normalizedPageJobs,new Date().toISOString());
        }
        normalizedPageJobs.forEach(function(c){
          summary.normalizedJobs++;
          var e=evaluateDiscoveryCandidate_(c);
          if(!e.accepted){
            if(e.reason==="country") summary.rejectedByCountry++;
            else if(e.reason==="internship_type"||e.reason==="internship_duration") summary.rejectedByInternshipType++;
            else summary.rejectedByTechnicalAlignment++;
            return;
          }

          var scored=scoreInternshipCandidateEvidence_(c,new Date().toISOString());
          if(!scored.accepted){
            if(scored.rejectionReason==="internship_type"||scored.rejectionReason==="internship_duration") summary.rejectedByInternshipType++;
            else if(scored.rejectionReason==="academic_policy") summary.rejectedByAcademicPolicy++;
            else summary.rejectedByTechnicalAlignment++;
            return;
          }

          if(scored.fitScore<75){ summary.rejectedByScore++; return; }
          var action=upsertDiscoveredCandidate_(sheet,c,scored,index);
          registerDiscoveredCareerSource_(c.link,source.sourceKey||source.key||"");
          if(action==="inserted") summary.inserted++;
          else if(action==="updated") summary.updated++;
          else summary.duplicatesSkipped++;
        });

        var lifecycleListings=lifecycleListingsFromSourceResult_(pageJobs);
        var lifecycleSeenAt=new Date().toISOString();
        if(typeof markSourceListingsSeen_==="function"){
          markSourceListingsSeen_(source.sourceKey||source.key||"",lifecycleListings,lifecycleSeenAt);
        }

        if(result.done===true && (result.status==="ok"||result.status==="empty") && typeof refreshMarketLifecycleForSource_==="function"){
          refreshMarketLifecycleForSource_(
            source.sourceKey||source.key||"",
            lifecycleListings,
            lifecycleSeenAt,
            lifecycleScanStartedAt
          );
          clearDiscoveryLifecycleScanStartedAt_(source.sourceKey||source.key||"");
        }

        if(mode!=="backfill"||result.done===true){
          keepPaging=false;
        } else {
          var nextCursor=String(result.nextCursor||"").trim();
          if(!nextCursor||nextCursor===cursor){
            keepPaging=false;
          } else {
            cursor=nextCursor;
            source.cursor=nextCursor;
          }
        }
      }

      if(sourceHealthStatus){
        summary.sourceHealth.push(sourceHealthEntry_(source,sourceHealthStatus,sourceJobsFound,Date.now()-sourceStartedMs,sourceHealthError));
      } else if(sourceSucceeded){
        summary.sourcesSucceeded++;
        summary.sourceHealth.push(sourceHealthEntry_(source,sourceJobsFound?"ok":"empty",sourceJobsFound,Date.now()-sourceStartedMs,""));
      }
    } catch(error){
      var message=String(error&&error.message||error);
      persistDiscoverySourceHealth_(source,{status:"fetch_error",jobs:[],error:message},new Date().toISOString());
      summary.sourceErrors.push({source:source.sourceKey||source.key,error:message});
      summary.sourceHealth.push(sourceHealthEntry_(source,"fetch_error",sourceJobsFound,Date.now()-sourceStartedMs,message));
    }
  }

  summary.finishedAt=new Date().toISOString();
  if(mode==="backfill"&&options.rotationStartedAt&&typeof isBackfillRotationComplete_==="function"){
    summary.rotationCompleted=isBackfillRotationComplete_(loadDiscoverySources_(),options.rotationStartedAt);
    if(summary.rotationCompleted) summary.lastRotationCompletedAt=summary.finishedAt;
  }
  if(typeof appendDiscoveryRun_==="function"){
    try {
      appendDiscoveryRun_(summary);
    } catch(auditError) {
      summary.auditError=String(auditError&&auditError.message||auditError);
    }
  }
  console.log(JSON.stringify(summary));
  return summary;
}

function runJobDriveDiscovery() {
  var backfillActive = false;
  if (typeof PropertiesService !== "undefined" && PropertiesService.getScriptProperties) {
    backfillActive = String(PropertiesService.getScriptProperties().getProperty("JOBDRIVE_BACKFILL_ACTIVE") || "").toLowerCase() === "true";
  }
  if (backfillActive && typeof runJobDriveBackfillBatch === "function") {
    return runJobDriveBackfillBatch(new Date());
  }
  return runDiscoveryBatch_({mode:"continuous",now:new Date()});
}

function removeJobDriveDiscoveryTriggers(){ ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()==="runJobDriveDiscovery") ScriptApp.deleteTrigger(t); }); }
function installJobDriveDiscoveryTrigger(){ removeJobDriveDiscoveryTriggers(); return ScriptApp.newTrigger("runJobDriveDiscovery").timeBased().everyHours(12).create(); }
