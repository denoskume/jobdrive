function clean(value) {
  return String(value || "").trim();
}

export function normalizeOfficialUrl(value = "") {
  try {
    const url = new URL(clean(value));
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function normalizeCandidate(rawJob = {}, sourceConfig = {}, detectedAt = new Date().toISOString()) {
  return {
    sourceKey: clean(sourceConfig.key),
    externalId: clean(rawJob.id || rawJob.externalId || rawJob.jobId),
    company: clean(rawJob.company || sourceConfig.company),
    role: clean(rawJob.title || rawJob.role),
    location: clean(rawJob.location || rawJob.locationName),
    country: clean(rawJob.country),
    postedDate: clean(rawJob.publishedAt || rawJob.postedDate || rawJob.createdAt),
    deadline: clean(rawJob.deadline),
    link: normalizeOfficialUrl(rawJob.absoluteUrl || rawJob.jobUrl || rawJob.url || rawJob.applyUrl),
    source: clean(sourceConfig.label || sourceConfig.type),
    descriptionRaw: clean(rawJob.descriptionPlain || rawJob.description || rawJob.descriptionHtml),
    contract: clean(rawJob.employmentType || rawJob.contract),
    domainSignals: Array.isArray(rawJob.domainSignals)
      ? rawJob.domainSignals.map(clean).filter(Boolean)
      : [],
    detectedAt,
  };
}
