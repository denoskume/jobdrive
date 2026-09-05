var JOBDRIVE_LEGACY_ARCHIVE_SHEET_ = "Archives - Hors cible";

var LEGACY_CLEANUP_FRANCE_PATTERNS_ = [
  /\bfrance\b/i,
  /\bparis\b/i,
  /\bnantes\b/i,
  /\blyon\b/i,
  /\btoulouse\b/i,
  /\bbordeaux\b/i,
  /\bgrenoble\b/i,
  /\bsophia antipolis\b/i,
  /\blille\b/i,
  /\brennes\b/i,
  /\bmarseille\b/i,
  /\baix-en-provence\b/i,
  /\bmontpellier\b/i,
  /\bstrasbourg\b/i
];

var LEGACY_CLEANUP_FOREIGN_PATTERNS_ = [
  /\bemea\b/i,
  /\beast coast\b/i,
  /\blondon\b/i,
  /\bunited kingdom\b/i,
  /\bberlin\b/i,
  /\bgermany\b/i,
  /\bmadrid\b/i,
  /\bspain\b/i,
  /\bmilan\b/i,
  /\bitaly\b/i,
  /\bunited states\b/i,
  /\busa\b/i,
  /\bindia\b/i,
  /\bbangalore\b/i,
  /\bbengaluru\b/i
];

var LEGACY_CLEANUP_OFF_TARGET_ROLE_PATTERNS_ = [
  /\bcustomer success\b/i,
  /\bcustomer support\b/i,
  /\baccount (manager|executive)\b/i,
  /\bsales\b/i,
  /\bbusiness development\b/i,
  /\bproduct (manager|management)\b/i,
  /\bfull[- ]?stack\b/i,
  /\bfront[- ]?end\b/i,
  /\bback[- ]?end\b/i,
  /\bweb developer\b/i,
  /\bmobile developer\b/i,
  /\bios developer\b/i,
  /\bandroid developer\b/i,
  /\bdevops\b/i,
  /\bsite reliability\b/i,
  /\bsre\b/i,
  /\bpower bi\b/i,
  /\bbusiness intelligence\b/i,
  /\breporting analyst\b/i,
  /\berp\b/i,
  /\bsap consultant\b/i,
  /\bcyber ?security\b/i,
  /\bqa tester\b/i,
  /\bmarketing\b/i
];

var LEGACY_CLEANUP_ACADEMIC_PATTERNS_ = [
  /\buniversity\b/i,
  /université/i,
  /\buniversite\b/i,
  /\bcollege\b/i,
  /\bfaculty\b/i,
  /faculté/i,
  /\bfaculte\b/i,
  /\bgraduate school\b/i,
  /école/i,
  /\becole\b/i,
  /\bcnrs\b/i,
  /\binrae\b/i,
  /\binria\b/i,
  /\binserm\b/i,
  /\bumr\b/i,
  /\blaboratoire\b/i,
  /\blaboratory\b/i,
  /\binstitut curie\b/i,
  /\binstitut imagine\b/i,
  /\binstitut pasteur\b/i,
  /\bcentre de recherche\b/i,
  /\bcenter for research\b/i,
  /\bresearch cent(er|re)\b/i,
  /\bchu\b/i,
  /\bcentre hospitalier universitaire\b/i,
  /\buniversity hospital\b/i
];

var LEGACY_CLEANUP_INTERNSHIP_PATTERNS_ = [
  /\binternship\b/i,
  /\bintern\b/i,
  /\bstage\b/i,
  /\bstagiaire\b/i,
  /\bfin d['’]études\b/i,
  /\bfin d'etudes\b/i,
  /\bpfe\b/i
];

function legacyCleanupMatchesAny_(patterns, value) {
  var text = String(value || "");
  return patterns.some(function(pattern) {
    return pattern.test(text);
  });
}

function legacyCleanupHasInternshipSignal_(row) {
  return legacyCleanupMatchesAny_(
    LEGACY_CLEANUP_INTERNSHIP_PATTERNS_,
    [row[3], row[7]].join(" ")
  );
}

function legacyCleanupDurationReason_(row) {
  var text = [row[3], row[7], row[26], row[29]].join(" ");
  var target = /\b(?:5|6)\s*[- ]?(?:month|months|mois)\b|\b(?:five|six|cinq|six)[ -]?(?:month|months|mois)\b/i;
  if (target.test(text)) return "";

  var any = /\b(?:[1-9]|1[0-2])\s*[- ]?(?:month|months|mois)\b|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)[ -]?(?:month|months|mois)\b/i;
  return any.test(text) ? "duration_outside_target" : "";
}

