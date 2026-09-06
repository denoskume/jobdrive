var TARGET_COMPANY_SHEET_NAME_ = "Target Companies";
var TARGET_COMPANY_HEADERS_ = [
  "companyKey", "companyName", "companyClass", "priorityTier", "sector",
  "specializations", "francePresence", "officialDomain", "careersUrl", "aliases",
  "sourceKeys", "coverageStatus", "coverageReason", "lastCoveredAt",
  "lastMarketObservedAt", "lastSeenInternshipAt", "activeInternshipCount", "notes"
];

var TARGET_COMPANY_STRATEGIC_FIELDS_ = [
  "companyName", "companyClass", "priorityTier", "sector", "specializations",
  "francePresence", "officialDomain", "careersUrl", "aliases", "sourceKeys"
];

var TARGET_COMPANY_OPERATIONAL_FIELDS_ = [
  "coverageStatus", "coverageReason", "lastCoveredAt", "lastMarketObservedAt",
  "lastSeenInternshipAt", "activeInternshipCount", "notes"
];

function targetCompanyClean_(value) {
  return String(value == null ? "" : value).trim();
}

function targetCompanyNumber_(value, fallback) {
  var parsed = Number(value);
  return isFinite(parsed) ? parsed : fallback;
}

function targetCompanyObjectToRow_(company) {
  company = company || {};
  var normalized = Object.assign({
    companyKey: "",
    companyName: "",
    companyClass: "",
    priorityTier: 3,
    sector: "",
    specializations: "",
    francePresence: "unknown",
    officialDomain: "",
    careersUrl: "",
    aliases: "",
    sourceKeys: "",
    coverageStatus: "uncovered",
    coverageReason: "",
    lastCoveredAt: "",
    lastMarketObservedAt: "",
    lastSeenInternshipAt: "",
    activeInternshipCount: 0,
    notes: ""
  }, company);

  if (!targetCompanyClean_(normalized.coverageStatus)) {
    normalized.coverageStatus = "uncovered";
  }

  return TARGET_COMPANY_HEADERS_.map(function(header) {
    if (header === "priorityTier") return targetCompanyNumber_(normalized[header], 3);
    if (header === "activeInternshipCount") return targetCompanyNumber_(normalized[header], 0);
    return normalized[header] == null ? "" : normalized[header];
  });
}

function targetCompanyRowToObject_(row) {
  var company = {};
  TARGET_COMPANY_HEADERS_.forEach(function(header, index) {
    company[header] = row && row[index] != null ? row[index] : "";
  });
  company.priorityTier = targetCompanyNumber_(company.priorityTier, 3);
  company.activeInternshipCount = targetCompanyNumber_(company.activeInternshipCount, 0);
  company.coverageStatus = targetCompanyClean_(company.coverageStatus) || "uncovered";
  return company;
}

function ensureTargetCompanySheet_() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = book.getSheetByName(TARGET_COMPANY_SHEET_NAME_);
  if (!sheet) sheet = book.insertSheet(TARGET_COMPANY_SHEET_NAME_);

  var current = sheet.getRange(1, 1, 1, TARGET_COMPANY_HEADERS_.length).getDisplayValues()[0] || [];
  var changed = TARGET_COMPANY_HEADERS_.some(function(header, index) {
    return String(current[index] || "") !== header;
  });
  if (changed) {
    sheet.getRange(1, 1, 1, TARGET_COMPANY_HEADERS_.length).setValues([TARGET_COMPANY_HEADERS_]);
  }
  return sheet;
}

function loadTargetCompanies_() {
  var sheet = ensureTargetCompanySheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .filter(function(row) { return targetCompanyClean_(row[0]); })
    .map(targetCompanyRowToObject_);
}

