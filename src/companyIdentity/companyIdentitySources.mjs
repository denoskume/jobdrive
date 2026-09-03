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
