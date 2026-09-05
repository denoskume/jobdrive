var OPPORTUNITY_SOURCES_SHEET_NAME_ = "Opportunity Sources";
var OPPORTUNITY_SOURCE_HEADERS_ = [
  "canonicalJobId", "sourceKey", "sourceType", "externalId", "sourceUrl",
  "firstSeenAt", "lastSeenAt", "sourceRank", "active", "company", "role"
];

function discoveryProvenanceClean_(value) {
  return String(value == null ? "" : value).trim();
}

function discoverySourceRank_(candidate) {
  candidate = candidate || {};
  var source = discoveryProvenanceClean_(candidate.source || candidate.sourceType).toLowerCase();
  var link = discoveryProvenanceClean_(candidate.link || candidate.sourceUrl).toLowerCase();
  if (["ashby", "greenhouse", "lever", "smartrecruiters", "teamtailor", "workday", "successfactors", "recruitee"].indexOf(source) >= 0) return 30;
  if (source === "france_travail") {
    if (link && !/francetravail\.fr|pole-emploi\.fr/.test(link)) return 25;
    return 20;
  }
  if (source === "linkedin_discovery" || source === "indeed_discovery" || source === "aggregator") return 10;
  return 15;
}

function preferredCanonicalCandidate_(existing, incoming) {
  existing = existing || {};
  incoming = incoming || {};
  var existingRank = discoverySourceRank_(existing);
  var incomingRank = discoverySourceRank_(incoming);
  if (!discoveryProvenanceClean_(existing.link)) return incoming;
  if (!discoveryProvenanceClean_(incoming.link)) return existing;
  return incomingRank > existingRank ? incoming : existing;
}

function buildOpportunitySourceRecord_(canonicalJobId, candidate) {
  candidate = candidate || {};
  var seenAt = discoveryProvenanceClean_(candidate.detectedAt) || new Date().toISOString();
  return {
    canonicalJobId: discoveryProvenanceClean_(canonicalJobId),
    sourceKey: discoveryProvenanceClean_(candidate.sourceKey),
    sourceType: discoveryProvenanceClean_(candidate.source || candidate.sourceType),
    externalId: discoveryProvenanceClean_(candidate.externalId),
    sourceUrl: discoveryProvenanceClean_(candidate.link),
    firstSeenAt: seenAt,
    lastSeenAt: seenAt,
    sourceRank: discoverySourceRank_(candidate),
    active: true,
    company: discoveryProvenanceClean_(candidate.company),
    role: discoveryProvenanceClean_(candidate.role)
  };
}

function buildCanonicalRefreshPatch_(existing, incoming, scored) {
  existing = existing || {};
  incoming = incoming || {};
  scored = scored || {};
  var patch = {};
  var chosen = preferredCanonicalCandidate_(existing, incoming);
  var incomingChosen = chosen === incoming;
  var seenAt = discoveryProvenanceClean_(incoming.detectedAt) || new Date().toISOString();

  if (incomingChosen) {
    patch[15] = discoveryProvenanceClean_(incoming.link);
    patch[16] = discoveryProvenanceClean_(incoming.source || incoming.sourceType);
    patch[47] = discoveryProvenanceClean_(incoming.sourceKey);
  }
  patch[45] = "Active";
  patch[46] = seenAt;
  if (scored.internshipEvidence != null) patch[49] = scored.internshipEvidence || "";
  if (scored.locationEvidence != null) patch[50] = scored.locationEvidence || "";
  if (scored.durationEvidence != null) patch[51] = scored.durationEvidence || "";
  if (scored.industryEvidence != null) patch[52] = scored.industryEvidence || "";
  if (scored.domainEvidence != null) patch[53] = JSON.stringify(scored.domainEvidence || []);
  if (scored.timingEvidence != null) patch[54] = scored.timingEvidence || "";
  return patch;
}

