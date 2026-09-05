function discoveryClean_(value) { return String(value || "").trim(); }
function discoveryUrlKey_(value) {
  return discoveryClean_(value).replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
}
function discoveryFingerprint_(candidate) {
  return [candidate.company, candidate.role, candidate.location].map(function(v){ return discoveryClean_(v).toLowerCase(); }).join("|");
}
function loadExistingDiscoveryIndex_(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  var index = { byUrl:{}, byFingerprint:{}, rowsByNumber:{} };
  rows.slice(1).forEach(function(row, offset) {
    if (!row[0]) return;
    var rowNumber = offset + 2;
    var url = discoveryUrlKey_(row[15]);
    if (url) index.byUrl[url] = rowNumber;
    index.byFingerprint[[row[2],row[3],row[5]].map(function(v){return discoveryClean_(v).toLowerCase();}).join("|")] = rowNumber;
    index.rowsByNumber[rowNumber] = row;
  });
  return index;
}
function ensureDiscoveryScoringHeaders_(sheet) {
  var expected = [
    "scoreGrade",
    "scoreBreakdown",
    "scoringStrengths",
    "scoringWeaknesses",
    "scoringVersion",
    "scoringUpdatedAt"
  ];
  var range = sheet.getRange(1, 35, 1, 6);
  var current = range.getDisplayValues()[0] || [];
  var changed = expected.some(function(value, index) {
    return String(current[index] || "") !== value;
  });
  if (changed) range.setValues([expected]);
}
function ensureDiscoveryLifecycleHeaders_(sheet) {
  var expected = [
    "marketStatus",
    "marketLastSeenAt",
    "canonicalSourceKey",
    "sourceCount",
    "internshipEvidence",
    "locationEvidence",
    "durationEvidence",
    "industryEvidence",
    "domainEvidence",
    "timingEvidence"
  ];
  var range = sheet.getRange(1, 46, 1, 10);
  var current = range.getDisplayValues()[0] || [];
  var changed = expected.some(function(value, index) {
    return String(current[index] || "") !== value;
  });
  if (changed) range.setValues([expected]);
}
function generateDiscoveryJobId_(candidate) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, [candidate.sourceKey,candidate.externalId,candidate.link,candidate.company,candidate.role].join("|"));
  return "DISC-" + digest.slice(0,6).map(function(b){ return (b & 255).toString(16).padStart(2,"0"); }).join("").toUpperCase();
}
function candidateToSheetRow_(candidate, scored) {
  var row = Array(55).fill("");
  var nowIso = candidate.detectedAt || new Date().toISOString();
  row[0] = generateDiscoveryJobId_(candidate);
  row[1] = "Stage M2";
  row[2] = candidate.company;
  row[3] = candidate.role;
  row[4] = scored.domain || "Data Science / Signal / Image / ML / AI";
  row[5] = candidate.location;
  row[7] = candidate.contract || "";
  row[8] = candidate.compensation || "";
  row[9] = candidate.postedDate || "";
  row[10] = candidate.deadline || "";
  row[11] = "Nouveau";
  row[12] = scored.priority;
  row[13] = scored.fitScore;
  row[14] = scored.whyRelevant;
  row[15] = candidate.link;
  row[16] = candidate.source;
  row[17] = nowIso;
  row[18] = false; // favorite
  row[19] = ""; // appliedDate
  row[20] = ""; // followUpDate
  row[21] = ""; // notes
  row[22] = ""; // lastUpdated remains user/runtime owned
  // X:Y:Z remain reserved business data; AA:AH remain description enrichment data.
  row[34] = scored.grade || "";
  row[35] = JSON.stringify(scored.scoreBreakdown || {});
  row[36] = JSON.stringify(scored.strengths || []);
  row[37] = JSON.stringify(scored.weaknesses || []);
  row[38] = scored.scoringVersion || "";
  row[39] = new Date().toISOString();
  // AO:AS remain owned by Phase 2C Action Center.
  row[45] = "Active";
  row[46] = nowIso;
  row[47] = candidate.sourceKey || "";
  row[48] = 1;
  row[49] = scored.internshipEvidence || "";
  row[50] = scored.locationEvidence || "";
  row[51] = scored.durationEvidence || "";
  row[52] = scored.industryEvidence || "";
  row[53] = JSON.stringify(scored.domainEvidence || (scored.domain ? [scored.domain] : []));
  row[54] = scored.timingEvidence || "unknown";
  return row;
}
function applyDiscoveryColumnPatch_(sheet, rowNumber, patch) {
  Object.keys(patch || {}).forEach(function(key) {
    var index = Number(key);
    if (!isFinite(index)) return;
    sheet.getRange(rowNumber, index + 1).setValue(patch[key]);
  });
}
function existingCandidateFromRow_(row) {
  row = row || [];
  return {
    sourceKey: row[47] || "",
    source: row[16] || "",
    link: row[15] || "",
    company: row[2] || "",
    role: row[3] || "",
    location: row[5] || ""
  };
}
function upsertDiscoveredCandidate_(sheet, candidate, scored, index) {
  var urlKey = discoveryUrlKey_(candidate.link);
  var fp = discoveryFingerprint_(candidate);
  var existingRow = (urlKey && index.byUrl[urlKey]) || index.byFingerprint[fp];
  if (existingRow) {
    var existingData = index.rowsByNumber[existingRow] || sheet.getRange(existingRow, 1, 1, 55).getDisplayValues()[0] || [];
    var canonicalJobId = existingData[0];
    var provenance = recordOpportunitySource_(canonicalJobId, candidate);
    var patch = buildCanonicalRefreshPatch_(existingCandidateFromRow_(existingData), candidate, scored);
    patch[48] = Math.max(Number(existingData[48] || 1), Number(provenance.sourceCount || 1));
    // Refresh computed scoring only; never touch L, S:W or AO:AS user/action tracking fields.
    patch[12] = scored.priority || existingData[12] || "";
    patch[13] = scored.fitScore == null ? existingData[13] || "" : scored.fitScore;
    patch[14] = scored.whyRelevant || existingData[14] || "";
    patch[34] = scored.grade || existingData[34] || "";
    patch[35] = JSON.stringify(scored.scoreBreakdown || {});
    patch[36] = JSON.stringify(scored.strengths || []);
    patch[37] = JSON.stringify(scored.weaknesses || []);
    patch[38] = scored.scoringVersion || existingData[38] || "";
    patch[39] = new Date().toISOString();
    applyDiscoveryColumnPatch_(sheet, existingRow, patch);
    var canonicalUrl = patch[15] || existingData[15] || "";
    if (canonicalUrl) index.byUrl[discoveryUrlKey_(canonicalUrl)] = existingRow;
    index.byFingerprint[fp] = existingRow;
    index.rowsByNumber[existingRow] = existingData.map(function(value, i) {
      return Object.prototype.hasOwnProperty.call(patch, i) ? patch[i] : value;
    });
    return "duplicate";
  }
  var row = candidateToSheetRow_(candidate, scored);
  sheet.getRange(sheet.getLastRow()+1, 1, 1, row.length).setValues([row]);
  var insertedRow = sheet.getLastRow();
  recordOpportunitySource_(row[0], candidate);
  if (urlKey) index.byUrl[urlKey] = insertedRow;
  index.byFingerprint[fp] = insertedRow;
  index.rowsByNumber[insertedRow] = row;
  return "inserted";
}
