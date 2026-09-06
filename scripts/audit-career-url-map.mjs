import fs from "node:fs";
import { TARGET_COMPANY_CAREER_URLS } from "../src/companies/targetCompanyCareerUrls.mjs";
import { TARGET_COMPANY_CAREER_URL_OVERRIDES } from "../src/companies/targetCompanyCareerUrlOverrides.mjs";

async function probe([companyKey, url]) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; JobDriveCareerAudit/1.0)",
        "accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(12000),
    });
    return {
      companyKey,
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 500,
      finalUrl: response.url || url,
    };
  } catch (error) {
    return {
      companyKey,
      url,
      status: 0,
      ok: false,
      finalUrl: url,
      error: String(error?.message || error),
    };
  }
}

async function mapLimit(entries, limit) {
  const output = new Array(entries.length);
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const current = nextIndex++;
      if (current >= entries.length) return;
      output[current] = await probe(entries[current]);
      const item = output[current];
      console.log(`${current + 1}/${entries.length} ${item.companyKey} ${item.status} ${item.finalUrl}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return output;
}

const resolvedUrls = {
  ...TARGET_COMPANY_CAREER_URLS,
  ...TARGET_COMPANY_CAREER_URL_OVERRIDES,
};
const entries = Object.entries(resolvedUrls);
if (entries.length !== 200) throw new Error(`Expected 200 career URLs, got ${entries.length}`);
const results = await mapLimit(entries, 16);
const summary = results.reduce((acc, item) => {
  const bucket = item.status === 0
    ? "network_error"
    : item.status < 400
      ? "success"
      : item.status < 500
        ? "client_blocked_or_missing"
        : "server_error";
  acc[bucket] = (acc[bucket] || 0) + 1;
  return acc;
}, {});
fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync(
  "tmp/career-url-audit.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2)
);
console.log("SUMMARY", JSON.stringify(summary));
