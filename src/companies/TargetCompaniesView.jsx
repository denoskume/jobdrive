import { useMemo, useState } from "react";

import {
  filterTargetCompanies,
  targetCompanyMetrics,
  targetCompanySpecializations,
} from "./targetCompanies.mjs";

import "./target-companies.css";

function formatEvidence(value) {
  if (!value) return "No recent evidence";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function Metric({ label, value, hint }) {
  return (
    <article className="tc-metric">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{hint}</span>
    </article>
  );
}

export default function TargetCompaniesView({
  companies = [],
  loading = false,
  error = "",
}) {
  const [search, setSearch] = useState("");
  const [companyClass, setCompanyClass] = useState("");
  const [priorityTier, setPriorityTier] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [coverageStatus, setCoverageStatus] = useState("");

  const metrics = useMemo(
    () => targetCompanyMetrics(companies),
    [companies]
  );

  const specializations = useMemo(
    () => targetCompanySpecializations(companies),
    [companies]
  );

  const filtered = useMemo(
    () => filterTargetCompanies(companies, {
      search,
      companyClass,
      priorityTier,
      specialization,
      coverageStatus,
    }),
    [
      companies,
      search,
      companyClass,
      priorityTier,
      specialization,
      coverageStatus,
    ]
  );

  return (
    <section className="tc-view">
      <header className="tc-heading">
        <div>
          <p>FRANCE TARGET MARKET</p>
          <h1>Companies</h1>
          <span>
            Strategic employer coverage is separate from technical source health.
          </span>
        </div>
        <b>{metrics.total ? `${metrics.total} targets` : "Target registry"}</b>
      </header>

      {error ? (
        <div className="tc-error" role="status">
          <strong>Company coverage data unavailable</strong>
          <span>{error}</span>
          <small>Your internship dashboard remains available.</small>
        </div>
      ) : null}

      <div className="tc-metrics" aria-label="Target company coverage metrics">
        <Metric label="Target companies" value={metrics.total} hint="France market universe" />
        <Metric label="Covered" value={metrics.covered} hint="Healthy direct source" />
        <Metric label="Partial" value={metrics.partial} hint="Recent market evidence" />
        <Metric label="Not covered" value={metrics.uncovered} hint="Source expansion backlog" />
        <Metric label="Active internships" value={metrics.activeInternships} hint="Matched retained offers" />
        <Metric
          label="Tier 1 covered"
          value={`${metrics.tier1CoveredPercent}%`}
          hint={`${metrics.tier1Covered} / ${metrics.tier1Total} priority employers`}
        />
      </div>

      <section className="tc-panel">
        <div className="tc-toolbar">
          <label className="tc-search">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Company, sector or specialization"
            />
          </label>

          <label>
            <span>Class</span>
            <select value={companyClass} onChange={(event) => setCompanyClass(event.target.value)}>
              <option value="">All</option>
              <option value="giant">Giants</option>
              <option value="recognized">Recognized</option>
            </select>
          </label>

          <label>
            <span>Tier</span>
            <select value={priorityTier} onChange={(event) => setPriorityTier(event.target.value)}>
              <option value="">All</option>
              <option value="1">Tier 1</option>
              <option value="2">Tier 2</option>
              <option value="3">Tier 3</option>
            </select>
          </label>

          <label>
            <span>Specialization</span>
            <select value={specialization} onChange={(event) => setSpecialization(event.target.value)}>
              <option value="">All</option>
              {specializations.map((item) => (
                <option value={item} key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Coverage</span>
            <select value={coverageStatus} onChange={(event) => setCoverageStatus(event.target.value)}>
              <option value="">All</option>
              <option value="covered">Covered</option>
              <option value="partial">Partial</option>
              <option value="uncovered">Not covered</option>
            </select>
          </label>
        </div>

        <div className="tc-list-head">
          <strong>{filtered.length} companies</strong>
          <span>Tier 1 and uncovered companies are prioritized by default.</span>
        </div>

        {loading && !companies.length ? (
          <div className="tc-empty">Loading target companies…</div>
        ) : filtered.length ? (
          <div className="tc-list">
            {filtered.map((company) => {
              const evidence =
                company.lastCoveredAt ||
                company.lastMarketObservedAt ||
                company.lastSeenInternshipAt;
              return (
                <article className="tc-company" key={company.companyKey}>
                  <div className="tc-company-main">
                    <div className="tc-company-title">
                      <strong>{company.companyName}</strong>
                      <span className={`tc-coverage tc-${company.coverageStatus || "uncovered"}`}>
                        {company.coverageStatus === "uncovered" ? "Not covered" : company.coverageStatus}
                      </span>
                    </div>
                    <div className="tc-company-meta">
                      <span>{company.companyClass === "giant" ? "Giant" : "Recognized"}</span>
                      <span>Tier {company.priorityTier}</span>
                      <span>{company.sector || "Sector not specified"}</span>
                    </div>
                    <div className="tc-tags">
                      {(company.specializations || []).slice(0, 5).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                      {(company.specializations || []).length > 5 ? (
                        <span>+{company.specializations.length - 5}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="tc-company-side">
                    <div>
                      <small>Active internships</small>
                      <strong>{Number(company.activeInternshipCount || 0)}</strong>
                    </div>
                    <div>
                      <small>Latest evidence</small>
                      <span>{formatEvidence(evidence)}</span>
                    </div>
                    {company.coverageReason ? (
                      <small className="tc-reason">{company.coverageReason}</small>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="tc-empty">
            {error ? "Target company data could not be loaded." : "No companies match these filters."}
          </div>
        )}
      </section>
    </section>
  );
}
