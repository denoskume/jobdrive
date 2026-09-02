import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./pro.css";

import {
  requestGoogleToken,
  revokeGoogleToken,
} from "./services/googleAuth";

import {
  readJobs,
  updateJobFields,
} from "./services/sheetsApi";

import {
  STATUS_OPTIONS,
  addDaysISO,
  calculateAnalytics,
  deadlineInfo,
  filterInternships,
  followUpInfo,
  internshipSpecializations,
  sortInternships,
  sourceAnalytics,
  statusLabel,
  toDateInput,
} from "./utils/jobDrive.mjs";


const CLIENT_ID =
  import.meta.env
    .VITE_GOOGLE_CLIENT_ID || "";

const SPREADSHEET_ID =
  import.meta.env
    .VITE_JOBDRIVE_SPREADSHEET_ID ||
  "1o8n6ghifDv96P9rjJ7Vrzs0D50kTNz5a6DF9jODeMD8";


const NAV_ITEMS = [
  ["overview", "Overview"],
  ["internships", "M2 Internships"],
  ["pipeline", "Pipeline"],
  ["analytics", "Analytics"],
];


const QUICK_FILTERS = [
  ["", "All"],
  ["favorites", "★ Favorites"],
  ["high", "High priority"],
  ["match90", "Match ≥ 90%"],
  ["deadline7", "Deadline ≤ 7d"],
  ["applied", "Applied"],
  ["interview", "Interview"],
];


function priorityClass(value) {
  if (value === "Haute") return "high";
  if (value === "Moyenne") return "medium";
  return "low";
}


function statusClass(value) {
  const classes = {
    Nouveau: "new",
    "À candidater": "todo",
    "Candidature envoyée": "applied",
    Entretien: "interview",
    Offre: "offer",
    Accepté: "accepted",
    Refusé: "rejected",
    Expiré: "expired",
  };

  return classes[value] || "new";
}


function matchClass(score) {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  if (score >= 70) return "good";
  return "standard";
}