function seedTargetCompanies_() {
  var sheet = ensureTargetCompanySheet_();
  var existingRows = sheet.getDataRange().getDisplayValues();
  var rowByKey = {};

  for (var i = 1; i < existingRows.length; i++) {
    var key = targetCompanyClean_(existingRows[i][0]);
    if (key) rowByKey[key] = i + 1;
  }

  var inserted = 0;
  var patched = 0;
  var seeds = typeof targetCompanySeedRows_ === "function" ? targetCompanySeedRows_() : [];

  seeds.forEach(function(seed) {
    var key = targetCompanyClean_(seed.companyKey);
    if (!key) return;

    var rowNumber = rowByKey[key];
    if (!rowNumber) {
      var newRow = targetCompanyObjectToRow_(seed);
      rowNumber = sheet.getLastRow() + 1;
      sheet.getRange(rowNumber, 1, 1, TARGET_COMPANY_HEADERS_.length).setValues([newRow]);
      rowByKey[key] = rowNumber;
      inserted++;
      return;
    }

    var currentRow = sheet.getRange(rowNumber, 1, 1, TARGET_COMPANY_HEADERS_.length).getDisplayValues()[0] || [];
    var current = targetCompanyRowToObject_(currentRow);
    var next = Object.assign({}, current);
    var changed = false;

    TARGET_COMPANY_STRATEGIC_FIELDS_.forEach(function(field) {
      if (!targetCompanyClean_(current[field]) && targetCompanyClean_(seed[field])) {
        next[field] = seed[field];
        changed = true;
      }
    });

    if (changed) {
      sheet.getRange(rowNumber, 1, 1, TARGET_COMPANY_HEADERS_.length).setValues([targetCompanyObjectToRow_(next)]);
      patched++;
    }
  });

  return {inserted: inserted, patched: patched, total: Object.keys(rowByKey).length};
}

var TARGET_COMPANY_DIRECT_COVERAGE_MS_ = 24 * 60 * 60 * 1000;
var TARGET_COMPANY_MARKET_EVIDENCE_MS_ = 30 * 24 * 60 * 60 * 1000;

