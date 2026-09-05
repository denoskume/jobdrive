var DISCOVERY_RUNTIME_BUDGET_MS = 240000;

var JOBDRIVE_DISCOVERY_SOURCES_ = [
  {key:"mistral-ashby",company:"Mistral AI",type:"ashby",tenant:"mistral.ai",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"datadog-greenhouse",company:"Datadog",type:"greenhouse",tenant:"datadog",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"doctolib-greenhouse",company:"Doctolib",type:"greenhouse",tenant:"doctolib",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"backmarket-ashby",company:"Back Market",type:"ashby",tenant:"backmarket",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"bosch-smartrecruiters",company:"Bosch France",type:"smartrecruiters",tenant:"BoschGroup",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"visa-smartrecruiters",company:"Visa",type:"smartrecruiters",tenant:"Visa",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"publicis-smartrecruiters",company:"Publicis Groupe",type:"smartrecruiters",tenant:"PublicisGroupe",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"alan-ashby",company:"Alan",type:"ashby",tenant:"alan",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"nabla-ashby",company:"Nabla",type:"ashby",tenant:"nabla",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"owkin-ashby",company:"Owkin",type:"ashby",tenant:"owkin",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"pennylane-ashby",company:"Pennylane",type:"ashby",tenant:"pennylane",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"hcompany-ashby",company:"H Company",type:"ashby",tenant:"hcompany",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"photoroom-ashby",company:"Photoroom",type:"ashby",tenant:"photoroom",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"dust-ashby",company:"Dust",type:"ashby",tenant:"dust",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"gladia-ashby",company:"Gladia",type:"ashby",tenant:"gladia",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"decathlon-greenhouse",company:"Decathlon Digital",type:"greenhouse",tenant:"decathlontechnologyen",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"ubisoft-smartrecruiters",company:"Ubisoft",type:"smartrecruiters",tenant:"Ubisoft2",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"poolside-ashby",company:"Poolside",type:"ashby",tenant:"poolside",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"dataiku-greenhouse",company:"Dataiku",type:"greenhouse",tenant:"dataiku",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"blablacar-lever",company:"BlaBlaCar",type:"lever",tenant:"blablacar",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"pivot-ashby",company:"Pivot",type:"ashby",tenant:"pivot",active:true,verifiedAt:"2026-09-05",verificationStatus:"verified"},
  {key:"huggingface-greenhouse",company:"Hugging Face",type:"greenhouse",tenant:"huggingface",active:false,verifiedAt:"2026-09-05",verificationStatus:"failed",notes:"Greenhouse endpoint returned 404 in production run."},
  {key:"qonto-ashby",company:"Qonto",type:"ashby",tenant:"qonto",active:false,verifiedAt:"",verificationStatus:"unverified"},
  {key:"pigment-ashby",company:"Pigment",type:"ashby",tenant:"pigment",active:false,verifiedAt:"",verificationStatus:"unverified"},
  {key:"contentsquare-greenhouse",company:"Contentsquare",type:"greenhouse",tenant:"contentsquare",active:false,verifiedAt:"",verificationStatus:"unverified"},
  {key:"criteo-greenhouse",company:"Criteo",type:"greenhouse",tenant:"criteo",active:false,verifiedAt:"",verificationStatus:"unverified"},
  {key:"shifttechnology-lever",company:"Shift Technology",type:"lever",tenant:"shifttechnology",active:false,verifiedAt:"",verificationStatus:"unverified"}
];

function discoveryText_(c){ return [c.role,c.location,c.country,c.contract,c.descriptionRaw].join(" ").toLowerCase(); }

