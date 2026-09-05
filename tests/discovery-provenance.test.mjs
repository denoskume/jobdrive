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
      return {
        getDisplayValues() {
          return rows.map((row) => [...row]);
        },
      };
    },
    getRange(row, column, numRows = 1, numColumns = 1) {
      return {
        getDisplayValues() {
          return Array.from({ length: numRows }, (_, rowOffset) =>
            Array.from({ length: numColumns }, (_, columnOffset) =>
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
          values.forEach((sourceRow, rowOffset) => {
            sourceRow.forEach((value, columnOffset) => {
              ensureCell(row - 1 + rowOffset, column - 1 + columnOffset);
              rows[row - 1 + rowOffset][column - 1 + columnOffset] = value;
            });
          });
          return this;
        },
      };
    },
    getLastRow() {
      return rows.length;
    },
  };
}

function load(overrides = {}) {
  const context = {console, ...overrides};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("apps-script/DiscoveryProvenance.gs", "utf8"), context);
  return context;
}

function lifecycleContext() {
  const provenanceHeader = [
    "canonicalJobId", "sourceKey", "sourceType", "externalId", "sourceUrl",
    "firstSeenAt", "lastSeenAt", "sourceRank", "active", "company", "role",
  ];
  const opportunityHeader = Array(55).fill("header");
  const opportunity = Array(55).fill("");
  opportunity[0] = "JOB-1";
  opportunity[11] = "Entretien";
  opportunity[20] = "2026-09-20";
  opportunity[21] = "previousNotes";
  opportunity[45] = "Active";
  opportunity[46] = "2026-09-05T18:00:00Z";

  const provenance = [
    provenanceHeader,
    [
      "JOB-1",
      "acme-greenhouse",
      "greenhouse",
      "123",
      "https://job-boards.greenhouse.io/acme/jobs/123",
      "2026-09-05T18:00:00Z",
      "2026-09-05T18:00:00Z",
      30,
      true,
      "Acme",
      "ML Intern",
    ],
  ];

  const sheets = {
    "Opportunity Sources": makeSheet(provenance),
    Opportunités: makeSheet([opportunityHeader, opportunity]),
  };

  const context = load({
    SPREADSHEET_ID: "sheet-id",
    SHEET_NAME: "Opportunités",
    SpreadsheetApp: {
      openById() {
        return {
          getSheetByName(name) {
            return sheets[name] || null;
          },
          insertSheet(name) {
            sheets[name] = makeSheet([]);
            return sheets[name];
          },
        };
      },
    },
  });

  return {context, sheets};
}

test("provenance ranks direct employer ATS above national aggregators and restricted discovery sources", () => {
  const c = load();
  assert.equal(c.discoverySourceRank_({source:"ashby", link:"https://jobs.ashbyhq.com/acme/1"}), 30);
  assert.equal(c.discoverySourceRank_({source:"france_travail", link:"https://careers.acme.com/jobs/1"}), 25);
  assert.equal(c.discoverySourceRank_({source:"france_travail", link:"https://candidat.francetravail.fr/offres/recherche/detail/1"}), 20);
  assert.equal(c.discoverySourceRank_({source:"linkedin_discovery", link:"https://linkedin.com/jobs/view/1"}), 10);
});

test("canonical choice prefers official employer URL without weakening same-source stability", () => {
  const c = load();
  const existing = {source:"france_travail", link:"https://candidat.francetravail.fr/offres/recherche/detail/1"};
  const direct = {source:"greenhouse", link:"https://job-boards.greenhouse.io/acme/jobs/1"};
  const chosen = c.preferredCanonicalCandidate_(existing, direct);
  assert.equal(chosen.link, direct.link);
  assert.equal(c.preferredCanonicalCandidate_(direct, existing).link, direct.link);
});

test("opportunity source record keeps canonical job id and source-native identity", () => {
  const c = load();
  const record = JSON.parse(JSON.stringify(c.buildOpportunitySourceRecord_("DISC-ABC", {
    sourceKey:"acme-greenhouse",
    source:"greenhouse",
    externalId:"123",
    link:"https://job-boards.greenhouse.io/acme/jobs/123",
    detectedAt:"2026-09-05T18:00:00Z",
  })));
  assert.equal(record.canonicalJobId, "DISC-ABC");
  assert.equal(record.sourceKey, "acme-greenhouse");
  assert.equal(record.externalId, "123");
  assert.equal(record.sourceRank, 30);
  assert.equal(record.lastSeenAt, "2026-09-05T18:00:00Z");
});