function ensureOpportunitySourcesSheet_() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = book.getSheetByName(OPPORTUNITY_SOURCES_SHEET_NAME_);
  if (!sheet) sheet = book.insertSheet(OPPORTUNITY_SOURCES_SHEET_NAME_);
  var current = sheet.getRange(1, 1, 1, OPPORTUNITY_SOURCE_HEADERS_.length).getDisplayValues()[0] || [];
  var changed = OPPORTUNITY_SOURCE_HEADERS_.some(function(header, index) {
    return String(current[index] || "") !== header;
  });
  if (changed) sheet.getRange(1, 1, 1, OPPORTUNITY_SOURCE_HEADERS_.length).setValues([OPPORTUNITY_SOURCE_HEADERS_]);
  return sheet;
}

function opportunitySourceRecordToRow_(record) {
  return OPPORTUNITY_SOURCE_HEADERS_.map(function(header) {
    return record[header] == null ? "" : record[header];
  });
}

function recordOpportunitySource_(canonicalJobId, candidate) {
  var sheet = ensureOpportunitySourcesSheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  var record = buildOpportunitySourceRecord_(canonicalJobId, candidate);
  var matchRow = -1;
  var sourceCount = 0;
  var seenKeys = {};

  for (var i = 1; i < rows.length; i++) {
    if (discoveryProvenanceClean_(rows[i][0]) !== record.canonicalJobId) continue;
    var key = discoveryProvenanceClean_(rows[i][1]) + "|" + discoveryProvenanceClean_(rows[i][3]) + "|" + discoveryProvenanceClean_(rows[i][4]);
    if (!seenKeys[key]) {
      seenKeys[key] = true;
      sourceCount++;
    }
    if (
      discoveryProvenanceClean_(rows[i][1]) === record.sourceKey &&
      discoveryProvenanceClean_(rows[i][3]) === record.externalId &&
      discoveryProvenanceClean_(rows[i][4]) === record.sourceUrl
    ) matchRow = i + 1;
  }

  if (matchRow > 0) {
    sheet.getRange(matchRow, 7).setValue(record.lastSeenAt);
    sheet.getRange(matchRow, 9).setValue(true);
    return {inserted:false, sourceCount:Math.max(1, sourceCount)};
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, 1, OPPORTUNITY_SOURCE_HEADERS_.length).setValues([opportunitySourceRecordToRow_(record)]);
  return {inserted:true, sourceCount:sourceCount + 1};
}

function opportunitySourceIdsForSource_(sourceKey) {
  var sheet = ensureOpportunitySourcesSheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  var result = {};
  rows.slice(1).forEach(function(row) {
    if (discoveryProvenanceClean_(row[1]) !== discoveryProvenanceClean_(sourceKey)) return;
    if (!/^true$/i.test(String(row[8] || "true"))) return;
    result[discoveryProvenanceClean_(row[0])] = true;
  });
  return result;
}

function markOpportunitySourceInactive_(canonicalJobId, sourceKey) {
  var sheet = ensureOpportunitySourcesSheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (discoveryProvenanceClean_(rows[i][0]) !== discoveryProvenanceClean_(canonicalJobId)) continue;
    if (discoveryProvenanceClean_(rows[i][1]) !== discoveryProvenanceClean_(sourceKey)) continue;
    sheet.getRange(i + 1, 9).setValue(false);
  }
}

function lifecycleSeenListing_(value) {
  if (value && typeof value === "object") {
    var objectId = discoveryProvenanceClean_(value.id || value.externalId);
    var objectStatus = discoveryProvenanceClean_(value.status || value.state || value.lifecycleStatus).toLowerCase();
    return {
      id: objectId,
      closed: /^(closed|expired|inactive|removed|filled|archived)$/.test(objectStatus)
    };
  }
  return {id: discoveryProvenanceClean_(value), closed: false};
}

