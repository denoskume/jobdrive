import fs from "node:fs";

// Exact one-time transform used only to wire and verify the raw market observation hook.
const path = "apps-script/Discovery.gs";
const source = fs.readFileSync(path, "utf8");
const needle = `        pageJobs.forEach(function(raw){\n          var c=normalizeDiscoveryCandidate_(raw,source); summary.normalizedJobs++;\n          var e=evaluateDiscoveryCandidate_(c);`;
const replacement = `        var normalizedPageJobs=pageJobs.map(function(raw){\n          return normalizeDiscoveryCandidate_(raw,source);\n        });\n        if(typeof recordTargetCompanyMarketObservations_==="function"){\n          recordTargetCompanyMarketObservations_(normalizedPageJobs,new Date().toISOString());\n        }\n        normalizedPageJobs.forEach(function(c){\n          summary.normalizedJobs++;\n          var e=evaluateDiscoveryCandidate_(c);`;

const first = source.indexOf(needle);
if (first < 0) throw new Error("Discovery raw-candidate transform anchor not found");
if (source.indexOf(needle, first + needle.length) >= 0) {
  throw new Error("Discovery raw-candidate transform anchor is ambiguous");
}

fs.writeFileSync(path, source.slice(0, first) + replacement + source.slice(first + needle.length));
console.log("Raw market observation hook applied.");
