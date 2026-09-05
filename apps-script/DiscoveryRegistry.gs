var DISCOVERY_SOURCE_SHEET_NAME_ = "Discovery Sources";

var DISCOVERY_SOURCE_HEADERS_ = [
  "sourceKey", "company", "sourceType", "tenant", "endpoint",
  "countryScope", "active", "priority", "healthState",
  "verificationStatus", "verifiedAt", "lastAttemptAt",
  "lastSuccessfulScanAt", "lastError", "jobsSeenLastRun",
  "consecutiveFailures", "nextEligibleScanAt", "cursor",
  "discoveredFrom", "notes"
];

var DISCOVERY_SUPPORTED_SOURCE_TYPES_ = [
  "ashby", "greenhouse", "lever", "smartrecruiters", "teamtailor",
  "france_travail", "linkedin_discovery", "indeed_discovery"
];

function discoveryRegistryClean_(value) {
  return String(value == null ? "" : value).trim();
}

function discoveryRegistryBool_(value) {
  if (value === true || value === false) return value;
  return /^(true|1|yes)$/i.test(discoveryRegistryClean_(value));
}

function discoveryRegistryNumber_(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function discoverySeedSources_() {
  var verifiedAt = "2026-09-05T00:00:00.000Z";
  var seeds = [
    ["mistral-ashby", "Mistral AI", "ashby", "mistral.ai"],
    ["datadog-greenhouse", "Datadog", "greenhouse", "datadog"],
    ["doctolib-greenhouse", "Doctolib", "greenhouse", "doctolib"],
    ["backmarket-ashby", "Back Market", "ashby", "backmarket"],
    ["bosch-smartrecruiters", "Bosch France", "smartrecruiters", "BoschGroup"],
    ["visa-smartrecruiters", "Visa", "smartrecruiters", "Visa"],
    ["publicis-smartrecruiters", "Publicis Groupe", "smartrecruiters", "PublicisGroupe"],
    ["alan-ashby", "Alan", "ashby", "alan"],
    ["nabla-ashby", "Nabla", "ashby", "nabla"],
    ["owkin-ashby", "Owkin", "ashby", "owkin"],
    ["pennylane-ashby", "Pennylane", "ashby", "pennylane"],
    ["hcompany-ashby", "H Company", "ashby", "hcompany"],
    ["photoroom-ashby", "Photoroom", "ashby", "photoroom"],
    ["dust-ashby", "Dust", "ashby", "dust"],
    ["gladia-ashby", "Gladia", "ashby", "gladia"],
    ["decathlon-greenhouse", "Decathlon Digital", "greenhouse", "decathlontechnologyen"],
    ["ubisoft-smartrecruiters", "Ubisoft", "smartrecruiters", "Ubisoft2"],
    ["poolside-ashby", "Poolside", "ashby", "poolside"],
    ["dataiku-greenhouse", "Dataiku", "greenhouse", "dataiku"],
    ["blablacar-lever", "BlaBlaCar", "lever", "blablacar"],
    ["pivot-ashby", "Pivot", "ashby", "pivot"]
  ].map(function(row) {
    return {
      sourceKey: row[0], company: row[1], sourceType: row[2], tenant: row[3], endpoint: "",
      countryScope: "GLOBAL", active: true, priority: 80, healthState: "pending",
      verificationStatus: "verified", verifiedAt: verifiedAt, lastAttemptAt: "",
      lastSuccessfulScanAt: "", lastError: "", jobsSeenLastRun: 0, consecutiveFailures: 0,
      nextEligibleScanAt: "", cursor: "", discoveredFrom: "seed", notes: ""
    };
  });

  seeds = seeds.concat([
    {
      sourceKey: "huggingface-greenhouse", company: "Hugging Face", sourceType: "greenhouse",
      tenant: "huggingface", endpoint: "", countryScope: "GLOBAL", active: false, priority: 60,
      healthState: "inactive", verificationStatus: "failed", verifiedAt: verifiedAt,
      lastAttemptAt: "", lastSuccessfulScanAt: "", lastError: "Greenhouse endpoint returned 404 in production run.",
      jobsSeenLastRun: 0, consecutiveFailures: 1, nextEligibleScanAt: "", cursor: "",
      discoveredFrom: "seed", notes: "Greenhouse endpoint returned 404 in production run."
    },
    {sourceKey:"qonto-ashby",company:"Qonto",sourceType:"ashby",tenant:"qonto",endpoint:"",countryScope:"GLOBAL",active:false,priority:60,healthState:"inactive",verificationStatus:"unverified",verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:""},
    {sourceKey:"pigment-ashby",company:"Pigment",sourceType:"ashby",tenant:"pigment",endpoint:"",countryScope:"GLOBAL",active:false,priority:60,healthState:"inactive",verificationStatus:"unverified",verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:""},
    {sourceKey:"contentsquare-greenhouse",company:"Contentsquare",sourceType:"greenhouse",tenant:"contentsquare",endpoint:"",countryScope:"GLOBAL",active:false,priority:60,healthState:"inactive",verificationStatus:"unverified",verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:""},
    {sourceKey:"criteo-greenhouse",company:"Criteo",sourceType:"greenhouse",tenant:"criteo",endpoint:"",countryScope:"GLOBAL",active:false,priority:60,healthState:"inactive",verificationStatus:"unverified",verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:""},
    {sourceKey:"shifttechnology-lever",company:"Shift Technology",sourceType:"lever",tenant:"shifttechnology",endpoint:"",countryScope:"GLOBAL",active:false,priority:60,healthState:"inactive",verificationStatus:"unverified",verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:""},
    {
      sourceKey:"france-travail",company:"France Travail",sourceType:"france_travail",tenant:"",endpoint:"",
      countryScope:"FR",active:true,priority:100,healthState:"pending",verificationStatus:"configuration_required",
      verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,
      consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:"Requires Apps Script credentials."
    },
    {
      sourceKey:"linkedin-market",company:"LinkedIn Jobs",sourceType:"linkedin_discovery",tenant:"",endpoint:"",
      countryScope:"FR",active:true,priority:20,healthState:"restricted",verificationStatus:"restricted",
      verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,
      consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:"No unrestricted public search API assumed."
    },
    {
      sourceKey:"indeed-market",company:"Indeed",sourceType:"indeed_discovery",tenant:"",endpoint:"",
      countryScope:"FR",active:true,priority:20,healthState:"restricted",verificationStatus:"restricted",
      verifiedAt:"",lastAttemptAt:"",lastSuccessfulScanAt:"",lastError:"",jobsSeenLastRun:0,
      consecutiveFailures:0,nextEligibleScanAt:"",cursor:"",discoveredFrom:"seed",notes:"No unrestricted public search API assumed."
    }
  ]);

  return seeds;
}

function validateDiscoverySource_(source) {
  source = source || {};
  var sourceKey = discoveryRegistryClean_(source.sourceKey || source.key);
  var sourceType = discoveryRegistryClean_(source.sourceType || source.type);
  var errors = [];
  if (!sourceKey) errors.push("missing_source_key");
  if (DISCOVERY_SUPPORTED_SOURCE_TYPES_.indexOf(sourceType) < 0) errors.push("unsupported_source_type");
  if ((sourceType === "ashby" || sourceType === "greenhouse" || sourceType === "lever" || sourceType === "smartrecruiters") && !discoveryRegistryClean_(source.tenant)) {
    errors.push("missing_tenant");
  }
  if (sourceType === "teamtailor" && !discoveryRegistryClean_(source.endpoint)) errors.push("missing_endpoint");
  return {valid: errors.length === 0, errors: errors};
}

function discoverySourceToRow_(source) {
  return DISCOVERY_SOURCE_HEADERS_.map(function(header) {
    if (header === "active") return Boolean(source.active);
    if (header === "priority") return discoveryRegistryNumber_(source.priority, 50);
    if (header === "jobsSeenLastRun" || header === "consecutiveFailures") return discoveryRegistryNumber_(source[header], 0);
    return source[header] == null ? "" : source[header];
  });
}

function discoveryRowToSource_(row) {
  var source = {};
  DISCOVERY_SOURCE_HEADERS_.forEach(function(header, index) {
    source[header] = row[index] == null ? "" : row[index];
  });
  source.active = discoveryRegistryBool_(source.active);
  source.priority = discoveryRegistryNumber_(source.priority, 50);
  source.jobsSeenLastRun = discoveryRegistryNumber_(source.jobsSeenLastRun, 0);
  source.consecutiveFailures = discoveryRegistryNumber_(source.consecutiveFailures, 0);
  // Transitional aliases keep existing adapter/test contracts working while the runtime source of truth is the Sheet registry.
  source.key = source.sourceKey;
  source.type = source.sourceType;
  return source;
}

function ensureDiscoveryRegistrySheet_() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = book.getSheetByName(DISCOVERY_SOURCE_SHEET_NAME_);
  if (!sheet) sheet = book.insertSheet(DISCOVERY_SOURCE_SHEET_NAME_);
  var current = sheet.getRange(1, 1, 1, DISCOVERY_SOURCE_HEADERS_.length).getDisplayValues()[0] || [];
  var changed = DISCOVERY_SOURCE_HEADERS_.some(function(header, index) {
    return String(current[index] || "") !== header;
  });
  if (changed) sheet.getRange(1, 1, 1, DISCOVERY_SOURCE_HEADERS_.length).setValues([DISCOVERY_SOURCE_HEADERS_]);
  return sheet;
}

