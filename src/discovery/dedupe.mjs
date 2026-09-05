function clean(v) { return String(v || "").trim().toLowerCase(); }
export function normalizedJobUrl(value = "") {
  try {
    const u = new URL(value);
    u.search = "";
    u.hash = "";
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString().replace(/\/$/, "");
  } catch { return ""; }
}
export function canonicalJobKey(c = {}) {
  if (c.sourceKey && c.externalId) return `source:${clean(c.sourceKey)}:${clean(c.externalId)}`;
  const url = normalizedJobUrl(c.link);
  if (url) return `url:${url}`;
  return `fingerprint:${clean(c.company)}|${clean(c.role)}|${clean(c.location)}`;
}
export function isDuplicateCandidate(candidate, existingJobs = []) {
  const keys = new Set(existingJobs.flatMap(job => {
    const result = [canonicalJobKey(job)];
    const url = normalizedJobUrl(job.link);
    if (url) result.push(`url:${url}`);
    result.push(`fingerprint:${clean(job.company)}|${clean(job.role)}|${clean(job.location)}`);
    return result;
  }));
  const candidateKeys = [canonicalJobKey(candidate)];
  const url = normalizedJobUrl(candidate.link);
  if (url) candidateKeys.push(`url:${url}`);
  candidateKeys.push(`fingerprint:${clean(candidate.company)}|${clean(candidate.role)}|${clean(candidate.location)}`);
  return candidateKeys.some(key => keys.has(key));
}
