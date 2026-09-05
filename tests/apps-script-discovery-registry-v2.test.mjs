import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function fakeSpreadsheet() {
  const sheets = new Map();

  function makeSheet(name) {
    const values = [];
    return {
      name,
      values,
      getDataRange() {
        return { getDisplayValues: () => values.map((row) => [...row]) };
      },
      getLastRow() {
        return values.length;
      },
      getRange(row, column, numRows = 1, numColumns = 1) {
        return {
          setValues(rows) {
            rows.forEach((sourceRow, rowOffset) => {
              const targetIndex = row - 1 + rowOffset;
              values[targetIndex] ||= [];
              sourceRow.forEach((value, colOffset) => {
                values[targetIndex][column - 1 + colOffset] = value;
              });
            });
          },
          getDisplayValues() {
            return Array.from({ length: numRows }, (_, rowOffset) =>
              Array.from({ length: numColumns }, (_, colOffset) =>
                values[row - 1 + rowOffset]?.[column - 1 + colOffset] ?? ""
              )
            );
          },
        };
      },
    };
  }

  const book = {
    getSheetByName(name) {
      return sheets.get(name) || null;
    },
    insertSheet(name) {
      const sheet = makeSheet(name);
      sheets.set(name, sheet);
      return sheet;
    },
  };

  return { book, sheets };
}

function loadRegistry() {
  const code = fs.readFileSync("apps-script/DiscoveryRegistry.gs", "utf8");
  const store = fakeSpreadsheet();
  const context = {
    SPREADSHEET_ID: "test-spreadsheet",
    SpreadsheetApp: {
      openById() {
        return store.book;
      },
    },
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, store };
}

test("Discovery Registry v2 validates supported source types", () => {
  const { context } = loadRegistry();
  assert.equal(context.DISCOVERY_SOURCE_HEADERS_.length, 20);

  const valid = context.validateDiscoverySource_({
    sourceKey: "ft-national",
    company: "France Travail",
    sourceType: "france_travail",
    active: true,
    priority: 100,
  });
  assert.equal(valid.valid, true);

  const invalid = context.validateDiscoverySource_({
    sourceKey: "bad",
    sourceType: "arbitrary_html_scraper",
    active: true,
  });
  assert.equal(invalid.valid, false);
});

test("Discovery Registry v2 seeds national and restricted market sources idempotently", () => {
  const { context, store } = loadRegistry();

  context.seedDiscoveryRegistry_();
  context.seedDiscoveryRegistry_();

  const sheet = store.sheets.get("Discovery Sources");
  assert.ok(sheet);
  const rows = sheet.values.slice(1);
  const byKey = new Map(rows.map((row) => [row[0], row]));

  assert.ok(byKey.has("france-travail"));
  assert.equal(byKey.get("france-travail")[2], "france_travail");

  assert.ok(byKey.has("linkedin-market"));
  assert.equal(byKey.get("linkedin-market")[8], "restricted");
  assert.equal(byKey.get("linkedin-market")[9], "restricted");

  assert.ok(byKey.has("indeed-market"));
  assert.equal(byKey.get("indeed-market")[8], "restricted");
  assert.equal(byKey.get("indeed-market")[9], "restricted");

  const keys = rows.map((row) => row[0]);
  assert.equal(keys.length, new Set(keys).size);
});