function Kpi({
  label,
  value,
  hint,
  tone = "blue",
}) {
  return (
    <article
      className={`pro-kpi tone-${tone}`}
    >
      <div className="pro-kpi-label">
        <span>{label}</span>
        <i />
      </div>

      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}


function DeadlineBadge({ value }) {
  const deadline =
    deadlineInfo(value);

  const date =
    toDateInput(value);

  return (
    <span
      className={
        `pro-deadline ` +
        `deadline-${deadline.tone}`
      }
    >
      {date
        ? `${date} · ${deadline.label}`
        : "Not specified"}
    </span>
  );
}


function FollowUpBadge({ value }) {
  const followup =
    followUpInfo(value);

  return (
    <span
      className={
        `pro-followup ` +
        `followup-${followup.tone}`
      }
    >
      {followup.label}
    </span>
  );
}


function LoginScreen({
  clientConfigured,
  loading,
  error,
  onLogin,
}) {
  return (
    <main className="pro-login">
      <section className="pro-login-card">
        <div className="pro-login-logo">
          <span>J</span>
        </div>

        <p className="pro-eyebrow">
          JOB SEARCH COMMAND CENTER
        </p>

        <h1>JobDrive Pro</h1>

        <p className="pro-login-copy">
          Your private career opportunity
          tracker.
        </p>

        <div className="pro-private-note">
          <span>●</span>

          <div>
            <strong>
              Private Google Sheet access
            </strong>

            <p>
              Application notes, follow-ups
              and status changes are loaded
              only after Google authorization.
            </p>
          </div>
        </div>

        {!clientConfigured ? (
          <div className="pro-config-error">
            <strong>
              Google OAuth setup required
            </strong>

            <p>
              Repository variable
              <code>
                VITE_GOOGLE_CLIENT_ID
              </code>
              is not configured yet.
            </p>
          </div>
        ) : (
          <button
            className="pro-google-button"
            onClick={onLogin}
            disabled={loading}
          >
            <span>G</span>

            {loading
              ? "Connecting..."
              : "Sign in with Google"}
          </button>
        )}

        {error && (
          <p className="pro-auth-error">
            {error}
          </p>
        )}

        <small className="pro-login-footer">
          No Google password is stored by
          JobDrive.
        </small>
      </section>
    </main>
  );
}


function OpportunityFeed({
  jobs,
  selectedJobId,
  onSelect,
  onFavorite,
}) {
  if (!jobs.length) {
    return (
      <div className="pro-empty">
        <div>◎</div>

        <h3>No opportunities found</h3>

        <p>
          Try changing your filters or
          refreshing JobDrive.
        </p>
      </div>
    );
  }

  return (
    <section className="pro-feed">

      <header className="pro-feed-heading">
        <div>
          <strong>
            {jobs.length} opportunities
          </strong>

          <small>
            M2 internships matching your profile
          </small>
        </div>
      </header>

      <div className="pro-feed-list">
        {jobs.map((job) => {
          const active =
            job.id === selectedJobId;

          return (
            <article
              key={job.id}
              className={
                active
                  ? "pro-feed-card active"
                  : "pro-feed-card"
              }
              onClick={() =>
                onSelect(job.id)
              }
            >
              <div className="pro-feed-card-top">

                <div>
                  <h3>
                    {job.role ||
                      "Internship opportunity"}
                  </h3>

                  <p>
                    <strong>
                      {job.company ||
                        "Company"}
                    </strong>

                    {job.location && (
                      <>
                        <span>•</span>
                        {job.location}
                      </>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  className={
                    job.favorite
                      ? "pro-feed-star active"
                      : "pro-feed-star"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onFavorite(job);
                  }}
                  aria-label="Favorite"
                >
                  {job.favorite
                    ? "★"
                    : "☆"}
                </button>

              </div>

              <div className="pro-feed-tags">

                {job.domain && (
                  <span>
                    {job.domain}
                  </span>
                )}

                {job.mode && (
                  <span>
                    {job.mode}
                  </span>
                )}

                {job.fitScore ? (
                  <span className="match">
                    {job.fitScore}% match
                  </span>
                ) : null}

                {job.priority && (
                  <span className="priority">
                    {job.priority}
                  </span>
                )}

              </div>

              <div className="pro-feed-footer">
                <span>
                  Published{" "}
                  {toDateInput(
                    job.postedDate
                  ) || "—"}
                </span>

                <DeadlineBadge
                  value={job.deadline}
                />
              </div>

            </article>
          );
        })}
      </div>

    </section>
  );
}


function OpportunityDetail({
  job,
  onFavorite,
  onEdit,
}) {
  if (!job) {
    return (
      <section className="pro-opportunity-detail">
        <div className="pro-detail-empty">
          Select an opportunity
        </div>
      </section>
    );
  }

  return (
    <section className="pro-opportunity-detail">

      <header className="pro-detail-sticky">

        <div>
          <h2>
            {job.role ||
              "Internship opportunity"}
          </h2>

          <p>
            {job.company ||
              "Company"}
          </p>
        </div>

        <div className="pro-detail-header-actions">

          <button
            type="button"
            className={
              job.favorite
                ? "pro-detail-favorite active"
                : "pro-detail-favorite"
            }
            onClick={() =>
              onFavorite(job)
            }
            aria-label="Favorite"
          >
            {job.favorite
              ? "★"
              : "☆"}
          </button>

          {job.link && (
            <a
              href={job.link}
              target="_blank"
              rel="noreferrer"
              className="pro-detail-apply"
            >
              Open official offer ↗
            </a>
          )}

        </div>

      </header>

      <div className="pro-detail-scroll">

        <div className="pro-detail-badges">

          {job.fitScore ? (
            <span className="match">
              Match {job.fitScore}%
            </span>
          ) : null}

          {job.priority && (
            <span className="priority">
              {job.priority}
            </span>
          )}

          <span className="status">
            {statusLabel(
              job.status
            )}
          </span>

        </div>

        {job.whyRelevant && (
          <section className="pro-detail-section highlight">
            <h3>
              Why this matches
            </h3>

            <p>
              {job.whyRelevant}
            </p>
          </section>
        )}

        <section className="pro-detail-section">
          <h3>Overview</h3>

          <div className="pro-detail-facts">

            <div>
              <small>Location</small>
              <strong>
                {job.location ||
                  "—"}
              </strong>
            </div>

            <div>
              <small>Work mode</small>
              <strong>
                {job.mode ||
                  "—"}
              </strong>
            </div>

            <div>
              <small>Published</small>
              <strong>
                {toDateInput(
                  job.postedDate
                ) || "—"}
              </strong>
            </div>

            <div>
              <small>Deadline</small>
              <DeadlineBadge
                value={job.deadline}
              />
            </div>

            <div>
              <small>Compensation</small>
              <strong>
                {job.compensation ||
                  "—"}
              </strong>
            </div>

            <div>
              <small>Source</small>
              <strong>
                {job.source ||
                  "—"}
              </strong>
            </div>

          </div>
        </section>

        {job.domain && (
          <section className="pro-detail-section">
            <h3>
              Specialization
            </h3>

            <div className="pro-detail-tags">
              <span>
                {job.domain}
              </span>
            </div>
          </section>
        )}

        {job.description && (
          <section className="pro-detail-section">
            <h3>
              Job description
            </h3>

            <p className="pro-detail-copy">
              {job.description}
            </p>
          </section>
        )}

        <section className="pro-detail-section">

          <div className="pro-detail-section-heading">
            <h3>
              My application
            </h3>

            <button
              type="button"
              onClick={() =>
                onEdit(job)
              }
            >
              Update
            </button>
          </div>

          <div className="pro-detail-facts">

            <div>
              <small>Status</small>
              <strong>
                {statusLabel(
                  job.status
                )}
              </strong>
            </div>

            <div>
              <small>Applied date</small>
              <strong>
                {job.appliedDate ||
                  "—"}
              </strong>
            </div>

            <div>
              <small>Follow-up</small>

              <FollowUpBadge
                value={
                  job.followUpDate
                }
              />
            </div>

          </div>

          {job.notes && (
            <div className="pro-detail-notes">
              <small>
                Notes
              </small>

              <p>
                {job.notes}
              </p>
            </div>
          )}

        </section>

      </div>

    </section>
  );
}


function Pipeline({
  jobs,
  onOpen,
}) {
  return (
    <div className="pro-pipeline">
      {STATUS_OPTIONS.map(
        (status) => {
          const group =
            jobs.filter(
              (job) =>
                job.status === status
            );

          return (
            <section
              className="pro-pipeline-column"
              key={status}
            >
              <header>
                <strong>
                  {statusLabel(status)}
                </strong>

                <span>
                  {group.length}
                </span>
              </header>

              <div>
                {group.map((job) => (
                  <button
                    key={job.id}
                    className="pro-pipeline-card"
                    onClick={() =>
                      onOpen(job)
                    }
                  >
                    <small>
                      {job.company}
                    </small>

                    <strong>
                      {job.role}
                    </strong>

                    <span>
                      {job.fitScore
                        ? `${job.fitScore}% match`
                        : job.type}
                    </span>
                  </button>
                ))}

                {!group.length && (
                  <p className="pro-pipeline-empty">
                    Empty
                  </p>
                )}
              </div>
            </section>
          );
        }
      )}
    </div>
  );
}


function AnalyticsView({ jobs }) {
  const metrics =
    calculateAnalytics(jobs);

  const sources =
    sourceAnalytics(jobs).slice(0, 8);

  return (
    <div className="pro-analytics">
      <div className="pro-conversion-grid">
        <article>
          <span>Application rate</span>
          <strong>
            {metrics.applicationRate}%
          </strong>
          <small>
            {metrics.applications} submitted
          </small>
        </article>

        <article>
          <span>
            Interview conversion
          </span>
          <strong>
            {metrics.interviewRate}%
          </strong>
          <small>
            {metrics.interviews} interviews
          </small>
        </article>

        <article>
          <span>Offer conversion</span>
          <strong>
            {metrics.offerRate}%
          </strong>
          <small>
            {metrics.offers} offers
          </small>
        </article>

        <article>
          <span>Favorites</span>
          <strong>
            {metrics.favorites}
          </strong>
          <small>
            prioritized opportunities
          </small>
        </article>
      </div>

      <section className="pro-analytics-panel">
        <header>
          <div>
            <p className="pro-eyebrow">
              PERFORMANCE
            </p>

            <h2>
              Opportunity sources
            </h2>
          </div>
        </header>

        <div className="pro-source-list">
          {sources.map(
            ({ source, count }) => (
              <div
                className="pro-source-row"
                key={source}
              >
                <span>{source}</span>

                <strong>{count}</strong>
              </div>
            )
          )}

          {!sources.length && (
            <p className="pro-empty-copy">
              No source data yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}


function JobDrawer({
  job,
  saving,
  onClose,
  onSave,
}) {
  const [draft, setDraft] =
    useState(null);

  useEffect(() => {
    if (!job) {
      setDraft(null);
      return;
    }

    setDraft({
      status:
        job.status || "Nouveau",

      favorite:
        Boolean(job.favorite),

      followUpDate:
        toDateInput(
          job.followUpDate
        ),

      notes:
        job.notes || "",
    });
  }, [job]);

  if (!job || !draft) {
    return null;
  }

  return (
    <div
      className="pro-drawer-backdrop"
      onMouseDown={onClose}
    >
      <aside
        className="pro-drawer"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="pro-drawer-header">
          <div>
            <span className="pro-type">
              {job.type}
            </span>

            <h2>
              {job.role}
            </h2>

            <p>
              {job.company}
            </p>
          </div>

          <button
            className="pro-close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="pro-drawer-body">
          <section className="pro-score-summary">
            <div>
              <span
                className={
                  `pro-match ` +
                  matchClass(
                    job.fitScore
                  )
                }
              >
                {job.fitScore
                  ? `${job.fitScore}% Match`
                  : "No score"}
              </span>

              <span
                className={
                  `pro-priority ` +
                  priorityClass(
                    job.priority
                  )
                }
              >
                {job.priority}
              </span>
            </div>

            <DeadlineBadge
              value={job.deadline}
            />
          </section>

          <section className="pro-detail-grid">
            <div>
              <small>Location</small>
              <strong>
                {job.location || "—"}
              </strong>
            </div>

            <div>
              <small>Mode</small>
              <strong>
                {job.mode || "—"}
              </strong>
            </div>

            <div>
              <small>Contract</small>
              <strong>
                {job.contract || "—"}
              </strong>
            </div>

            <div>
              <small>Compensation</small>
              <strong>
                {job.compensation || "—"}
              </strong>
            </div>

            <div>
              <small>Detected</small>
              <strong>
                {job.detectedDate || "—"}
              </strong>
            </div>

            <div>
              <small>Source</small>
              <strong>
                {job.source || "—"}
              </strong>
            </div>
          </section>

          {job.whyRelevant && (
            <section className="pro-drawer-section">
              <h3>Why this matches</h3>

              <p>
                {job.whyRelevant}
              </p>
            </section>
          )}

          <section className="pro-drawer-section">
            <div className="pro-section-heading">
              <h3>
                Application management
              </h3>

              <button
                className={
                  draft.favorite
                    ? "pro-favorite-button active"
                    : "pro-favorite-button"
                }
                onClick={() =>
                  setDraft({
                    ...draft,
                    favorite:
                      !draft.favorite,
                  })
                }
              >
                {draft.favorite
                  ? "★ Favorite"
                  : "☆ Favorite"}
              </button>
            </div>

            <label className="pro-field">
              <span>Status</span>

              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status:
                      event.target.value,
                  })
                }
              >
                {STATUS_OPTIONS.map(
                  (status) => (
                    <option
                      value={status}
                      key={status}
                    >
                      {statusLabel(
                        status
                      )}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="pro-two-fields">
              <label className="pro-field">
                <span>
                  Applied Date
                </span>

                <input
                  value={
                    toDateInput(
                      job.appliedDate
                    ) || "Not submitted"
                  }
                  disabled
                />
              </label>

              <label className="pro-field">
                <span>
                  Follow-up Date
                </span>

                <input
                  type="date"
                  value={
                    draft.followUpDate
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      followUpDate:
                        event.target
                          .value,
                    })
                  }
                />
              </label>
            </div>

            {draft.followUpDate && (
              <FollowUpBadge
                value={
                  draft.followUpDate
                }
              />
            )}

            <label className="pro-field">
              <span>Private Notes</span>

              <textarea
                rows="6"
                value={draft.notes}
                placeholder="Recruiter, interview feedback, preparation notes..."
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    notes:
                      event.target.value,
                  })
                }
              />
            </label>
          </section>

          <section className="pro-activity">
            <h3>Activity</h3>

            <div>
              <span />

              <p>
                <strong>
                  Opportunity detected
                </strong>

                <small>
                  {job.detectedDate ||
                    "Unknown date"}
                </small>
              </p>
            </div>

            {job.appliedDate && (
              <div>
                <span />

                <p>
                  <strong>
                    Application submitted
                  </strong>

                  <small>
                    {job.appliedDate}
                  </small>
                </p>
              </div>
            )}

            {job.followUpDate && (
              <div>
                <span />

                <p>
                  <strong>
                    Follow-up scheduled
                  </strong>

                  <small>
                    {job.followUpDate}
                  </small>
                </p>
              </div>
            )}
          </section>
        </div>

        <footer className="pro-drawer-actions">
          {job.link && (
            <a
              href={job.link}
              target="_blank"
              rel="noreferrer"
              className="pro-secondary-action"
            >
              Open official offer ↗
            </a>
          )}

          <button
            className="pro-primary-action"
            disabled={saving}
            onClick={() =>
              onSave(job, draft)
            }
          >
            {saving
              ? "Saving..."
              : "Save changes"}
          </button>
        </footer>
      </aside>
    </div>
  );
}