function targetCompanyNormalizeName_(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function targetCompanyExplicitBaseName_(value) {
  var text = String(value || "").trim();
  if (!text) return "";
  var match = text.match(/^(.+?)(?:\s*[—–|:/]\s*|\s+-\s+|\s*\().+$/);
  return match ? String(match[1] || "").trim() : "";
}

function targetCompanyNameMatches_(candidateName, opportunityCompany) {
  var normalizedCandidate = targetCompanyNormalizeName_(candidateName);
  var normalizedOpportunity = targetCompanyNormalizeName_(opportunityCompany);
  if (!normalizedCandidate || !normalizedOpportunity) return false;
  if (normalizedOpportunity === normalizedCandidate) return true;

  var explicitBase = targetCompanyExplicitBaseName_(opportunityCompany);
  return Boolean(explicitBase) &&
    targetCompanyNormalizeName_(explicitBase) === normalizedCandidate;
}

function targetCompanyCsv_(value) {
  return String(value || "")
    .split(",")
    .map(function(item) { return String(item || "").trim(); })
    .filter(function(item) { return Boolean(item); });
}

function targetCompanyTime_(value) {
  var time = new Date(value || "").getTime();
  return isFinite(time) ? time : 0;
}

function targetCompanyNormalizeDomain_(value) {
  var text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  text = text.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[\/?#]/)[0];
  return text.replace(/:\d+$/, "");
}

function targetCompanyOpportunityMatches_(company, opportunity) {
  company = company || {};
  opportunity = opportunity || {};

  var companyKey = targetCompanyClean_(company.companyKey);
  if (companyKey && targetCompanyClean_(opportunity.companyKey) === companyKey) return true;

  var mappedSources = targetCompanyCsv_(company.sourceKeys);
  var opportunitySourceKey = targetCompanyClean_(opportunity.sourceKey);
  if (opportunitySourceKey && mappedSources.indexOf(opportunitySourceKey) >= 0) return true;

  var opportunityCompany = targetCompanyClean_(opportunity.company);
  if (opportunityCompany) {
    if (targetCompanyNameMatches_(company.companyName, opportunityCompany)) return true;
    var aliasMatch = targetCompanyCsv_(company.aliases).some(function(alias) {
      return targetCompanyNameMatches_(alias, opportunityCompany);
    });
    if (aliasMatch) return true;
  }

  var officialDomain = targetCompanyNormalizeDomain_(company.officialDomain);
  var opportunityDomain = targetCompanyNormalizeDomain_(opportunity.companyDomain);
  if (officialDomain && opportunityDomain && opportunityDomain === officialDomain) return true;

  return false;
}

function targetCompanyOpportunityActive_(opportunity) {
  opportunity = opportunity || {};
  var trackingStatus = targetCompanyNormalizeName_(opportunity.status);
  if (["accepte", "refuse", "expire"].indexOf(trackingStatus) >= 0) return false;

  var marketStatus = String(opportunity.marketStatus || "").trim().toLowerCase();
  if (["closed", "expired", "removed", "inactive", "archived"].indexOf(marketStatus) >= 0) return false;
  return true;
}

function targetCompanyOpportunityObservedAt_(opportunity) {
  opportunity = opportunity || {};
  var candidates = [
    opportunity.marketLastSeenAt,
    opportunity.detectedAt,
    opportunity.detectedDate,
    opportunity.postedDate
  ];
  for (var i = 0; i < candidates.length; i++) {
    if (targetCompanyTime_(candidates[i])) return new Date(targetCompanyTime_(candidates[i])).toISOString();
  }
  return "";
}

function targetCompanyIsMarketSource_(sourceKey, sourceType) {
  var key = String(sourceKey || "").trim().toLowerCase();
  var type = String(sourceType || "").trim().toLowerCase();
  if (key === "france-travail" || type === "france_travail") return true;
  return false;
}

function recordTargetCompanyMarketObservations_(candidates, nowIso) {
  candidates = Array.isArray(candidates) ? candidates : [];
  nowIso = String(nowIso || new Date().toISOString());
  var marketCandidates = candidates.filter(function(candidate) {
    return targetCompanyIsMarketSource_(candidate && candidate.sourceKey, candidate && candidate.source);
  });
  if (!marketCandidates.length) return {observed: 0};

  var sheet = ensureTargetCompanySheet_();
  var companies = loadTargetCompanies_();
  var rows = sheet.getDataRange().getDisplayValues();
  var rowByKey = {};
  for (var i = 1; i < rows.length; i++) {
    var key = targetCompanyClean_(rows[i][0]);
    if (key) rowByKey[key] = i + 1;
  }

  var observed = 0;
  companies.forEach(function(company) {
    var matched = marketCandidates.some(function(candidate) {
      return targetCompanyOpportunityMatches_(company, candidate);
    });
    if (!matched) return;

    var currentMs = targetCompanyTime_(company.lastMarketObservedAt);
    var observedMs = targetCompanyTime_(nowIso);
    var next = Object.assign({}, company, {
      lastMarketObservedAt: !currentMs || observedMs >= currentMs ? nowIso : company.lastMarketObservedAt
    });
    var rowNumber = rowByKey[company.companyKey];
    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, TARGET_COMPANY_HEADERS_.length)
        .setValues([targetCompanyObjectToRow_(next)]);
      observed++;
    }
  });

  return {observed: observed};
}

function computeTargetCompanyCoverage_(company, sources, opportunities, nowIso) {
  company = company || {};
  sources = sources || [];
  opportunities = opportunities || [];
  var nowMs = targetCompanyTime_(nowIso) || Date.now();
  var mappedSources = targetCompanyCsv_(company.sourceKeys);

  var healthyDirect = sources.filter(function(source) {
    var sourceKey = targetCompanyClean_(source.sourceKey || source.key);
    if (!sourceKey || mappedSources.indexOf(sourceKey) < 0) return false;
    if (source.active !== true) return false;
    if (String(source.verificationStatus || "") !== "verified") return false;
    if (["ok", "empty"].indexOf(String(source.healthState || "")) < 0) return false;
    var lastSuccess = targetCompanyTime_(source.lastSuccessfulScanAt);
    return Boolean(lastSuccess) && nowMs >= lastSuccess &&
      nowMs - lastSuccess <= TARGET_COMPANY_DIRECT_COVERAGE_MS_;
  }).sort(function(a, b) {
    return targetCompanyTime_(b.lastSuccessfulScanAt) - targetCompanyTime_(a.lastSuccessfulScanAt);
  });

  var matching = opportunities.filter(function(opportunity) {
    return targetCompanyOpportunityMatches_(company, opportunity);
  });
  var activeMatching = matching.filter(targetCompanyOpportunityActive_);
  var lastSeen = matching
    .map(targetCompanyOpportunityObservedAt_)
    .filter(function(value) { return Boolean(value); })
    .sort()
    .pop() || "";

  var marketObservedMs = targetCompanyTime_(company.lastMarketObservedAt);
  var hasRecentMarketEvidence = Boolean(marketObservedMs) && nowMs >= marketObservedMs &&
    nowMs - marketObservedMs <= TARGET_COMPANY_MARKET_EVIDENCE_MS_;

  if (healthyDirect.length) {
    return {
      coverageStatus: "covered",
      coverageReason: "direct-source:" + targetCompanyClean_(healthyDirect[0].sourceKey || healthyDirect[0].key),
      lastCoveredAt: new Date(targetCompanyTime_(healthyDirect[0].lastSuccessfulScanAt)).toISOString(),
      lastMarketObservedAt: company.lastMarketObservedAt || "",
      lastSeenInternshipAt: lastSeen,
      activeInternshipCount: activeMatching.length
    };
  }

  if (hasRecentMarketEvidence) {
    return {
      coverageStatus: "partial",
      coverageReason: "recent-market-observation",
      lastCoveredAt: "",
      lastMarketObservedAt: company.lastMarketObservedAt,
      lastSeenInternshipAt: lastSeen,
      activeInternshipCount: activeMatching.length
    };
  }

  return {
    coverageStatus: "uncovered",
    coverageReason: "no-current-evidence",
    lastCoveredAt: "",
    lastMarketObservedAt: company.lastMarketObservedAt || "",
    lastSeenInternshipAt: lastSeen,
    activeInternshipCount: activeMatching.length
  };
}

function loadTargetCompanyOpportunityEvidence_() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) return [];
  var rows = sheet.getDataRange().getDisplayValues();
  return rows.slice(1).filter(function(row) {
    return targetCompanyClean_(row[0]) && targetCompanyClean_(row[2]);
  }).map(function(row) {
    return {
      id: row[0] || "",
      company: row[2] || "",
      status: row[11] || "",
      link: row[15] || "",
      source: row[16] || "",
      detectedAt: row[17] || "",
      marketStatus: row[45] || "",
      marketLastSeenAt: row[46] || "",
      sourceKey: row[47] || ""
    };
  });
}

