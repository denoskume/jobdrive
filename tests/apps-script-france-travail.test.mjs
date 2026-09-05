import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function makeResponse(body, code = 200, headers = {}) {
  return {
    getResponseCode: () => code,
    getContentText: () => JSON.stringify(body),
    getHeaders: () => headers,
  };
}

function loadFranceTravail({properties = {}, fetchHandler = () => makeResponse({})} = {}) {
  const code = fs.readFileSync("apps-script/DiscoveryFranceTravail.gs", "utf8");
  const cache = new Map();
  const context = {
    PropertiesService: {
      getScriptProperties() {
        return { getProperty: (key) => properties[key] || "" };
      },
    },
    CacheService: {
      getScriptCache() {
        return {
          get: (key) => cache.get(key) || null,
          put: (key, value) => cache.set(key, value),
        };
      },
    },
    UrlFetchApp: { fetch: fetchHandler },
    console,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}

test("France Travail adapter reports missing credentials safely", () => {
  const context = loadFranceTravail();
  const status = JSON.parse(JSON.stringify(context.franceTravailConfigStatus_()));
  assert.deepEqual(status, {configured:false, reason:"missing_credentials"});

  const page = context.discoverFranceTravailPage_({sourceKey:"france-travail"}, "");
  assert.equal(page.status, "configuration_required");
  assert.equal(page.done, true);
  assert.deepEqual(Array.from(page.jobs), []);
});

test("France Travail offer normalization preserves official internship evidence", () => {
  const context = loadFranceTravail();
  const raw = context.normalizeFranceTravailOffer_({
    id:"188ABCD",
    intitule:"Stage Data Scientist F/H",
    lieuTravail:{libelle:"31 - Toulouse"},
    entreprise:{nom:"ACME"},
    dateCreation:"2026-09-04T09:00:00Z",
    description:"Stage de 6 mois en machine learning.",
    typeContratLibelle:"Stage",
    origineOffre:{urlOrigine:"https://careers.acme.com/job/188ABCD"}
  });

  assert.equal(raw.id, "188ABCD");
  assert.equal(raw.company, "ACME");
  assert.equal(raw.country, "France");
  assert.equal(raw.employmentType, "Stage");
  assert.equal(raw.jobUrl, "https://careers.acme.com/job/188ABCD");
  assert.match(raw.descriptionPlain, /6 mois/);
});

test("France Travail adapter uses client credentials and returns resumable cursor", () => {
  const calls = [];
  const context = loadFranceTravail({
    properties: {
      JOBDRIVE_FT_CLIENT_ID: "client-id",
      JOBDRIVE_FT_CLIENT_SECRET: "client-secret",
    },
    fetchHandler(url, options = {}) {
      calls.push({url, options});
      if (url.includes("access_token")) {
        return makeResponse({access_token:"TOKEN", expires_in:1200});
      }
      return makeResponse({
        resultats:[{
          id:"1",
          intitule:"Stage Machine Learning",
          lieuTravail:{libelle:"75 - Paris"},
          entreprise:{nom:"ACME"},
          description:"Stage de 6 mois.",
          typeContratLibelle:"Stage",
          origineOffre:{urlOrigine:"https://careers.acme.com/jobs/1"}
        }]
      }, 206, {"Content-Range":"offres 0-0/2"});
    },
  });

  const page = context.discoverFranceTravailPage_({sourceKey:"france-travail"}, JSON.stringify({queryIndex:0,start:0}));
  assert.equal(page.status, "ok");
  assert.equal(page.done, false);
  assert.equal(page.jobs.length, 1);
  const cursor = JSON.parse(page.nextCursor);
  assert.equal(cursor.queryIndex, 0);
  assert.equal(cursor.start, 1);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /^https:\/\/entreprise\.francetravail\.fr\/connexion\/oauth2\/access_token\?realm=\/partenaire$/);
  assert.match(calls[1].url, /motsCles=/);
  assert.equal(calls[1].options.headers.Authorization, "Bearer TOKEN");
  assert.ok(!JSON.stringify(calls).includes("JOBDRIVE_FT_CLIENT_SECRET"));
});

test("France Travail exposes a safe connection check without returning credentials or token", () => {
  const calls = [];
  const context = loadFranceTravail({
    properties: {
      JOBDRIVE_FT_CLIENT_ID: "client-id",
      JOBDRIVE_FT_CLIENT_SECRET: "client-secret",
    },
    fetchHandler(url) {
      calls.push(url);
      if (url.includes("access_token")) return makeResponse({access_token:"TOKEN", expires_in:1200});
      return makeResponse({resultats:[]}, 200, {"Content-Range":"offres 0-0/0"});
    },
  });

  const result = JSON.parse(JSON.stringify(context.testJobDriveFranceTravailConnection()));
  assert.equal(result.success, true);
  assert.equal(result.status, "empty");
  assert.equal(result.jobsFound, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "accessToken"), false);
  assert.equal(JSON.stringify(result).includes("client-secret"), false);
  assert.equal(JSON.stringify(result).includes("TOKEN"), false);
  assert.equal(calls.length, 2);
});
