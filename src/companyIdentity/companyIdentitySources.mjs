const INTERMEDIARY_DOMAINS = [
  "linkedin.com",
  "indeed.com",
  "welcometothejungle.com",
  "glassdoor.com",
  "hellowork.com",
  "greenhouse.io",
  "lever.co",
  "smartrecruiters.com",
  "myworkdayjobs.com",
  "teamtailor.com",
];


const COMMON_SUBDOMAINS = new Set([
  "www",
  "careers",
  "career",
  "jobs",
  "job",
  "recruitment",
  "recrutement",
  "talent",
  "talents",
]);


function cleanHostname(
  hostname = ""
) {
  return String(hostname)
    .toLowerCase()
    .trim()
    .replace(/\.$/, "");
}


function isIntermediaryDomain(
  hostname = ""
) {
  const host =
    cleanHostname(hostname);

  return INTERMEDIARY_DOMAINS
    .some(
      (domain) =>
        host === domain ||
        host.endsWith(
          `.${domain}`
        )
    );
}


export function normalizeDomain(
  domain = ""
) {
  let host =
    cleanHostname(domain);

  if (!host) {
    return "";
  }


  if (
    host.includes("://")
  ) {
    try {
      host =
        new URL(host).hostname;
    } catch {
      return "";
    }
  }


  const parts =
    host.split(".")
      .filter(Boolean);


  while (
    parts.length > 2 &&
    COMMON_SUBDOMAINS.has(
      parts[0]
    )
  ) {
    parts.shift();
  }


  return parts.join(".");
}


export function extractOfficialDomain(
  link = ""
) {
  let url;

  try {
    url =
      new URL(link);
  } catch {
    return null;
  }


  const hostname =
    cleanHostname(
      url.hostname
    );


  if (
    !hostname ||
    isIntermediaryDomain(
      hostname
    )
  ) {
    return null;
  }


  const domain =
    normalizeDomain(
      hostname
    );


  if (!domain) {
    return null;
  }


  return {
    domain,
    source:
      "offer-domain",
    confidence:
      "high",
  };
}


export {
  INTERMEDIARY_DOMAINS,
};


export function inferAtsIdentity(
  link = ""
) {
  let url;

  try {
    url =
      new URL(link);
  } catch {
    return null;
  }


  const host =
    cleanHostname(
      url.hostname
    );


  const parts =
    url.pathname
      .split("/")
      .filter(Boolean);


  let tenant = "";


  if (
    host ===
      "boards.greenhouse.io" ||
    host ===
      "job-boards.greenhouse.io"
  ) {
    tenant =
      parts[0] || "";
  }


  else if (
    host ===
    "jobs.lever.co"
  ) {
    tenant =
      parts[0] || "";
  }


  else if (
    host ===
    "jobs.smartrecruiters.com"
  ) {
    tenant =
      parts[0] || "";
  }


  else if (
    host.endsWith(
      ".teamtailor.com"
    )
  ) {
    tenant =
      host.split(".")[0] || "";
  }


  tenant =
    String(tenant)
      .toLowerCase()
      .trim()
      .replace(
        /[^a-z0-9_-]+/g,
        ""
      );


  if (!tenant) {
    return null;
  }


  return {
    tenant,
    source: "ats",
    confidence: "low",
  };
}


export function buildLogoCandidates(
  identity = {}
) {
  const candidates = [];


  const addCandidate = (
    value
  ) => {
    const candidate =
      String(value || "")
        .trim();

    if (!candidate) {
      return;
    }

    if (
      !candidates.includes(
        candidate
      )
    ) {
      candidates.push(
        candidate
      );
    }
  };


  addCandidate(
    identity.logoUrl
  );


  if (
    Array.isArray(
      identity.logoCandidates
    )
  ) {
    identity.logoCandidates
      .forEach(
        addCandidate
      );
  }


  const domain =
    normalizeDomain(
      identity.domain || ""
    );


  if (domain) {
    addCandidate(
      `https://www.google.com/s2/favicons?domain_url=https://${domain}&sz=128`
    );
  }


  return candidates;
}