test("DiscoverySheet persists lifecycle and evidence metadata through BC and never invents Stage", () => {
  const sheet = fs.readFileSync("apps-script/DiscoverySheet.gs", "utf8");
  assert.match(sheet, /Array\(55\)\.fill/);
  assert.doesNotMatch(sheet, /candidate\.contract\s*\|\|\s*["']Stage["']/);
  assert.match(sheet, /row\[45\]\s*=\s*["']Active["']/);
  assert.match(sheet, /row\[47\]\s*=\s*candidate\.sourceKey/);
  assert.match(sheet, /row\[49\]\s*=\s*scored\.internshipEvidence/);
  assert.match(sheet, /row\[54\]\s*=\s*scored\.timingEvidence/);
});

test("duplicate refresh helper never writes user tracking columns", () => {
  const c = load();
  const patch = c.buildCanonicalRefreshPatch_(
    {source:"france_travail",link:"https://candidat.francetravail.fr/offres/recherche/detail/1"},
    {sourceKey:"acme-greenhouse",source:"greenhouse",link:"https://job-boards.greenhouse.io/acme/jobs/1",detectedAt:"2026-09-05T18:00:00Z"},
    {internshipEvidence:"title:intern",locationEvidence:"location:france",durationEvidence:"6_months",industryEvidence:"company",domainEvidence:["Machine Learning"],timingEvidence:"unknown"}
  );
  const forbidden = [11,18,19,20,21,22,40,41,42,43,44];
  for (const index of forbidden) assert.equal(Object.hasOwn(patch, index), false, `column index ${index}`);
  assert.equal(patch[15], "https://job-boards.greenhouse.io/acme/jobs/1");
  assert.equal(patch[45], "Active");
});

test("seen posting stays Active and refreshes last seen without touching application history", () => {
  const {context, sheets} = lifecycleContext();
  context.refreshMarketLifecycleForSource_(
    "acme-greenhouse",
    ["123"],
    "2026-09-06T10:00:00Z"
  );

  const sourceRow = sheets["Opportunity Sources"].rows[1];
  const opportunityRow = sheets.Opportunités.rows[1];
  assert.equal(sourceRow[6], "2026-09-06T10:00:00Z");
  assert.equal(sourceRow[8], true);
  assert.equal(opportunityRow[45], "Active");
  assert.equal(opportunityRow[46], "2026-09-06T10:00:00Z");
  assert.equal(opportunityRow[11], "Entretien");
  assert.equal(opportunityRow[20], "2026-09-20");
  assert.equal(opportunityRow[21], "previousNotes");
});

test("posting missing after a successful complete source scan becomes Unknown", () => {
  const {context, sheets} = lifecycleContext();
  context.refreshMarketLifecycleForSource_(
    "acme-greenhouse",
    [],
    "2026-09-06T10:00:00Z"
  );

  assert.equal(sheets["Opportunity Sources"].rows[1][8], false);
  assert.equal(sheets.Opportunités.rows[1][45], "Unknown");
  assert.equal(sheets.Opportunités.rows[1][11], "Entretien");
  assert.equal(sheets.Opportunités.rows[1][21], "previousNotes");
});

test("explicit provider closed state becomes Closed without touching tracking fields", () => {
  const {context, sheets} = lifecycleContext();
  context.refreshMarketLifecycleForSource_(
    "acme-greenhouse",
    [{id:"123", status:"closed"}],
    "2026-09-06T10:00:00Z"
  );

  assert.equal(sheets["Opportunity Sources"].rows[1][8], false);
  assert.equal(sheets.Opportunités.rows[1][45], "Closed");
  assert.equal(sheets.Opportunités.rows[1][20], "2026-09-20");
  assert.equal(sheets.Opportunités.rows[1][21], "previousNotes");
});

test("discovery only refreshes absence lifecycle after a successful complete source page", () => {
  const discovery = fs.readFileSync("apps-script/Discovery.gs", "utf8");
  assert.match(discovery, /result\.done[\s\S]*refreshMarketLifecycleForSource_/);
  assert.match(discovery, /refreshMarketLifecycleForSource_\s*\(\s*source\.sourceKey/);
});