function legacyCleanupRejectionReason_(row) {
  row = row || [];

  var type = String(row[1] || "").trim();
  if (type && type !== "Stage M2") {
    return "non_m2_type";
  }

  var location = String(row[5] || "");
  if (
    location &&
    legacyCleanupMatchesAny_(LEGACY_CLEANUP_FOREIGN_PATTERNS_, location) &&
    !legacyCleanupMatchesAny_(LEGACY_CLEANUP_FRANCE_PATTERNS_, location)
  ) {
    return "location_outside_france";
  }

  var role = String(row[3] || "");
  if (legacyCleanupMatchesAny_(LEGACY_CLEANUP_OFF_TARGET_ROLE_PATTERNS_, role)) {
    return "role_out_of_scope";
  }

  var contract = String(row[7] || "");
  if (/\b(?:cdi|permanent|alternance|apprentice(?:ship)?|apprenti(?:e)?|ph\.?d|cifre|postdoc(?:toral)?)\b/i.test(contract)) {
    return "contract_not_internship";
  }
  if (/\bfull[- ]?time\b/i.test(contract) && !legacyCleanupHasInternshipSignal_(row)) {
    return "contract_not_internship";
  }

  var durationReason = legacyCleanupDurationReason_(row);
  if (durationReason) return durationReason;

  var organization = String(row[2] || "");
  if (legacyCleanupMatchesAny_(LEGACY_CLEANUP_ACADEMIC_PATTERNS_, organization)) {
    return "academic_organization";
  }

  return "";
}

function legacyCleanupTruthy_(value) {
  if (value === true) return true;
  return ["true", "1", "yes", "oui"].indexOf(String(value || "").trim().toLowerCase()) >= 0;
}

function legacyCleanupProtectionReasons_(row) {
  row = row || [];
  var reasons = [];
  var status = String(row[11] || "").trim();

  if (status !== "Nouveau" && status !== "New") reasons.push("status");
  if (legacyCleanupTruthy_(row[18])) reasons.push("favorite");
  if (String(row[19] || "").trim()) reasons.push("appliedDate");
  if (String(row[20] || "").trim()) reasons.push("followUpDate");
  if (String(row[21] || "").trim()) reasons.push("notes");
  if (String(row[40] || "").trim()) reasons.push("lastFollowUp");
  if (Number(row[41] || 0) > 0) reasons.push("followUpCount");

  return reasons;
}

function legacyCleanupRowSummary_(row, rowNumber, reason, protectionReasons) {
  return {
    rowNumber: rowNumber,
    id: String(row[0] || ""),
    company: String(row[2] || ""),
    role: String(row[3] || ""),
    reason: reason,
    protectionReasons: protectionReasons || []
  };
}

function legacyCleanupScan_() {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return {
      success: false,
      error: "Sheet not found",
      spreadsheet: spreadsheet,
      sheet: null,
      headers: [],
      archiveableRows: [],
      protectedRows: [],
      scanned: 0
    };
  }

  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0] || [];
  var archiveableRows = [];
  var protectedRows = [];
  var scanned = 0;

  values.slice(1).forEach(function(row, offset) {
    if (!String(row[0] || "").trim()) return;
    scanned += 1;

    var reason = legacyCleanupRejectionReason_(row);
    if (!reason) return;

    var protectionReasons = legacyCleanupProtectionReasons_(row);
    var item = legacyCleanupRowSummary_(row, offset + 2, reason, protectionReasons);
    item.row = row.slice();

    if (protectionReasons.length) protectedRows.push(item);
    else archiveableRows.push(item);
  });

  return {
    success: true,
    spreadsheet: spreadsheet,
    sheet: sheet,
    headers: headers,
    scanned: scanned,
    archiveableRows: archiveableRows,
    protectedRows: protectedRows
  };
}

