import fs from "node:fs";
import vm from "node:vm";

function loadTargetCompanies() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("apps-script/TargetCompanySeeds.gs", "utf8"), context);
  return context.targetCompanySeedRows_();
}

const CAREER_WORDS = /(career|careers|job|jobs|join|rejoindre|recrut|emploi|opportunit|vacan|talent|work[- ]?with[- ]?us|stage)/i;
const STRONG_WORDS = /(career|careers|job|jobs|recrut|emploi|join[- ]?us|rejoindre|vacan)/i;
const CAREER_HOSTS = /(ashbyhq\.com|greenhouse\.io|lever\.co|smartrecruiters\.com|myworkdayjobs\.com|workday\.com|successfactors\.(?:com|eu)|teamtailor\.com|welcomekit\.co|jobs2web\.com|icims\.com|talent-soft\.com|talentsoft\.com|avature\.net|oraclecloud\.com)/i;

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value = "") {
  return decodeHtml(String(value).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function rootsFor(domain) {
  const clean = String(domain || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!clean) return [];
  const roots = [`https://${clean}`];
  if (!clean.startsWith("www.")) roots.push(`https://www.${clean}`);
  return roots;
}

async function fetchPage(url, timeoutMs = 9000) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; JobDriveCareerAudit/1.0)",
        "accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      url: response.url || url,
      text: response.status >= 200 && response.status < 400 ? await response.text() : "",
    };
  } catch (error) {
    return { ok: false, status: 0, url, text: "", error: String(error?.message || error) };
  }
}

function extractCandidates(html, baseUrl) {
  const candidates = [];
  const anchor = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchor.exec(html))) {
    const rawHref = decodeHtml(match[1] || match[2] || match[3] || "").trim();
    if (!rawHref || /^(mailto:|tel:|javascript:|#)/i.test(rawHref)) continue;
    let url;
    try {
      url = new URL(rawHref, baseUrl).href;
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(url)) continue;
    const text = stripTags(match[4] || "");
    const haystack = `${text} ${url}`;
    if (!CAREER_WORDS.test(haystack) && !CAREER_HOSTS.test(url)) continue;

    let score = 0;
    if (STRONG_WORDS.test(text)) score += 8;
    if (STRONG_WORDS.test(url)) score += 7;
    if (CAREER_HOSTS.test(url)) score += 8;
    if (/intern|stage/i.test(haystack)) score += 3;
    if (/privacy|cookie|legal|press|blog|news/i.test(haystack)) score -= 8;
    candidates.push({ url, text, score });
  }
  return candidates;
}

function commonCandidates(root) {
  const paths = [
    "/careers", "/career", "/jobs", "/en/careers", "/en/jobs",
    "/fr/careers", "/fr/jobs", "/recrutement", "/nous-rejoindre",
    "/fr/nous-rejoindre", "/en/join-us", "/join-us", "/opportunities",
  ];
  return paths.map((path, index) => ({ url: new URL(path, root).href, text: "common-path", score: 5 - index / 100 }));
}

function dedupeCandidates(items) {
  const seen = new Set();
  return items
    .filter((item) => {
      const key = String(item.url || "").replace(/\/$/, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

async function resolveCompany(company) {
  const roots = rootsFor(company.officialDomain);
  let rootEvidence = null;
  let extracted = [];

  for (const root of roots) {
    const page = await fetchPage(root);
    if (!page.ok) continue;
    rootEvidence = page;
    extracted = extractCandidates(page.text, page.url);
    if (extracted.length) break;
  }

  const candidatePool = dedupeCandidates([
    ...extracted,
    ...(rootEvidence ? commonCandidates(rootEvidence.url) : roots.flatMap(commonCandidates)),
  ]).slice(0, 12);

  for (const candidate of candidatePool) {
    const page = await fetchPage(candidate.url, 8000);
    if (!page.ok) continue;
    const finalUrl = page.url || candidate.url;
    const finalHaystack = `${candidate.text} ${candidate.url} ${finalUrl}`;
    if (CAREER_WORDS.test(finalHaystack) || CAREER_HOSTS.test(finalUrl)) {
      return {
        companyKey: company.companyKey,
        companyName: company.companyName,
        officialDomain: company.officialDomain,
        careersUrl: finalUrl,
        kind: CAREER_HOSTS.test(finalUrl) ? "ats" : "official-careers",
        status: page.status,
        evidence: candidate.text || candidate.url,
      };
    }
  }

  if (rootEvidence?.ok) {
    return {
      companyKey: company.companyKey,
      companyName: company.companyName,
      officialDomain: company.officialDomain,
      careersUrl: rootEvidence.url,
      kind: "official-homepage-fallback",
      status: rootEvidence.status,
      evidence: "No verified careers link found from homepage anchors/common paths",
    };
  }

  return {
    companyKey: company.companyKey,
    companyName: company.companyName,
    officialDomain: company.officialDomain,
    careersUrl: roots[0] || "",
    kind: "unverified-domain-fallback",
    status: 0,
    evidence: "Official domain could not be fetched by audit runner",
  };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function next() {
    while (true) {
      const current = index++;
      if (current >= items.length) return;
      results[current] = await worker(items[current], current);
      console.log(`${current + 1}/${items.length} ${items[current].companyName} -> ${results[current].careersUrl} [${results[current].kind}]`);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => next()));
  return results;
}

const companies = loadTargetCompanies();
const results = await mapLimit(companies, 12, resolveCompany);
const summary = results.reduce((acc, item) => {
  acc[item.kind] = (acc[item.kind] || 0) + 1;
  return acc;
}, {});

fs.mkdirSync("tmp", { recursive: true });
fs.writeFileSync("tmp/careers-links.json", JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2));
console.log("SUMMARY", JSON.stringify(summary));
