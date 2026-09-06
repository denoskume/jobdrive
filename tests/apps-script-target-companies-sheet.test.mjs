import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function makeSheet(name) {
  return {
    name,
    values: [],
    getDataRange() {
      return { getDisplayValues: () => this.values.map((row) => [...row]) };
    },
    getLastRow() { return this.values.length; },
    getRange(row, col, numRows, numCols) {
      return {
        getDisplayValues: () => {
          const out = [];
          for (let r = 0; r < numRows; r++) {
            const source = this.values[row - 1 + r] || [];
            const line = [];
            for (let c = 0; c < numCols; c++) line.push(source[col - 1 + c] ?? "");
            out.push(line);
          }
          return out;
        },
        setValues: (rows) => {
          rows.forEach((input, r) => {
            const targetIndex = row - 1 + r;
            while (this.values.length <= targetIndex) this.values.push([]);
            const target = this.values[targetIndex];
            input.forEach((value, c) => { target[col - 1 + c] = value; });
          });
        },
      };
    },
  };
}

function loadTargetCompanyContext() {
  const sheets = new Map();
  const book = {
    getSheetByName(name) { return sheets.get(name) || null; },
    insertSheet(name) { const sheet = makeSheet(name); sheets.set(name, sheet); return sheet; },
  };
  const context = {
    SPREADSHEET_ID: "sheet",
    SpreadsheetApp: { openById() { return book; } },
    __book: book,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("apps-script/TargetCompanySeeds.gs", "utf8"), context);
  vm.runInContext(fs.readFileSync("apps-script/TargetCompanies.gs", "utf8"), context);
  return context;
}

test("target company bootstrap is idempotent and preserves operational fields", () => {
  const context = loadTargetCompanyContext();
  const first = context.seedTargetCompanies_();
  assert.equal(first.inserted, 200);

  const sheet = context.__book.getSheetByName("Target Companies");
  const rows = sheet.getDataRange().getDisplayValues();
  const mistralIndex = rows.findIndex((row) => row[0] === "mistral-ai");
  const coverageStatusColumn = context.TARGET_COMPANY_HEADERS_.indexOf("coverageStatus");
  const notesColumn = context.TARGET_COMPANY_HEADERS_.indexOf("notes");
  rows[mistralIndex][coverageStatusColumn] = "covered";
  rows[mistralIndex][notesColumn] = "manual-note";
  sheet.values = rows;

  const second = context.seedTargetCompanies_();
  assert.equal(second.inserted, 0);

  const persisted = context.loadTargetCompanies_().find((row) => row.companyKey === "mistral-ai");
  assert.equal(persisted.coverageStatus, "covered");
  assert.equal(persisted.notes, "manual-note");
});

test("target company row conversion keeps numeric operational fields numeric", () => {
  const context = loadTargetCompanyContext();
  const row = context.targetCompanyObjectToRow_({
    companyKey: "x", companyName: "X", companyClass: "recognized", priorityTier: 2,
    sector: "AI", specializations: "machine-learning", francePresence: "verified",
    activeInternshipCount: 3,
  });
  const parsed = context.targetCompanyRowToObject_(row);
  assert.equal(parsed.priorityTier, 2);
  assert.equal(parsed.activeInternshipCount, 3);
  assert.equal(parsed.coverageStatus, "uncovered");
});
