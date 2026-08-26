import { useEffect, useMemo, useState } from "react";
import { fetchJobs } from "./api";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "internships", label: "M2 Internships" },
  { id: "remote", label: "Remote Jobs" },
  { id: "pipeline", label: "Pipeline" },
];

const STATUS_ORDER = [
  "Nouveau",
  "À candidater",
  "Candidature envoyée",
  "Entretien",
  "Offre",
  "Accepté",
];

function App() {
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadJobs() {
    try {
      setError("");

      const result = await fetchJobs();

      setJobs(result.jobs);
      setConfigured(result.configured);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Unable to synchronize JobDrive.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();

    const interval = setInterval(loadJobs, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.toLowerCase().trim();

    return jobs.filter((job) => {
      if (view === "internships" && job.type !== "Stage M2") return false;
      if (view === "remote" && job.type !== "Remote Job") return false;

      if (priority && job.priority !== priority) return false;
      if (status && job.status !== status) return false;

      if (query) {
        const searchable = [
          job.company,
          job.role,
          job.domain,
          job.location,
          job.mode,
          job.compensation,
          job.source,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [jobs, view, search, priority, status]);

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      internships: jobs.filter((job) => job.type === "Stage M2").length,
      remote: jobs.filter((job) => job.type === "Remote Job").length,
      high: jobs.filter((job) => job.priority === "Haute").length,
      applied: jobs.filter(
        (job) => job.status === "Candidature envoyée"
      ).length,
      interviews: jobs.filter((job) => job.status === "Entretien").length,
    };
  }, [jobs]);

  const title =
    NAV_ITEMS.find((item) => item.id === view)?.label || "Overview";

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">J</div>

          <div>
            <strong>JobDrive</strong>
            <span>Career Intelligence</span>
          </div>
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="live-dot" />
          Automation active
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <p className="eyebrow">JOB SEARCH COMMAND CENTER</p>
            <h1>{title}</h1>
            <p className="subtitle">
              Automated M2 internship and remote job tracking.
            </p>
          </div>

          <div className="header-actions">
            <div className="sync">
              <span className="live-dot" />
              <div>
                <strong>
                  {loading
                    ? "Synchronizing"
                    : error
                    ? "Sync error"
                    : configured
                    ? "Live data"
                    : "API pending"}
                </strong>

                <small>
                  {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Waiting for data"}
                </small>
              </div>
            </div>

            <button
              className="primary-refresh"
              onClick={loadJobs}
              disabled={loading}
            >
              <span className={loading ? "refresh-icon spinning" : "refresh-icon"}>
                ↻
              </span>
              {loading ? "Syncing" : "Refresh data"}
            </button>
          </div>
        </header>

        {!configured && (
          <section className="setup-banner">
            <div>
              <strong>Frontend ready</strong>
              <p>
                Google Sheets API connection has not been configured yet.
                The dashboard will populate automatically once the endpoint
                is connected.
              </p>
            </div>
          </section>
        )}

        {error && <section className="error-banner">{error}</section>}

        <section className="kpi-grid">
          <Kpi
            label="Opportunities"
            value={stats.total}
            hint="Tracked roles"
            tone="blue"
          />
          <Kpi
            label="M2 Internships"
            value={stats.internships}
            hint="Final-year targets"
            tone="violet"
          />
          <Kpi
            label="Remote Jobs"
            value={stats.remote}
            hint="France eligible"
            tone="cyan"
          />
          <Kpi
            label="High Priority"
            value={stats.high}
            hint="Top matches"
            tone="amber"
          />
          <Kpi
            label="Applications"
            value={stats.applied}
            hint="Submitted"
            tone="green"
          />
          <Kpi
            label="Interviews"
            value={stats.interviews}
            hint="In progress"
            tone="rose"
          />
        </section>

        {view === "pipeline" ? (
          <Pipeline jobs={jobs} />
        ) : (
          <>
            <section className="filters">
              <input
                type="search"
                placeholder="Search company, role, domain..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="">All priorities</option>
                <option value="Haute">High</option>
                <option value="Moyenne">Medium</option>
                <option value="Basse">Low</option>
              </select>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="Nouveau">New</option>
                <option value="À candidater">To apply</option>
                <option value="Candidature envoyée">Applied</option>
                <option value="Entretien">Interview</option>
                <option value="Offre">Offer</option>
                <option value="Accepté">Accepted</option>
                <option value="Refusé">Rejected</option>
                <option value="Expiré">Expired</option>
              </select>

              <button
                className="clear-filters"
                disabled={!search && !priority && !status}
                onClick={() => {
                  setSearch("");
                  setPriority("");
                  setStatus("");
                }}
              >
                Clear
              </button>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Opportunities</h2>
                  <p>
                    {filteredJobs.length} result
                    {filteredJobs.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <span className="result-pill">
                  {filteredJobs.length} visible
                </span>
              </div>

              <JobsTable jobs={filteredJobs} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value, hint, tone = "blue" }) {
  return (
    <article className={`kpi kpi-${tone}`}>
      <div className="kpi-heading">
        <span>{label}</span>
        <i className="kpi-indicator" />
      </div>

      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function JobsTable({ jobs }) {
  if (!jobs.length) {
    return (
      <div className="empty">
        <div className="empty-icon">JD</div>
        <h3>No opportunities yet</h3>
        <p>
          New matching internships and remote jobs will appear here
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Company</th>
            <th>Role</th>
            <th>Domain</th>
            <th>Location</th>
            <th>Mode</th>
            <th>Compensation</th>
            <th>Deadline</th>
            <th>Priority</th>
            <th>Match</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>

        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <span className="type-chip">{job.type}</span>
              </td>

              <td>
                <strong>{job.company || "—"}</strong>
              </td>

              <td>{job.role || "—"}</td>

              <td>{job.domain || "—"}</td>

              <td>{job.location || "—"}</td>

              <td>{job.mode || "—"}</td>

              <td>{job.compensation || "—"}</td>

              <td>{job.deadline || "—"}</td>

              <td>
                <span
                  className={`priority-chip ${priorityClass(job.priority)}`}
                >
                  {job.priority}
                </span>
              </td>

              <td>
                <span className={`score-badge ${matchClass(job.fitScore)}`}>
                  {job.fitScore ? `${job.fitScore}%` : "—"}
                </span>
              </td>

              <td>
                <span className={`status-chip ${statusClass(job.status)}`}>
                  {statusLabel(job.status)}
                </span>
              </td>

              <td>
                {job.link ? (
                  <a
                    className="apply-link"
                    href={job.link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apply ↗
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pipeline({ jobs }) {
  return (
    <section className="pipeline-grid">
      {STATUS_ORDER.map((pipelineStatus) => {
        const items = jobs.filter((job) => job.status === pipelineStatus);

        return (
          <article className="pipeline-column" key={pipelineStatus}>
            <div className="pipeline-header">
              <strong>{pipelineStatus}</strong>
              <span>{items.length}</span>
            </div>

            <div className="pipeline-list">
              {items.length ? (
                items.map((job) => (
                  <div className="pipeline-card" key={job.id}>
                    <small>{job.type}</small>
                    <strong>{job.role}</strong>
                    <span>{job.company}</span>

                    <div className="pipeline-meta">
                      <span>{job.fitScore || 0}% match</span>
                      <span>{job.priority}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="pipeline-empty">No items</div>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function matchClass(score) {
  const value = Number(score || 0);

  if (value >= 90) return "match-excellent";
  if (value >= 80) return "match-strong";
  if (value >= 70) return "match-good";

  return "match-standard";
}

function statusLabel(status) {
  const labels = {
    "Nouveau": "New",
    "À candidater": "To apply",
    "Candidature envoyée": "Applied",
    "Entretien": "Interview",
    "Offre": "Offer",
    "Accepté": "Accepted",
    "Refusé": "Rejected",
    "Expiré": "Expired",
  };

  return labels[status] || status || "New";
}

function statusClass(status) {
  const classes = {
    "Nouveau": "status-new",
    "À candidater": "status-to-apply",
    "Candidature envoyée": "status-applied",
    "Entretien": "status-interview",
    "Offre": "status-offer",
    "Accepté": "status-accepted",
    "Refusé": "status-rejected",
    "Expiré": "status-expired",
  };

  return classes[status] || "status-new";
}

function priorityClass(priority) {
  switch (priority) {
    case "Haute":
      return "high";
    case "Basse":
      return "low";
    default:
      return "medium";
  }
}

export default App;