function refreshTargetCompanyCoverage_(nowIso) {
  nowIso = String(nowIso || new Date().toISOString());
  var sheet = ensureTargetCompanySheet_();
  var companies = loadTargetCompanies_();
  var sources = typeof loadDiscoverySources_ === "function" ? loadDiscoverySources_() : [];
  var opportunities = loadTargetCompanyOpportunityEvidence_();
  var rows = sheet.getDataRange().getDisplayValues();
  var rowByKey = {};
  for (var i = 1; i < rows.length; i++) {
    var key = targetCompanyClean_(rows[i][0]);
    if (key) rowByKey[key] = i + 1;
  }

  var summary = {
    total: companies.length,
    covered: 0,
    partial: 0,
    uncovered: 0,
    activeInternships: 0,
    tier1Total: 0,
    tier1Covered: 0
  };

  companies.forEach(function(company) {
    var operational = computeTargetCompanyCoverage_(company, sources, opportunities, nowIso);
    var next = Object.assign({}, company, operational);
    var rowNumber = rowByKey[company.companyKey];
    if (rowNumber) {
      sheet.getRange(rowNumber, 1, 1, TARGET_COMPANY_HEADERS_.length)
        .setValues([targetCompanyObjectToRow_(next)]);
    }

    summary[operational.coverageStatus]++;
    summary.activeInternships += Number(operational.activeInternshipCount || 0);
    if (Number(company.priorityTier) === 1) {
      summary.tier1Total++;
      if (operational.coverageStatus === "covered") summary.tier1Covered++;
    }
  });

  return summary;
}