function previewJobDriveLegacyCleanup() {
  var scan = legacyCleanupScan_();
  if (!scan.success) {
    console.log(JSON.stringify({ success:false, error:scan.error }));
    return { success:false, error:scan.error };
  }

  var result = {
    success: true,
    archiveSheet: JOBDRIVE_LEGACY_ARCHIVE_SHEET_,
    scanned: scan.scanned,
    archiveable: scan.archiveableRows.length,
    protected: scan.protectedRows.length,
    archiveableRows: scan.archiveableRows.map(function(item) {
      return legacyCleanupRowSummary_(item.row, item.rowNumber, item.reason, []);
    }),
    protectedRows: scan.protectedRows.map(function(item) {
      return legacyCleanupRowSummary_(item.row, item.rowNumber, item.reason, item.protectionReasons);
    })
  };

  console.log(JSON.stringify(result));
  return result;
}

function ensureLegacyCleanupArchiveSheet_(spreadsheet, headers) {
  var archive = spreadsheet.getSheetByName(JOBDRIVE_LEGACY_ARCHIVE_SHEET_);
  if (!archive) archive = spreadsheet.insertSheet(JOBDRIVE_LEGACY_ARCHIVE_SHEET_);

  if (archive.getLastRow() === 0) {
    var archiveHeaders = headers.slice();
    archiveHeaders.push("archivedAt", "archiveReason", "sourceRow");
    archive.getRange(1, 1, 1, archiveHeaders.length).setValues([archiveHeaders]);
  }

  return archive;
}

function archiveJobDriveLegacyCleanup() {
  var scan = legacyCleanupScan_();
  if (!scan.success) {
    console.log(JSON.stringify({ success:false, error:scan.error }));
    return { success:false, error:scan.error, archived:0, protected:0 };
  }

  if (!scan.archiveableRows.length) {
    var emptyResult = {
      success: true,
      scanned: scan.scanned,
      archived: 0,
      protected: scan.protectedRows.length,
      archiveSheet: JOBDRIVE_LEGACY_ARCHIVE_SHEET_
    };
    console.log(JSON.stringify(emptyResult));
    return emptyResult;
  }

  var archive = ensureLegacyCleanupArchiveSheet_(scan.spreadsheet, scan.headers);
  var archivedAt = new Date().toISOString();
  var archiveRows = scan.archiveableRows.map(function(item) {
    var data = item.row.slice(0, scan.headers.length);
    while (data.length < scan.headers.length) data.push("");
    data.push(archivedAt, item.reason, item.rowNumber);
    return data;
  });

  archive
    .getRange(archive.getLastRow() + 1, 1, archiveRows.length, archiveRows[0].length)
    .setValues(archiveRows);

  scan.archiveableRows
    .map(function(item) { return item.rowNumber; })
    .sort(function(a, b) { return b - a; })
    .forEach(function(rowNumber) {
      scan.sheet.deleteRow(rowNumber);
    });

  var result = {
    success: true,
    scanned: scan.scanned,
    archived: scan.archiveableRows.length,
    protected: scan.protectedRows.length,
    archiveSheet: JOBDRIVE_LEGACY_ARCHIVE_SHEET_,
    archivedRows: scan.archiveableRows.map(function(item) {
      return legacyCleanupRowSummary_(item.row, item.rowNumber, item.reason, []);
    }),
    protectedRows: scan.protectedRows.map(function(item) {
      return legacyCleanupRowSummary_(item.row, item.rowNumber, item.reason, item.protectionReasons);
    })
  };

  console.log(JSON.stringify(result));
  return result;
}
