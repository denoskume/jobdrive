import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load() {
  const context = {console};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("apps-script/DiscoveryProvenance.gs", "utf8"), context);
  return context;
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