function normalizeDiscoveryCandidate_(raw, source) {
  return { sourceKey:source.key, externalId:String(raw.id||raw.externalId||""), company:String(raw.company||source.company||"").trim(), role:String(raw.title||raw.role||"").trim(), location:String(raw.location||raw.locationName||"").trim(), country:String(raw.country||"").trim(), postedDate:String(raw.publishedAt||raw.postedDate||raw.createdAt||"").trim(), deadline:String(raw.deadline||"").trim(), link:String(raw.absoluteUrl||raw.jobUrl||raw.url||raw.applyUrl||"").trim(), source:source.type, descriptionRaw:String(raw.descriptionPlain||raw.description||raw.descriptionHtml||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(), contract:String(raw.employmentType||raw.contract||"").trim(), detectedAt:new Date().toISOString() };
}

function evaluateDiscoveryCandidate_(c) {
  var t=discoveryText_(c);
  if (!/^https?:\/\//i.test(c.link)) return {accepted:false,reason:"missing_url"};
  var fr=/france|paris|nantes|lyon|toulouse|bordeaux|grenoble|sophia antipolis|lille|rennes|marseille|aix-en-provence|montpellier|strasbourg/.test(t);
  if (!fr) return {accepted:false,reason:"country"};
  if (/alternance|apprenticeship|apprenti|permanent|\bcdi\b|\bphd\b|cifre|postdoc/.test(t)) return {accepted:false,reason:"internship_type"};
  if (!/intern|internship|stage|stagiaire|final.?year|fin d['’]études|pfe|6.?month/.test(t)) return {accepted:false,reason:"internship_type"};
  if (/university|université|laboratory|laboratoire|cnrs|inria|doctoral school|école doctorale/.test(t)) return {accepted:false,reason:"academic_policy"};
  if (/power bi|business intelligence|reporting analyst|erp|sap consultant|cybersecurity|qa tester/.test(t)) return {accepted:false,reason:"technical_alignment"};
  var families={"Machine Learning":["machine learning","deep learning","pytorch","tensorflow","jax","representation learning"],"Computer Vision":["computer vision","image processing","opencv","segmentation","object detection","vision transformer"],"Signal Processing":["signal processing","spectral","time-frequency","sensor signal","radar signal"],"Audio / Speech":["speech","audio","acoustic","asr"],"Time Series":["time series","forecasting"],"Medical Imaging":["medical imaging","biomedical signal"],"Remote Sensing":["remote sensing","satellite","geospatial"],"Multimodal / GenAI":["multimodal","vision-language","generative ai","large language model","llm"]};
  var best={family:"",signals:[],score:0};
  Object.keys(families).forEach(function(f){ var signals=families[f].filter(function(x){return t.indexOf(x)>=0;}); var s=Math.min(100,signals.length*28+(signals.length?45:0)); if(s>best.score) best={family:f,signals:signals,score:s}; });
  if (best.score<70) return {accepted:false,reason:"technical_alignment"};
  return {accepted:true,reason:"accepted",technical:best};
}

function scoreDiscoveryCandidate_(c, technical) {
  var t=discoveryText_(c); var score=Math.round(technical.score*.4);
  score += /final.?year|fin d['’]études|pfe|master|6.?month/.test(t)?20:14;
  score += /research|r&d|scientist|model|algorithm|ai|machine learning|vision|signal/.test(t)?15:8;
  score += /pytorch|tensorflow|jax|opencv|train|model|algorithm|experiment/.test(t)?10:4;
  score += 10;
  score += c.postedDate&&c.descriptionRaw?5:c.descriptionRaw?3:1;
  score=Math.min(100,score);
  return {fitScore:score,priority:score>=85?"Haute":score>=75?"Moyenne":"Basse",whyRelevant:technical.family+": "+(technical.signals.slice(0,4).join(", ")||"technical alignment"),domain:technical.family};
}

function createDiscoveryRunSummary_(){
  return {startedAt:new Date().toISOString(),finishedAt:"",sourcesAttempted:0,sourcesSucceeded:0,rawJobsFound:0,normalizedJobs:0,rejectedByCountry:0,rejectedByInternshipType:0,rejectedByAcademicPolicy:0,rejectedByTechnicalAlignment:0,rejectedByScore:0,duplicatesSkipped:0,inserted:0,updated:0,sourceErrors:[],sourceHealth:[],runtimeBudgetMs:DISCOVERY_RUNTIME_BUDGET_MS,runtimeBudgetReached:false,sourcesSkippedByBudget:0};
}

function sourceHealthEntry_(source, status, jobsFound, elapsedMs, error) {
  return {source:source.key,type:source.type,status:status,jobsFound:jobsFound||0,elapsedMs:elapsedMs||0,error:error||""};
}

function runJobDriveDiscovery() {
  var startedMs=Date.now();
  var summary=createDiscoveryRunSummary_();
  var sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if(!sheet) throw new Error("Sheet not found");
  var index=loadExistingDiscoveryIndex_(sheet);
  var activeSources=JOBDRIVE_DISCOVERY_SOURCES_.filter(function(s){return s.active&&s.verificationStatus==="verified";});

  JOBDRIVE_DISCOVERY_SOURCES_.filter(function(s){return !s.active;}).forEach(function(source){
    summary.sourceHealth.push(sourceHealthEntry_(source,"inactive",0,0,""));
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
        summary.sourceErrors.push({source:source.key,error:result.error});
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
          else if(e.reason==="internship_type") summary.rejectedByInternshipType++;
          else if(e.reason==="academic_policy") summary.rejectedByAcademicPolicy++;
          else summary.rejectedByTechnicalAlignment++;
          return;
        }
        var scored=scoreDiscoveryCandidate_(c,e.technical);
        if(scored.fitScore<75){ summary.rejectedByScore++; return; }
        var action=upsertDiscoveredCandidate_(sheet,c,scored,index);
        if(action==="inserted") summary.inserted++;
        else if(action==="updated") summary.updated++;
        else summary.duplicatesSkipped++;
      });
    } catch(error){
      var message=String(error&&error.message||error);
      summary.sourceErrors.push({source:source.key,error:message});
      summary.sourceHealth.push(sourceHealthEntry_(source,"fetch_error",0,Date.now()-sourceStartedMs,message));
    }
  }

  summary.finishedAt=new Date().toISOString();
  console.log(JSON.stringify(summary));
  return summary;
}

function removeJobDriveDiscoveryTriggers(){ ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()==="runJobDriveDiscovery") ScriptApp.deleteTrigger(t); }); }
function installJobDriveDiscoveryTrigger(){ removeJobDriveDiscoveryTriggers(); return ScriptApp.newTrigger("runJobDriveDiscovery").timeBased().everyHours(12).create(); }
