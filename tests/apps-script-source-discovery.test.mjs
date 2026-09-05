import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(overrides = {}) {
  const code = fs.readFileSync("apps-script/DiscoverySourceDiscovery.gs", "utf8");
  const context = {console, ...overrides};
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

test("source discovery recognizes only explicit supported ATS hosts", () => {
  const c = load();
  const cases = [
    ["https://jobs.ashbyhq.com/acme/abc", "ashby", "acme"],
    ["https://job-boards.greenhouse.io/acme/jobs/123", "greenhouse", "acme"],
    ["https://jobs.lever.co/acme/123", "lever", "acme"],
    ["https://jobs.smartrecruiters.com/Acme/123", "smartrecruiters", "Acme"],
  ];
  for (const [url, type, tenant] of cases) {
    const result = c.discoverSourceCandidateFromUrl_(url, "france-travail");
    assert.equal(result.sourceType, type);
    assert.equal(result.tenant, tenant);
    assert.equal(result.active, false);
    assert.equal(result.verificationStatus, "unverified");
    assert.equal(result.discoveredFrom, "france-travail");
  }
});

test("source discovery rejects arbitrary employer and aggregator URLs", () => {
  const c = load();
  for (const url of [
    "https://careers.acme.com/jobs/1",
    "https://www.linkedin.com/jobs/view/1",
    "https://fr.indeed.com/viewjob?jk=1",
    "javascript:alert(1)",
  ]) {
    assert.equal(c.discoverSourceCandidateFromUrl_(url, "test"), null);
  }
});

test("verification activates only a successfully parsed discovered source", () => {
  const c = load({
    discoverSourcePage_: () => ({status:"ok",jobs:[{id:"1"}],nextCursor:"",done:true,error:""}),
  });
  const source = c.discoverSourceCandidateFromUrl_("https://jobs.ashbyhq.com/acme/abc", "france-travail");
  const verified = c.verifyDiscoveredSource_(source, "2026-09-05T18:00:00Z");
  assert.equal(verified.active, true);
  assert.equal(verified.verificationStatus, "verified");
  assert.equal(verified.healthState, "ok");
  assert.equal(verified.verifiedAt, "2026-09-05T18:00:00Z");
});

test("verification keeps failed endpoints inactive and auditable", () => {
  const c = load({
    discoverSourcePage_: () => ({status:"fetch_error",jobs:[],nextCursor:"",done:false,error:"HTTP 404"}),
  });
  const source = c.discoverSourceCandidateFromUrl_("https://jobs.lever.co/acme/1", "france-travail");
  const verified = c.verifyDiscoveredSource_(source, "2026-09-05T18:00:00Z");
  assert.equal(verified.active, false);
  assert.equal(verified.verificationStatus, "failed");
  assert.equal(verified.lastError, "HTTP 404");
});
