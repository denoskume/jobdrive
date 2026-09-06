import { targetCompanyCareerUrl } from "./targetCompanyCareerUrls.mjs";

const COVERAGE_ORDER = {
  uncovered: 0,
  partial: 1,
  covered: 2,
};

function clean(value) {
  return String(value ?? "").trim();
}

function csv(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value)
    .split(",")
    .map(clean)
    .filter(Boolean);
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeTargetCompanyRows(values = []) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = (values[0] || []).map(clean);
  return values.slice(1)
    .filter((row) => clean(row?.[headers.indexOf("companyKey")]))
    .map((row) => {
      const object = {};
      headers.forEach((header, index) => {
        if (header) object[header] = row?.[index] ?? "";
      });
      object.priorityTier = numberValue(object.priorityTier, 3);
      object.activeInternshipCount = numberValue(object.activeInternshipCount, 0);
      object.specializations = csv(object.specializations);
      object.aliases = csv(object.aliases);
      object.sourceKeys = csv(object.sourceKeys);
      object.coverageStatus = clean(object.coverageStatus) || "uncovered";
      object.careersUrl = targetCompanyCareerUrl(object);
      return object;
    });
}

export function targetCompanyMetrics(companies = []) {
  const list = Array.isArray(companies) ? companies : [];
  const metrics = {
    total: list.length,
    covered: 0,
    partial: 0,
    uncovered: 0,
    activeInternships: 0,
    tier1Total: 0,
    tier1Covered: 0,
    tier1CoveredPercent: 0,
  };

  for (const company of list) {
    const status = ["covered", "partial", "uncovered"].includes(company.coverageStatus)
      ? company.coverageStatus
      : "uncovered";
    metrics[status] += 1;
    metrics.activeInternships += numberValue(company.activeInternshipCount, 0);
    if (numberValue(company.priorityTier, 3) === 1) {
      metrics.tier1Total += 1;
      if (status === "covered") metrics.tier1Covered += 1;
    }
  }

  metrics.tier1CoveredPercent = metrics.tier1Total
    ? Math.round((metrics.tier1Covered / metrics.tier1Total) * 100)
    : 0;

  return metrics;
}

export function filterTargetCompanies(companies = [], filters = {}) {
  const query = clean(filters.search).toLowerCase();
  const companyClass = clean(filters.companyClass);
  const coverageStatus = clean(filters.coverageStatus);
  const specialization = clean(filters.specialization);
  const priorityTier = filters.priorityTier === "" || filters.priorityTier == null
    ? null
    : numberValue(filters.priorityTier, null);

  return (Array.isArray(companies) ? companies : [])
    .filter((company) => {
      if (query) {
        const haystack = [
          company.companyName,
          company.sector,
          ...(Array.isArray(company.specializations) ? company.specializations : csv(company.specializations)),
        ].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (companyClass && company.companyClass !== companyClass) return false;
      if (coverageStatus && company.coverageStatus !== coverageStatus) return false;
      if (priorityTier != null && Number(company.priorityTier) !== priorityTier) return false;
      if (specialization) {
        const specs = Array.isArray(company.specializations)
          ? company.specializations
          : csv(company.specializations);
        if (!specs.includes(specialization)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const tierDelta = numberValue(a.priorityTier, 3) - numberValue(b.priorityTier, 3);
      if (tierDelta) return tierDelta;
      const coverageDelta =
        (COVERAGE_ORDER[a.coverageStatus] ?? 0) -
        (COVERAGE_ORDER[b.coverageStatus] ?? 0);
      if (coverageDelta) return coverageDelta;
      return clean(a.companyName).localeCompare(clean(b.companyName), "en");
    });
}

export function targetCompanySpecializations(companies = []) {
  return [...new Set(
    (Array.isArray(companies) ? companies : [])
      .flatMap((company) => Array.isArray(company.specializations)
        ? company.specializations
        : csv(company.specializations))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "en"));
}
