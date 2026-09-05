var JOBDRIVE_DISCOVERY_SOURCES_ = [
  {key:"mistral-ashby",company:"Mistral AI",type:"ashby",tenant:"mistral.ai",active:true},
  {key:"huggingface-greenhouse",company:"Hugging Face",type:"greenhouse",tenant:"huggingface",active:true},
  {key:"datadog-greenhouse",company:"Datadog",type:"greenhouse",tenant:"datadog",active:true},
  {key:"doctolib-lever",company:"Doctolib",type:"lever",tenant:"doctolib",active:true},
  {key:"backmarket-lever",company:"Back Market",type:"lever",tenant:"backmarket",active:true},
  {key:"bosch-smartrecruiters",company:"Bosch France",type:"smartrecruiters",tenant:"BoschGroup",active:true},
  {key:"visa-smartrecruiters",company:"Visa",type:"smartrecruiters",tenant:"Visa",active:true},
  {key:"publicis-smartrecruiters",company:"Publicis Groupe",type:"smartrecruiters",tenant:"PublicisGroupe",active:true}
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
function createDiscoveryRunSummary_(){ return {startedAt:new Date().toISOString(),finishedAt:"",sourcesAttempted:0,sourcesSucceeded:0,rawJobsFound:0,normalizedJobs:0,rejectedByCountry:0,rejectedByInternshipType:0,rejectedByAcademicPolicy:0,rejectedByTechnicalAlignment:0,rejectedByScore:0,duplicatesSkipped:0,inserted:0,updated:0,sourceErrors:[]}; }
function runJobDriveDiscovery() {
  var summary=createDiscoveryRunSummary_();
  var sheet=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if(!sheet) throw new Error("Sheet not found");
  var index=loadExistingDiscoveryIndex_(sheet);
  JOBDRIVE_DISCOVERY_SOURCES_.filter(function(s){return s.active;}).forEach(function(source){
    summary.sourcesAttempted++;
    try {
      var result=discoverSourceJobs_(source);
      if(result.status==="fetch_error"){ summary.sourceErrors.push({source:source.key,error:result.error}); return; }
      summary.sourcesSucceeded++;
      summary.rawJobsFound+=result.jobs.length;
      result.jobs.forEach(function(raw){
        var c=normalizeDiscoveryCandidate_(raw,source); summary.normalizedJobs++;
        var e=evaluateDiscoveryCandidate_(c);
        if(!e.accepted){ if(e.reason==="country") summary.rejectedByCountry++; else if(e.reason==="internship_type") summary.rejectedByInternshipType++; else if(e.reason==="academic_policy") summary.rejectedByAcademicPolicy++; else summary.rejectedByTechnicalAlignment++; return; }
        var scored=scoreDiscoveryCandidate_(c,e.technical);
        if(scored.fitScore<75){ summary.rejectedByScore++; return; }
        var action=upsertDiscoveredCandidate_(sheet,c,scored,index);
        if(action==="inserted") summary.inserted++; else if(action==="updated") summary.updated++; else summary.duplicatesSkipped++;
      });
    } catch(error){ summary.sourceErrors.push({source:source.key,error:String(error&&error.message||error)}); }
  });
  summary.finishedAt=new Date().toISOString(); console.log(JSON.stringify(summary)); return summary;
}
function removeJobDriveDiscoveryTriggers(){ ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()==="runJobDriveDiscovery") ScriptApp.deleteTrigger(t); }); }
function installJobDriveDiscoveryTrigger(){ removeJobDriveDiscoveryTriggers(); return ScriptApp.newTrigger("runJobDriveDiscovery").timeBased().everyHours(12).create(); }
