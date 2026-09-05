import { normalizeJobs } from "../utils/jobDrive.mjs";

function text(value) {
  return String(value ?? "").trim();
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function jsonArray(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeJobsWithDiscoveryMetadata(values = []) {
  const jobs = normalizeJobs(values);
  if (!Array.isArray(values) || values.length < 2 || !jobs.length) return jobs;

  const rowsById = new Map(
    values
      .slice(1)
      .filter((row) => text(row?.[0]))
      .map((row) => [text(row[0]), row])
  );

  return jobs.map((job) => {
    const row = rowsById.get(text(job.id)) || [];
    return {
      ...job,
      marketStatus: text(row[45]),
      marketLastSeenAt: text(row[46]),
      canonicalSourceKey: text(row[47]),
      sourceCount: numberValue(row[48]),
      internshipEvidence: text(row[49]),
      locationEvidence: text(row[50]),
      durationEvidence: text(row[51]),
      industryEvidence: text(row[52]),
      domainEvidence: jsonArray(row[53]),
      timingEvidence: text(row[54]),
    };
  });
}
