function discoveryClean_(value) { return String(value || "").trim(); }
function discoveryUrlKey_(value) {
  return discoveryClean_(value).replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
}
function discoveryFingerprint_(candidate) {
  return [candidate.company, candidate.role, candidate.location].map(function(v){ return discoveryClean_(v).toLowerCase(); }).join("|");
}
function loadExistingDiscoveryIndex_(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  var index = { byUrl:{}, byFingerprint:{} };
  rows.slice(1).forEach(function(row, offset) {
    if (!row[0]) return;
    var rowNumber = offset + 2;
    var url = discoveryUrlKey_(row[15]);
    if (url) index.byUrl[url] = rowNumber;
    index.byFingerprint[[row[2],row[3],row[5]].map(function(v){return discoveryClean_(v).toLowerCase();}).join("|")] = rowNumber;
  });
  return index;
}
function generateDiscoveryJobId_(candidate) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, [candidate.sourceKey,candidate.externalId,candidate.link,candidate.company,candidate.role].join("|"));
  return "DISC-" + digest.slice(0,6).map(function(b){ return (b & 255).toString(16).padStart(2,"0"); }).join("").toUpperCase();
}
function candidateToSheetRow_(candidate, scored) {
  var row = Array(34).fill("");
  row[0] = generateDiscoveryJobId_(candidate);
  row[1] = "Stage M2";
  row[2] = candidate.company;
  row[3] = candidate.role;
  row[4] = scored.domain || "Data Science / Signal / Image / ML / AI";
  row[5] = candidate.location;
  row[7] = candidate.contract || "Stage";
  row[9] = candidate.postedDate || "";
  row[10] = candidate.deadline || "";
  row[11] = "Nouveau";
  row[12] = scored.priority;
  row[13] = scored.fitScore;
  row[14] = scored.whyRelevant;
  row[15] = candidate.link;
  row[16] = candidate.source;
  row[17] = candidate.detectedAt || new Date().toISOString();
  row[18] = false; // favorite
  row[19] = ""; // appliedDate
  row[20] = ""; // followUpDate
  row[21] = ""; // notes
  row[22] = ""; // lastUpdated remains user/runtime owned
  // X:Y:Z remain reserved business data; AA:AH remain description enrichment data.
  return row;
}
function upsertDiscoveredCandidate_(sheet, candidate, scored, index) {
  var urlKey = discoveryUrlKey_(candidate.link);
  var fp = discoveryFingerprint_(candidate);
  var existingRow = (urlKey && index.byUrl[urlKey]) || index.byFingerprint[fp];
  if (existingRow) return "duplicate";
  var row = candidateToSheetRow_(candidate, scored);
  sheet.getRange(sheet.getLastRow()+1, 1, 1, row.length).setValues([row]);
  var insertedRow = sheet.getLastRow();
  if (urlKey) index.byUrl[urlKey] = insertedRow;
  index.byFingerprint[fp] = insertedRow;
  return "inserted";
}