export default function AppPro() {
  const [token, setToken] =
    useState("");

  const [jobs, setJobs] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [view, setView] =
    useState("overview");

  const [search, setSearch] =
    useState("");

  const [priority, setPriority] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [specialization, setSpecialization] =
    useState("");

  const [sortMode, setSortMode] =
    useState("newest");

  const [quickFilter, setQuickFilter] =
    useState("");

  const [selectedJob, setSelectedJob] =
    useState(null);

  const [selectedJobId, setSelectedJobId] =
    useState(null);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const expiryTimer =
    useRef(null);


  const loadJobs =
    useCallback(
      async () => {
        if (!token) return;

        setLoading(true);
        setError("");

        try {
          const result =
            await readJobs({
              token,
              spreadsheetId:
                SPREADSHEET_ID,
            });

          const internshipResult =
            filterInternships(result);

          setJobs(internshipResult);
          setLastUpdated(new Date());

          if (selectedJob) {
            const refreshed =
              internshipResult.find(
                (job) =>
                  job.id ===
                  selectedJob.id
              );

            if (refreshed) {
              setSelectedJob(
                refreshed
              );
            }
          }
        } catch (err) {
          if (
            err.status === 401 ||
            err.status === 403
          ) {
            setToken("");

            setError(
              "Google session expired or this account cannot access the JobDrive spreadsheet."
            );
          } else {
            setError(err.message);
          }
        } finally {
          setLoading(false);
        }
      },
      [token, selectedJob]
    );


  useEffect(() => {
    if (token) {
      loadJobs();
    }
  }, [token]);


  useEffect(() => {
    return () => {
      if (expiryTimer.current) {
        clearTimeout(
          expiryTimer.current
        );
      }
    };
  }, []);


  async function connectGoogle() {
    setLoading(true);
    setError("");

    try {
      const response =
        await requestGoogleToken(
          CLIENT_ID
        );

      setToken(
        response.access_token
      );

      const expiresIn =
        Math.max(
          Number(
            response.expires_in || 3600
          ) - 60,
          60
        );

      if (expiryTimer.current) {
        clearTimeout(
          expiryTimer.current
        );
      }

      expiryTimer.current =
        setTimeout(
          () => {
            setToken("");
            setJobs([]);
          },
          expiresIn * 1000
        );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }


  async function logout() {
    const current = token;

    setToken("");
    setJobs([]);
    setSelectedJob(null);

    if (current) {
      await revokeGoogleToken(
        current
      );
    }
  }


  async function toggleFavorite(job) {
    if (!token) return;

    const nextFavorite =
      !job.favorite;

    setJobs((current) =>
      current.map((item) =>
        item.id === job.id
          ? {
              ...item,
              favorite:
                nextFavorite,
            }
          : item
      )
    );

    try {
      await updateJobFields({
        token,
        spreadsheetId:
          SPREADSHEET_ID,
        jobId: job.id,

        patch: {
          favorite:
            nextFavorite,

          lastUpdated:
            new Date().toISOString(),
        },
      });
    } catch (err) {
      setError(err.message);
      loadJobs();
    }
  }


  async function saveJob(
    job,
    draft
  ) {
    setSaving(true);
    setError("");

    try {
      const now =
        new Date().toISOString();

      const patch = {
        status: draft.status,

        favorite:
          draft.favorite,

        followUpDate:
          draft.followUpDate,

        notes:
          draft.notes,

        lastUpdated:
          now,
      };

      if (
        draft.status ===
          "Candidature envoyée" &&
        !job.appliedDate
      ) {
        patch.appliedDate = now;

        if (
          !patch.followUpDate
        ) {
          patch.followUpDate =
            addDaysISO(
              now,
              7
            );
        }
      }

      await updateJobFields({
        token,
        spreadsheetId:
          SPREADSHEET_ID,
        jobId: job.id,
        patch,
      });

      const localUpdate = {
        ...job,
        ...patch,
      };

      setJobs((current) =>
        current.map((item) =>
          item.id === job.id
            ? localUpdate
            : item
        )
      );

      setSelectedJob(
        localUpdate
      );

      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }


  const specializations =
    useMemo(
      () =>
        internshipSpecializations(jobs),
      [jobs]
    );

  const metrics = useMemo(
    () =>
      calculateAnalytics(jobs),
    [jobs]
  );


  const filteredJobs =
    useMemo(() => {
      let result = [...jobs];

      const query =
        search.trim().toLowerCase();

      if (query) {
        result = result.filter(
          (job) =>
            [
              job.company,
              job.role,
              job.domain,
              job.location,
              job.mode,
              job.source,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query)
        );
      }

      if (priority) {
        result = result.filter(
          (job) =>
            job.priority === priority
        );
      }

      if (status) {
        result = result.filter(
          (job) =>
            job.status === status
        );
      }

      if (specialization) {
        result = result.filter(
          (job) =>
            job.domain === specialization
        );
      }

      if (
        quickFilter === "favorites"
      ) {
        result = result.filter(
          (job) => job.favorite
        );
      }

      if (
        quickFilter === "high"
      ) {
        result = result.filter(
          (job) =>
            job.priority === "Haute"
        );
      }

      if (
        quickFilter === "match90"
      ) {
        result = result.filter(
          (job) =>
            job.fitScore >= 90
        );
      }

      if (
        quickFilter === "deadline7"
      ) {
        result = result.filter(
          (job) => {
            const info =
              deadlineInfo(
                job.deadline
              );

return (
              info.days !== null &&
              info.days >= 0 &&
              info.days <= 7
            );
          }
        );
      }

      if (
        quickFilter === "applied"
      ) {
        result = result.filter(
          (job) =>
            job.status ===
            "Candidature envoyée"
        );
      }

      if (
        quickFilter === "interview"
      ) {
        result = result.filter(
          (job) =>
            job.status === "Entretien"
        );
      }

      return sortInternships(
        result,
        sortMode
      );
    }, [
      jobs,
      search,
      priority,
      status,
      specialization,
      quickFilter,
      sortMode,
    ]);


const detailJob =
    useMemo(
      () => {
        if (!filteredJobs.length) {
          return null;
        }

        return (
          filteredJobs.find(
            (job) =>
              job.id ===
              selectedJobId
          ) ||
          filteredJobs[0]
        );
      },
      [
        filteredJobs,
        selectedJobId,
      ]
    );


  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId(null);
      return;
    }

    const exists =
      filteredJobs.some(
        (job) =>
          job.id ===
          selectedJobId
      );

    if (!exists) {
      setSelectedJobId(
        filteredJobs[0].id
      );
    }
  }, [
    filteredJobs,
    selectedJobId,
  ]);


  if (!token) {
    return (
      <LoginScreen
        clientConfigured={
          Boolean(CLIENT_ID)
        }
        loading={loading}
        error={error}
        onLogin={
          connectGoogle
        }
      />
    );
  }





  const viewTitle = {
    overview: "Overview",
    internships: "M2 Internships",
    pipeline: "Application Pipeline",
    analytics: "Career Analytics",
  }[view];


  return (
    <div className="pro-app">

      <header className="pro-topbar">

        <div className="pro-topbar-brand">
          <span className="pro-topbar-logo">
            J
          </span>

          <div>
            <strong>JobDrive</strong>
            <small>
              Career Operating System
            </small>
          </div>
        </div>


        <nav className="pro-topbar-nav">
          {NAV_ITEMS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                view === key ? "active" : ""
              }
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>


        <label className="pro-global-search">
          <span>⌕</span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search jobs..."
          />
        </label>


        <div className="pro-topbar-right">

          <button
            className="pro-topbar-refresh"
            type="button"
            onClick={loadJobs}
            disabled={loading}
          >
            {loading ? "Syncing..." : "↻"}
          </button>

          <div className="pro-live-mini">
            <i />

            <div>
              <strong>Live data</strong>
              <small>Google Sheets</small>
            </div>
          </div>

          <div className="pro-google-mini">
            <span>D</span>

            <div>
              <strong>
                Google connected
              </strong>
              <small>Private Sheet</small>
            </div>
          </div>

          <button
            className="pro-topbar-signout"
            type="button"
            onClick={logout}
          >
            Sign out
          </button>

        </div>

      </header>


      <main className="pro-main">

        {error && (
          <div className="pro-error">
            {error}
          </div>
        )}


        {view !== "pipeline" &&
          view !== "analytics" && (
            <>

              <section className="pro-commandbar">

                <div className="pro-commandbar-title">
                  <strong>
                    {viewTitle}
                  </strong>

                  <span>
                    {filteredJobs.length} opportunities
                  </span>
                </div>


                <div className="pro-command-filters">

                  <select
                    value={specialization}
                    onChange={(event) =>
                      setSpecialization(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Specialization
                    </option>

                    {specializations.map(
                      (item) => (
                        <option
                          value={item}
                          key={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>


                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Priority
                    </option>
                    <option value="Haute">
                      High
                    </option>
                    <option value="Moyenne">
                      Medium
                    </option>
                    <option value="Basse">
                      Low
                    </option>
                  </select>


                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Status
                    </option>

                    {STATUS_OPTIONS.map(
                      (item) => (
                        <option
                          value={item}
                          key={item}
                        >
                          {statusLabel(item)}
                        </option>
                      )
                    )}
                  </select>


                  <select
                    value={sortMode}
                    onChange={(event) =>
                      setSortMode(
                        event.target.value
                      )
                    }
                  >
                    <option value="newest">
                      Newest
                    </option>
                    <option value="deadline">
                      Deadline
                    </option>
                    <option value="match">
                      Best match
                    </option>
                    <option value="priority">
                      Priority
                    </option>
                    <option value="company">
                      Company A–Z
                    </option>
                  </select>

                </div>


                <div className="pro-quick-filters">
                  {QUICK_FILTERS.map(
                    ([key, label]) => (
                      <button
                        key={key || "all"}
                        type="button"
                        className={
                          quickFilter === key
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setQuickFilter(key)
                        }
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>

              </section>


              <div className="pro-opportunity-workspace">

                <OpportunityFeed
                  jobs={filteredJobs}
                  selectedJobId={
                    detailJob?.id
                  }
                  onSelect={
                    setSelectedJobId
                  }
                  onFavorite={
                    toggleFavorite
                  }
                />


                <OpportunityDetail
                  job={detailJob}
                  onFavorite={
                    toggleFavorite
                  }
                  onEdit={
                    setSelectedJob
                  }
                />

              </div>

            </>
          )}


        {view === "pipeline" && (
          <Pipeline
            jobs={jobs}
            onOpen={setSelectedJob}
          />
        )}


        {view === "analytics" && (
          <AnalyticsView jobs={jobs} />
        )}

      </main>

      <JobDrawer
        job={selectedJob}
        saving={saving}
        onClose={() =>
          setSelectedJob(null)
        }
        onSave={saveJob}
      />
    </div>
  );
}
