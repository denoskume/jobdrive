var TARGET_COMPANY_SHEET_NAME_ = "Target Companies";
var TARGET_COMPANY_HEADERS_ = [
  "companyKey", "companyName", "companyClass", "priorityTier", "sector",
  "specializations", "francePresence", "officialDomain", "careersUrl", "aliases",
  "sourceKeys", "coverageStatus", "coverageReason", "lastCoveredAt",
  "lastSeenInternshipAt", "activeInternshipCount", "notes"
];

var TARGET_COMPANY_STRATEGIC_FIELDS_ = [
  "companyName", "companyClass", "priorityTier", "sector", "specializations",
  "francePresence", "officialDomain", "careersUrl", "aliases", "sourceKeys"
];

var TARGET_COMPANY_OPERATIONAL_FIELDS_ = [
  "coverageStatus", "coverageReason", "lastCoveredAt",
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
