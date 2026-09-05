import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function makeSheet(initialRows) {
  const rows = initialRows.map((row) => [...row]);
  function ensureCell(rowIndex, columnIndex) {
    while (rows.length <= rowIndex) rows.push([]);
    while (rows[rowIndex].length <= columnIndex) rows[rowIndex].push("");
  }
  return {
    rows,
    getDataRange() {
      return { getDisplayValues: () => rows.map((row) => [...row]) };
    },
    getRange(row, column, numRows = 1, numColumns = 1) {
      return {
        getDisplayValues() {
          return Array.from({length:numRows}, (_, rowOffset) =>
            Array.from({length:numColumns}, (_, columnOffset) =>
              rows[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ""
            )
          );
        },
        setValue(value) {
          ensureCell(row - 1, column - 1);
          rows[row - 1][column - 1] = value;
          return this;
        },
        setValues(values) {
          values.forEach((sourceRow, rowOffset) => sourceRow.forEach((value, columnOffset) => {
            ensureCell(row - 1 + rowOffset, column - 1 + columnOffset);
            rows[row - 1 + rowOffset][column - 1 + columnOffset] = value;
          }));
          return this;
        },
      };
    },
    getLastRow() { return rows.length; },
  };
}

function makeContext() {
  const sourceHeader = [
    "canonicalJobId", "sourceKey", "sourceType", "externalId", "sourceUrl",
    "firstSeenAt", "lastSeenAt", "sourceRank", "active", "company", "role",
  ];
  const sourceRow = [
    "JOB-PAGE-1", "france-travail", "france_travail", "FT-001",
    "https://example.test/FT-001", "2026-09-05T10:00:00Z",
    "2026-09-06T09:00:00Z", 20, true, "Acme", "ML Intern",
  ];
  const opportunityHeader = Array(55).fill("header");
  const opportunity = Array(55).fill("");
  opportunity[0] = "JOB-PAGE-1";
  opportunity[11] = "Candidature envoyée";
  opportunity[21] = "keep me";
  opportunity[45] = "Active";
  opportunity[46] = "2026-09-06T09:00:00Z";

  const sheets = {
    "Opportunity Sources": makeSheet([sourceHeader, sourceRow]),
    Opportunités: makeSheet([opportunityHeader, opportunity]),
  };
  const context = {
    console,
    SPREADSHEET_ID: "sheet-id",
    SHEET_NAME: "Opportunités",
    SpreadsheetApp: {
      openById() {
        return {
          getSheetByName(name) { return sheets[name] || null; },
          insertSheet(name) { sheets[name] = makeSheet([]); return sheets[name]; },
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("apps-script/DiscoveryProvenance.gs", "utf8"), context);
  return {context, sheets};
}

test("final page reconciliation preserves a posting seen on an earlier page of the same scan", () => {
  const {context, sheets} = makeContext();
  context.refreshMarketLifecycleForSource_(
    "france-travail",
    [],
    "2026-09-06T10:00:00Z",
    "2026-09-06T08:00:00Z"
  );

  assert.equal(sheets["Opportunity Sources"].rows[1][8], true);
  assert.equal(sheets.Opportunités.rows[1][45], "Active");
  assert.equal(sheets.Opportunités.rows[1][11], "Candidature envoyée");
  assert.equal(sheets.Opportunités.rows[1][21], "keep me");
});

test("runner marks each successful page seen before final absence reconciliation", () => {
  const discovery = fs.readFileSync("apps-script/Discovery.gs", "utf8");
  const markIndex = discovery.indexOf("markSourceListingsSeen_");
  const finalIndex = discovery.indexOf("refreshMarketLifecycleForSource_");
  assert.ok(markIndex >= 0, "page-level seen marking must exist");
  assert.ok(finalIndex > markIndex, "page-level seen marking must precede final reconciliation");
  assert.match(discovery, /discoveryLifecycleScanStartedAt_/);
});
