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

  return { book };
}

function loadContext(credentialsConfigured) {
  const store = fakeSpreadsheet();
  const properties = new Map();
  if (credentialsConfigured) {
    properties.set("JOBDRIVE_FT_CLIENT_ID", "test-client");
    properties.set("JOBDRIVE_FT_CLIENT_SECRET", "test-secret");
  }

  const context = {
    SPREADSHEET_ID: "test-spreadsheet",
    SpreadsheetApp: {
      openById() {
        return store.book;
      },
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(key) {
            return properties.get(key) || "";
          },
        };
      },
    },
    console,
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync("apps-script/DiscoveryRegistry.gs", "utf8"), context);
  vm.runInContext(fs.readFileSync("apps-script/DiscoveryFranceTravail.gs", "utf8"), context);
  return context;
}

test("configured France Travail source becomes verified and active", () => {
  const context = loadContext(true);
  context.seedDiscoveryRegistry_();

  assert.equal(typeof context.refreshFranceTravailRegistryConfig_, "function");
  const result = context.refreshFranceTravailRegistryConfig_();
  const source = context.loadDiscoverySources_().find((item) => item.sourceKey === "france-travail");

  assert.equal(result.configured, true);
  assert.equal(source.active, true);
  assert.equal(source.verificationStatus, "verified");
});

test("missing France Travail credentials keep the source blocked", () => {
  const context = loadContext(false);
  context.seedDiscoveryRegistry_();

  assert.equal(typeof context.refreshFranceTravailRegistryConfig_, "function");
  const result = context.refreshFranceTravailRegistryConfig_();
  const source = context.loadDiscoverySources_().find((item) => item.sourceKey === "france-travail");

  assert.equal(result.configured, false);
  assert.equal(source.verificationStatus, "configuration_required");
});
