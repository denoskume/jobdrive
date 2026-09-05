import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const CLEANUP_PATH = "apps-script/LegacyCleanup.gs";

function row(overrides = {}) {
  const values = Array(45).fill("");
  values[0] = overrides.id || "DISC-TEST";
  values[1] = overrides.type ?? "Stage M2";
  values[2] = overrides.company ?? "Industrial AI Company";
  values[3] = overrides.role ?? "Machine Learning Intern";
  values[4] = overrides.domain ?? "Machine Learning";
  values[5] = overrides.location ?? "Paris, France";
  values[7] = overrides.contract ?? "Internship - 6 months";
  values[11] = overrides.status ?? "Nouveau";
  values[18] = overrides.favorite ?? false;
  values[19] = overrides.appliedDate ?? "";
  values[20] = overrides.followUpDate ?? "";
  values[21] = overrides.notes ?? "";
  values[26] = overrides.descriptionRaw ?? "Six-month machine learning internship using Python and PyTorch.";
  values[28] = overrides.roleMission ?? "Train and evaluate machine learning models.";
  values[29] = overrides.expectations ?? "Final-year MSc student for six months.";
  values[30] = overrides.mustHaveSkills ?? "Python, PyTorch, machine learning";
  values[40] = overrides.lastFollowUp ?? "";
  values[41] = overrides.followUpCount ?? 0;
  return values;
}

class FakeRange {
  constructor(sheet, startRow, startCol, numRows, numCols) {
    this.sheet = sheet;
    this.startRow = startRow;
    this.startCol = startCol;
    this.numRows = numRows;
    this.numCols = numCols;
  }

  getDisplayValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r += 1) {
      const source = this.sheet.rows[this.startRow - 1 + r] || [];
      const current = [];
      for (let c = 0; c < this.numCols; c += 1) {
        const value = source[this.startCol - 1 + c];
        current.push(value == null ? "" : String(value));
      }
      out.push(current);
    }
    return out;
  }

  setValues(values) {
    for (let r = 0; r < values.length; r += 1) {
      const targetIndex = this.startRow - 1 + r;
      while (this.sheet.rows.length <= targetIndex) this.sheet.rows.push([]);
      const target = this.sheet.rows[targetIndex];
      for (let c = 0; c < values[r].length; c += 1) {
        target[this.startCol - 1 + c] = values[r][c];
      }
    }
  }
}

class FakeSheet {
  constructor(name, rows = []) {
    this.name = name;
    this.rows = rows.map((r) => [...r]);
    this.deletedRows = [];
  }