function loadDiscoverySources_() {
  var sheet = ensureDiscoveryRegistrySheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).filter(function(row) { return discoveryRegistryClean_(row[0]); }).map(discoveryRowToSource_);
}

function upsertDiscoverySource_(source) {
  var validation = validateDiscoverySource_(source);
  if (!validation.valid) throw new Error("Invalid discovery source: " + validation.errors.join(","));
  var sheet = ensureDiscoveryRegistrySheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  var key = discoveryRegistryClean_(source.sourceKey || source.key);
  var rowNumber = -1;
  for (var i = 1; i < rows.length; i++) {
    if (discoveryRegistryClean_(rows[i][0]) === key) {
      rowNumber = i + 1;
      break;
    }
  }
  var normalized = Object.assign({}, source, {
    sourceKey: key,
    sourceType: discoveryRegistryClean_(source.sourceType || source.type)
  });
  if (rowNumber < 0) rowNumber = sheet.getLastRow() + 1;
  sheet.getRange(rowNumber, 1, 1, DISCOVERY_SOURCE_HEADERS_.length).setValues([discoverySourceToRow_(normalized)]);
  return rowNumber;
}

function seedDiscoveryRegistry_() {
  var sheet = ensureDiscoveryRegistrySheet_();
  var existing = loadDiscoverySources_();
  var existingKeys = {};
  existing.forEach(function(source) { existingKeys[source.sourceKey] = true; });
  var inserted = 0;
  discoverySeedSources_().forEach(function(source) {
    if (existingKeys[source.sourceKey]) return;
    var validation = validateDiscoverySource_(source);
    if (!validation.valid) return;
    var row = discoverySourceToRow_(source);
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
    existingKeys[source.sourceKey] = true;
    inserted++;
  });
  return {inserted: inserted, total: Object.keys(existingKeys).length};
}
