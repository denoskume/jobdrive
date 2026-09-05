import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function response(body, code = 200) {
  return {
    getResponseCode: () => code,
    getContentText: () => JSON.stringify(body),
  };
}

function loadAdapters(handler) {
  const code = fs.readFileSync("apps-script/DiscoveryAdapters.gs", "utf8");
  const context = {
    UrlFetchApp: { fetch: handler },
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

function assertPagedResult(result) {
  assert.ok(["ok", "empty", "fetch_error", "restricted", "configuration_required", "unsupported"].includes(result.status));
  assert.ok(Array.isArray(result.jobs));
  assert.equal(typeof result.nextCursor, "string");
  assert.equal(typeof result.done, "boolean");
  assert.equal(typeof result.error, "string");
}

test("Discovery adapters v2 standardize Ashby Greenhouse Lever SmartRecruiters and Teamtailor", () => {
  const fixtures = [
    {
      source: {sourceType:"ashby", tenant:"acme"},
      handler: () => response({jobs:[{id:"a1",title:"ML Intern",location:"Paris",jobUrl:"https://jobs.ashbyhq.com/acme/a1"}]}),
    },
    {
      source: {sourceType:"greenhouse", tenant:"acme"},
      handler: () => response({jobs:[{id:2,title:"Vision Intern",location:{name:"Lyon, France"},absolute_url:"https://job-boards.greenhouse.io/acme/jobs/2"}]}),
    },
    {
      source: {sourceType:"lever", tenant:"acme"},
      handler: () => response([{id:"l3",text:"Signal Intern",hostedUrl:"https://jobs.lever.co/acme/l3",categories:{location:"Nantes, France",commitment:"Internship"}}]),
    },
    {
      source: {sourceType:"smartrecruiters", tenant:"Acme"},
      handler: () => response({offset:0,limit:100,totalFound:1,content:[{id:"s4",name:"Data Intern",location:{city:"Toulouse",country:"fr"},ref:"https://jobs.smartrecruiters.com/Acme/s4"}]}),
    },
    {
      source: {sourceType:"teamtailor", endpoint:"https://career.acme.test/jobs.json"},
      handler: () => response({jobs:[{id:"t5",title:"AI Intern",location:"Bordeaux, France",jobUrl:"https://career.acme.test/jobs/t5"}]}),
    },
  ];

  for (const fixture of fixtures) {
    const context = loadAdapters(fixture.handler);
    const result = context.discoverSourcePage_(fixture.source, "");
    assertPagedResult(result);
    assert.equal(result.status, "ok");
    assert.equal(result.done, true);
    assert.equal(typeof result.jobs[0].id, "string");
    assert.match(String(result.jobs[0].jobUrl || result.jobs[0].absoluteUrl || result.jobs[0].url), /^https:/);
  }
});

test("Discovery adapters v2 contain provider errors instead of throwing", () => {
  const context = loadAdapters(() => response({error:"boom"}, 500));
  const result = context.discoverSourcePage_({sourceType:"greenhouse", tenant:"broken"}, "");
  assertPagedResult(result);
  assert.equal(result.status, "fetch_error");
  assert.match(result.error, /HTTP 500/);
});

test("Discovery adapters v2 report restricted and unsupported sources honestly", () => {
  const context = loadAdapters(() => response({}));
  const restricted = context.discoverSourcePage_({sourceType:"linkedin_discovery"}, "");
  assertPagedResult(restricted);
  assert.equal(restricted.status, "restricted");

  const unsupported = context.discoverSourcePage_({sourceType:"arbitrary_html_scraper"}, "");
  assertPagedResult(unsupported);
  assert.equal(unsupported.status, "unsupported");
});

test("SmartRecruiters uses official offset limit totalFound pagination instead of truncating large boards", () => {
  const firstUrl = "https://api.smartrecruiters.com/v1/companies/Acme/postings?limit=100&offset=0";
  const secondUrl = "https://api.smartrecruiters.com/v1/companies/Acme/postings?limit=100&offset=100";
  const calls = [];
  const context = loadAdapters((url) => {
    calls.push(url);
    if (url === firstUrl) {
      return response({
        offset:0,
        limit:100,
        totalFound:150,
        content:[{id:"s1",name:"ML Intern",location:{city:"Paris",country:"fr"},ref:"https://jobs.smartrecruiters.com/Acme/s1"}],
      });
    }
    if (url === secondUrl) {
      return response({
        offset:100,
        limit:100,
        totalFound:150,
        content:[{id:"s2",name:"Vision Intern",location:{city:"Lyon",country:"fr"},ref:"https://jobs.smartrecruiters.com/Acme/s2"}],
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  });

  const first = context.discoverSourcePage_({sourceType:"smartrecruiters", tenant:"Acme"}, "");
  assertPagedResult(first);
  assert.equal(first.done, false);
  assert.equal(first.nextCursor, secondUrl);
  assert.deepEqual(Array.from(first.jobs, (job) => job.id), ["s1"]);

  const second = context.discoverSourcePage_({sourceType:"smartrecruiters", tenant:"Acme"}, first.nextCursor);
  assertPagedResult(second);
  assert.equal(second.done, true);
  assert.equal(second.nextCursor, "");
  assert.deepEqual(Array.from(second.jobs, (job) => job.id), ["s2"]);
  assert.deepEqual(calls, [firstUrl, secondUrl]);
});