  getName() { return this.name; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return Math.max(1, ...this.rows.map((r) => r.length)); }
  getDataRange() { return new FakeRange(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  getRange(r, c, nr = 1, nc = 1) { return new FakeRange(this, r, c, nr, nc); }
  deleteRow(rowNumber) {
    this.deletedRows.push(rowNumber);
    this.rows.splice(rowNumber - 1, 1);
  }
}

class FakeSpreadsheet {
  constructor(sourceSheet) {
    this.sheets = new Map([[sourceSheet.getName(), sourceSheet]]);
  }

  getSheetByName(name) { return this.sheets.get(name) || null; }
  insertSheet(name) {
    const sheet = new FakeSheet(name, []);
    this.sheets.set(name, sheet);
    return sheet;
  }
}

function loadCleanup(spreadsheet = null) {
  const source = fs.existsSync(CLEANUP_PATH)
    ? fs.readFileSync(CLEANUP_PATH, "utf8")
    : "";
  const context = {
    console,
    Date,
    JSON,
    SPREADSHEET_ID: "sheet-id",
    SHEET_NAME: "Opportunités",
    SpreadsheetApp: {
      openById() {
        if (!spreadsheet) throw new Error("No fake spreadsheet configured");
        return spreadsheet;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: CLEANUP_PATH });
  return context;
}

function headers() {
  return Array.from({ length: 45 }, (_, index) => `col${index + 1}`);
}

test("cleanup marks explicit off-target legacy rows but keeps aligned or uncertain rows", () => {
  const cleanup = loadCleanup();
  assert.equal(typeof cleanup.legacyCleanupRejectionReason_, "function");

  assert.equal(
    cleanup.legacyCleanupRejectionReason_(row({ role: "Founding Customer Success Manager", contract: "Full-time" })),
    "role_out_of_scope"
  );
  assert.equal(
    cleanup.legacyCleanupRejectionReason_(row({ role: "Member of Engineering (Interfaces - Full Stack)", location: "Remote (EMEA/East Coast)", contract: "Full-time" })),
    "location_outside_france"
  );
  assert.equal(
    cleanup.legacyCleanupRejectionReason_(row({ contract: "Internship - 3 months", descriptionRaw: "Three-month ML internship." })),
    "duration_outside_target"
  );
  assert.equal(
    cleanup.legacyCleanupRejectionReason_(row({ company: "Nantes Université", role: "Machine Learning Intern" })),
    "academic_organization"
  );
  assert.equal(cleanup.legacyCleanupRejectionReason_(row()), "");
  assert.equal(
    cleanup.legacyCleanupRejectionReason_(row({ location: "", contract: "", descriptionRaw: "", expectations: "" })),
    ""
  );
});

test("cleanup protects any row with user application or follow-up history", () => {
  const cleanup = loadCleanup();
  assert.equal(typeof cleanup.legacyCleanupProtectionReasons_, "function");

  const protectedFixtures = [
    row({ status: "Candidature envoyée" }),
    row({ favorite: true }),
    row({ appliedDate: "2026-09-01" }),
    row({ followUpDate: "2026-09-10" }),
    row({ notes: "Tailored CV sent" }),
    row({ lastFollowUp: "2026-09-03" }),
    row({ followUpCount: 1 }),
  ];

  for (const fixture of protectedFixtures) {
    assert.ok(cleanup.legacyCleanupProtectionReasons_(fixture).length > 0);
  }
  assert.deepEqual(
    JSON.parse(JSON.stringify(cleanup.legacyCleanupProtectionReasons_(row()))),
    []
  );
});

test("preview reports archiveable and protected out-of-scope rows without modifying the sheet", () => {
  const source = new FakeSheet("Opportunités", [
    headers(),
    row({ id: "BAD-1", role: "Customer Success Intern" }),
    row({ id: "BAD-2", role: "Full Stack Engineering Intern", notes: "Already reviewed" }),
    row({ id: "GOOD-1" }),
  ]);
  const spreadsheet = new FakeSpreadsheet(source);
  const cleanup = loadCleanup(spreadsheet);
  assert.equal(typeof cleanup.previewJobDriveLegacyCleanup, "function");

  const before = JSON.stringify(source.rows);
  const result = cleanup.previewJobDriveLegacyCleanup();

  assert.equal(result.success, true);
  assert.equal(result.scanned, 3);
  assert.equal(result.archiveable, 1);
  assert.equal(result.protected, 1);
  assert.deepEqual(result.archiveableRows.map((item) => item.id), ["BAD-1"]);
  assert.deepEqual(result.protectedRows.map((item) => item.id), ["BAD-2"]);
  assert.equal(JSON.stringify(source.rows), before);
});

test("archive moves only safe rows to an audit sheet and deletes source rows bottom-up", () => {
  const source = new FakeSheet("Opportunités", [
    headers(),
    row({ id: "BAD-1", role: "Customer Success Intern" }),
    row({ id: "GOOD-1" }),
    row({ id: "BAD-2", role: "Full Stack Engineering Intern" }),
    row({ id: "BAD-PROTECTED", role: "Business Development Intern", favorite: true }),
  ]);
  const spreadsheet = new FakeSpreadsheet(source);
  const cleanup = loadCleanup(spreadsheet);
  assert.equal(typeof cleanup.archiveJobDriveLegacyCleanup, "function");

  const result = cleanup.archiveJobDriveLegacyCleanup();
  const archive = spreadsheet.getSheetByName("Archives - Hors cible");

  assert.equal(result.success, true);
  assert.equal(result.archived, 2);
  assert.equal(result.protected, 1);
  assert.deepEqual(source.rows.slice(1).map((r) => r[0]), ["GOOD-1", "BAD-PROTECTED"]);
  assert.deepEqual(source.deletedRows, [4, 2]);
  assert.ok(archive);
  assert.equal(archive.rows[0][45], "archivedAt");
  assert.equal(archive.rows[0][46], "archiveReason");
  assert.equal(archive.rows[0][47], "sourceRow");
  assert.deepEqual(archive.rows.slice(1).map((r) => r[0]), ["BAD-1", "BAD-2"]);
  assert.deepEqual(archive.rows.slice(1).map((r) => r[46]), ["role_out_of_scope", "role_out_of_scope"]);
});