function markSourceListingsSeen_(sourceKey, seenProviderIds, nowIso) {
  sourceKey = discoveryProvenanceClean_(sourceKey);
  nowIso = discoveryProvenanceClean_(nowIso) || new Date().toISOString();
  var seen = {};
  var explicitlyClosed = {};

  (seenProviderIds || []).forEach(function(value) {
    var listing = lifecycleSeenListing_(value);
    if (!listing.id) return;
    seen[listing.id] = true;
    if (listing.closed) explicitlyClosed[listing.id] = true;
  });

  var sheet = ensureOpportunitySourcesSheet_();
  var rows = sheet.getDataRange().getDisplayValues();
  var touchedCanonicalIds = {};
  var closedCanonicalIds = {};

  for (var i = 1; i < rows.length; i++) {
    if (discoveryProvenanceClean_(rows[i][1]) !== sourceKey) continue;
    var externalId = discoveryProvenanceClean_(rows[i][3]);
    if (!seen[externalId]) continue;
    var canonicalJobId = discoveryProvenanceClean_(rows[i][0]);
    touchedCanonicalIds[canonicalJobId] = true;
    sheet.getRange(i + 1, 7).setValue(nowIso);
    if (explicitlyClosed[externalId]) {
      sheet.getRange(i + 1, 9).setValue(false);
      closedCanonicalIds[canonicalJobId] = true;
    } else {
      sheet.getRange(i + 1, 9).setValue(true);
    }
  }

  return {
    seenExternalIds: seen,
    explicitlyClosedExternalIds: explicitlyClosed,
    touchedCanonicalIds: touchedCanonicalIds,
    closedCanonicalIds: closedCanonicalIds
  };
}

function updateOpportunityMarketLifecycle_(canonicalJobId, marketStatus, marketLastSeenAt) {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) return false;
  var rows = sheet.getDataRange().getDisplayValues();
  for (var i = 1; i < rows.length; i++) {
    if (discoveryProvenanceClean_(rows[i][0]) !== discoveryProvenanceClean_(canonicalJobId)) continue;
    sheet.getRange(i + 1, 46).setValue(marketStatus);
    if (marketLastSeenAt) sheet.getRange(i + 1, 47).setValue(marketLastSeenAt);
    return true;
  }
  return false;
}

function refreshMarketLifecycleForSource_(sourceKey, seenProviderIds, nowIso) {
  sourceKey = discoveryProvenanceClean_(sourceKey);
  nowIso = discoveryProvenanceClean_(nowIso) || new Date().toISOString();
  var marked = markSourceListingsSeen_(sourceKey, seenProviderIds, nowIso);
  var sourceSheet = ensureOpportunitySourcesSheet_();
  var rows = sourceSheet.getDataRange().getDisplayValues();
  var touchedCanonicalIds = {};

  for (var i = 1; i < rows.length; i++) {
    if (discoveryProvenanceClean_(rows[i][1]) !== sourceKey) continue;
    var canonicalJobId = discoveryProvenanceClean_(rows[i][0]);
    var externalId = discoveryProvenanceClean_(rows[i][3]);
    touchedCanonicalIds[canonicalJobId] = true;
    if (!marked.seenExternalIds[externalId]) {
      sourceSheet.getRange(i + 1, 9).setValue(false);
    }
  }

  rows = sourceSheet.getDataRange().getDisplayValues();
  var summaries = {};
  rows.slice(1).forEach(function(row) {
    var canonicalJobId = discoveryProvenanceClean_(row[0]);
    if (!touchedCanonicalIds[canonicalJobId]) return;
    if (!summaries[canonicalJobId]) summaries[canonicalJobId] = {active:false,lastSeenAt:""};
    if (/^true$/i.test(String(row[8] || ""))) summaries[canonicalJobId].active = true;
    var lastSeenAt = discoveryProvenanceClean_(row[6]);
    if (lastSeenAt && lastSeenAt > summaries[canonicalJobId].lastSeenAt) summaries[canonicalJobId].lastSeenAt = lastSeenAt;
  });

  var updated = 0;
  Object.keys(touchedCanonicalIds).forEach(function(canonicalJobId) {
    var summary = summaries[canonicalJobId] || {active:false,lastSeenAt:""};
    var marketStatus = summary.active ? "Active" : (marked.closedCanonicalIds[canonicalJobId] ? "Closed" : "Unknown");
    if (updateOpportunityMarketLifecycle_(canonicalJobId, marketStatus, summary.lastSeenAt || nowIso)) updated++;
  });

  return {
    sourceKey: sourceKey,
    updated: updated,
    seen: Object.keys(marked.seenExternalIds).length,
    closed: Object.keys(marked.closedCanonicalIds).length
  };
}
