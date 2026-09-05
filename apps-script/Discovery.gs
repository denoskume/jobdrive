var DISCOVERY_RUNTIME_BUDGET_MS = 240000;

function discoveryLocationText_(c){
  return [c.location,c.country].join(" ").toLowerCase();
}
function discoveryInternshipText_(c){
  return [c.role,c.contract].join(" ").toLowerCase();
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
  var fr=/france|paris|nantes|lyon|toulouse|bordeaux|grenoble|sophia antipolis|lille|rennes|marseille|aix-en-provence|montpellier|strasbourg/.test(locationText);
  if (!fr) return {accepted:false,reason:"country"};

  var internshipText=discoveryInternshipText_(c);
  if (/alternance|apprenticeship|apprenti|permanent|\bcdi\b|\bphd\b|cifre|postdoc/.test(internshipText)) return {accepted:false,reason:"internship_type"};
  if (!/\binternship\b|\bintern\b|\bstage\b|\bstagiaire\b|\bfin d['’]études\b|\bfin d'etudes\b|\bpfe\b/.test(internshipText)) return {accepted:false,reason:"internship_type"};
  if (!discoveryDurationCompatible_(c)) return {accepted:false,reason:"internship_duration"};

  return {accepted:true,reason:"accepted"};
}

function createDiscoveryRunSummary_(){
  return {startedAt:new Date().toISOString(),finishedAt:"",sourcesAttempted:0,sourcesSucceeded:0,rawJobsFound:0,normalizedJobs:0,rejectedByCountry:0,rejectedByInternshipType:0,rejectedByAcademicPolicy:0,rejectedByTechnicalAlignment:0,rejectedByScore:0,duplicatesSkipped:0,inserted:0,updated:0,sourceErrors:[],sourceHealth:[],runtimeBudgetMs:DISCOVERY_RUNTIME_BUDGET_MS,runtimeBudgetReached:false,sourcesSkippedByBudget:0};
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

function runJobDriveDiscovery() {
  var startedMs=Date.now();
  var summary=createDiscoveryRunSummary_();
  var sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if(!sheet) throw new Error("Sheet not found");
  ensureDiscoveryScoringHeaders_(sheet);
  var index=loadExistingDiscoveryIndex_(sheet);

  seedDiscoveryRegistry_();
  var registeredSources=loadDiscoverySources_();
  var activeSources=registeredSources.filter(function(s){return s.active&&s.verificationStatus==="verified";});

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
    try {
      var result=discoverSourceJobs_(source);
      var elapsedMs=Date.now()-sourceStartedMs;
      if(result.status==="fetch_error"){
        summary.sourceErrors.push({source:source.sourceKey||source.key,error:result.error});
        summary.sourceHealth.push(sourceHealthEntry_(source,"fetch_error",0,elapsedMs,result.error));
        continue;
      }
      if(result.status==="unsupported"){
        summary.sourceHealth.push(sourceHealthEntry_(source,"unsupported",0,elapsedMs,""));
        continue;
      }

      summary.sourcesSucceeded++;
      summary.rawJobsFound+=result.jobs.length;
      summary.sourceHealth.push(sourceHealthEntry_(source,result.jobs.length?"ok":"empty",result.jobs.length,elapsedMs,""));

      result.jobs.forEach(function(raw){
        var c=normalizeDiscoveryCandidate_(raw,source); summary.normalizedJobs++;
        var e=evaluateDiscoveryCandidate_(c);
        if(!e.accepted){
          if(e.reason==="country") summary.rejectedByCountry++;
          else if(e.reason==="internship_type"||e.reason==="internship_duration") summary.rejectedByInternshipType++;
          else summary.rejectedByTechnicalAlignment++;
          return;
        }

        var scored=scoreInternshipCandidate_(c,new Date().toISOString());
        if(!scored.accepted){
          if(scored.rejectionReason==="internship_type"||scored.rejectionReason==="internship_duration") summary.rejectedByInternshipType++;
          else if(scored.rejectionReason==="academic_policy") summary.rejectedByAcademicPolicy++;
          else summary.rejectedByTechnicalAlignment++;
          return;
        }

        if(scored.fitScore<75){ summary.rejectedByScore++; return; }
        var action=upsertDiscoveredCandidate_(sheet,c,scored,index);
        if(action==="inserted") summary.inserted++;
        else if(action==="updated") summary.updated++;
        else summary.duplicatesSkipped++;
      });
    } catch(error){
      var message=String(error&&error.message||error);
      summary.sourceErrors.push({source:source.sourceKey||source.key,error:message});
      summary.sourceHealth.push(sourceHealthEntry_(source,"fetch_error",0,Date.now()-sourceStartedMs,message));
    }
  }

  summary.finishedAt=new Date().toISOString();
  console.log(JSON.stringify(summary));
  return summary;
}

function removeJobDriveDiscoveryTriggers(){ ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()==="runJobDriveDiscovery") ScriptApp.deleteTrigger(t); }); }
function installJobDriveDiscoveryTrigger(){ removeJobDriveDiscoveryTriggers(); return ScriptApp.newTrigger("runJobDriveDiscovery").timeBased().everyHours(12).create(); }
