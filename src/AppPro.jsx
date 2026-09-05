import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./pro.css";
import JobDriveDashboard from "./JobDriveDashboard.jsx";
import CompanyLogo from "./components/CompanyLogo.jsx";

import {
  fetchGoogleProfile,
  requestGoogleToken,
  revokeGoogleToken,
} from "./services/googleAuth";

import {
  readJobs,
  updateJobFields,
  updateDescriptionFields,
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

import {
  refreshOfferDescription,
} from "./offerDescription/runtimeDescriptionRefresh.mjs";

import {
  fetchOfferDescription,
} from "./services/offerDescriptionApi.js";


const CLIENT_ID =
  import.meta.env
    .VITE_GOOGLE_CLIENT_ID || "";

const SPREADSHEET_ID =
  import.meta.env
    .VITE_JOBDRIVE_SPREADSHEET_ID ||
  "1o8n6ghifDv96P9rjJ7Vrzs0D50kTNz5a6DF9jODeMD8";

const OFFER_DESCRIPTION_ENDPOINT =
  import.meta.env
    .VITE_JOBDRIVE_APPS_SCRIPT_URL || "";


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



function domainTags(job = {}) {
  return String(job.domain || "")
    .split(/[\/,|•]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}


function OpportunityFeed({
  jobs,
  selectedJobId,
  onSelect,
  onFavorite,
  sortMode,
  onSortChange,
}) {
  if (!jobs.length) {
    return (
      <section className="pro-feed">
        <div className="pro-empty">
          <div>◎</div>
          <h3>No opportunities found</h3>
          <p>
            Adjust your filters to continue.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="pro-feed">

      <header className="pro-feed-heading">
        <strong>
          {jobs.length} internships
        </strong>

        <label className="pro-feed-sort">
          <span>☷ Sort:</span>

          <select
            value={sortMode}
            onChange={(event) =>
              onSortChange(
                event.target.value
              )
            }
          >
            <option value="recommended">
              Recommended
            </option>
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
        </label>
      </header>


      <div className="pro-feed-list">

        {jobs.map((job) => {

          const active =
            job.id === selectedJobId;

          const deadline =
            deadlineInfo(job.deadline);

          const tags =
            domainTags(job);

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

              <CompanyLogo
                company={job.company}
                link={job.link}
                source={job.source}
                companyDomain={job.companyDomain}
                logoUrl={job.logoUrl}
              />


              <div className="pro-card-body">

                <div className="pro-card-topline">

                  {job.fitScore ? (
                    <span className="pro-card-match-top">
                      {job.fitScore}% MATCH
                    </span>
                  ) : (
                    <span />
                  )}


                  {deadline.days !== null &&
                  deadline.days >= 0 ? (
                    <span className="pro-card-days">
                      {deadline.days}d left
                    </span>
                  ) : null}

                </div>


                <div className="pro-card-title-row">

                  <div>
                    <h3>
                      {job.role ||
                        "Internship opportunity"}
                    </h3>

                    <strong>
                      {job.company ||
                        "Company"}
                    </strong>
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


                <div className="pro-card-meta">

                  {job.location && (
                    <span>
                      ◉ {job.location}
                    </span>
                  )}

                  {job.postedDate && (
                    <span>
                      ▣ Published{" "}
                      {toDateInput(
                        job.postedDate
                      )}
                    </span>
                  )}

                </div>


                {tags.length > 0 && (
                  <div className="pro-card-skills">

                    {tags.slice(0, 3)
                      .map((tag) => (
                        <span key={tag}>
                          {tag}
                        </span>
                      ))}

                    {tags.length > 3 && (
                      <span>
                        +{tags.length - 3}
                      </span>
                    )}

                  </div>
                )}

              </div>

            </article>
          );
        })}

      </div>


      <footer className="pro-feed-pagination">

        <span>
          Showing 1 to {jobs.length} of{" "}
          {jobs.length}
        </span>

        <div>
          <button
            type="button"
            disabled
          >
            ‹
          </button>

          <button
            type="button"
            className="active"
          >
            1
          </button>

          <button
            type="button"
            disabled
          >
            ›
          </button>
        </div>

      </footer>

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


  const deadline =
    deadlineInfo(job.deadline);

  const score =
    Math.max(
      0,
      Math.min(
        100,
        Number(job.fitScore || 0)
      )
    );

  const tags =
    domainTags(job);

  const scoreBreakdown =
    job.scoreBreakdown &&
    typeof job.scoreBreakdown === "object"
      ? job.scoreBreakdown
      : {};

  const scoringStrengths =
    Array.isArray(job.scoringStrengths)
      ? job.scoringStrengths
      : [];

  const scoringWeaknesses =
    Array.isArray(job.scoringWeaknesses)
      ? job.scoringWeaknesses
      : [];

  const hasFitIntelligence =
    Boolean(
      job.scoreGrade ||
      job.scoringVersion ||
      Object.keys(scoreBreakdown).length ||
      scoringStrengths.length ||
      scoringWeaknesses.length
    );


  return (
    <section className="pro-opportunity-detail">


      <header className="pro-detail-sticky">

        <div className="pro-detail-main-heading">

          <span className="pro-stage-badge">
            STAGE M2
          </span>


          <h2>
            {job.role ||
              "Internship opportunity"}
          </h2>


          <p className="pro-detail-company">
            {job.company || "Company"}
          </p>


          {job.location && (
            <p className="pro-detail-location">
              ◉ {job.location}
            </p>
          )}

        </div>


        <div className="pro-detail-header-actions">

          <button
            type="button"
            className={
              job.favorite
                ? "pro-detail-save active"
                : "pro-detail-save"
            }
            onClick={() =>
              onFavorite(job)
            }
          >
            {job.favorite
              ? "★ Saved"
              : "☆ Save"}
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


        <div className="pro-detail-statusline">

          <div className="pro-detail-badges">

            {job.fitScore ? (
              <span className="match">
                Match {job.fitScore}%
              </span>
            ) : null}


            {job.priority && (
              <span className="priority">
                {job.priority === "Haute"
                  ? "Haute priorité"
                  : job.priority}
              </span>
            )}


            <span className="status">
              {statusLabel(job.status)}
            </span>

          </div>


          <div className="pro-detail-date-info">

            {deadline.days !== null &&
            deadline.days >= 0 && (
              <strong>
                ▣ {deadline.days} days left
              </strong>
            )}

            {job.postedDate && (
              <span>
                Published{" "}
                {toDateInput(
                  job.postedDate
                )}
              </span>
            )}

          </div>

        </div>


        <section className="pro-detail-section highlight pro-match-summary">

          <div className="pro-match-copy">

            <h3>
              Why this matches
            </h3>

            <p>
              {job.whyRelevant ||
                "This opportunity aligns with your M2 target profile and technical specialization."}
            </p>

          </div>


          <div
            className="pro-match-ring"
            style={{
              "--match-value":
                `${score * 3.6}deg`,
            }}
          >
            <div>
              <strong>
                {score}%
              </strong>
              <span>Match</span>
            </div>
          </div>

        </section>


        {hasFitIntelligence && (
          <section className="pro-detail-section">

            <div className="pro-detail-section-heading">
              <h3>Fit Intelligence</h3>

              {job.scoreGrade && (
                <span>
                  Grade {job.scoreGrade}
                </span>
              )}
            </div>

            <dl className="pro-detail-list">
              {[
                ["Technical alignment", scoreBreakdown.alignment, 45],
                ["Technical quality", scoreBreakdown.technicalQuality, 20],
                ["Company & environment", scoreBreakdown.companyQuality, 15],
                ["Practical fit", scoreBreakdown.practicalFit, 10],
                ["Freshness", scoreBreakdown.freshness, 5],
                ["Compensation", scoreBreakdown.compensation, 5],
              ].map(([label, value, maximum]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {Number.isFinite(Number(value))
                      ? `${value}/${maximum}`
                      : "—"}
                  </dd>
                </div>
              ))}
            </dl>

            {scoringStrengths.length > 0 && (
              <div className="pro-detail-copy">
                <strong>Strengths</strong>
                <ul>
                  {scoringStrengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {scoringWeaknesses.length > 0 && (
              <div className="pro-detail-copy">
                <strong>Watch-outs</strong>
                <ul>
                  {scoringWeaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

          </section>
        )}


        <div className="pro-detail-two-column">


          <section className="pro-detail-section">

            <h3>
              Job details
            </h3>


            <dl className="pro-detail-list">

              <div>
                <dt>Type</dt>
                <dd>
                  {job.type || "Stage M2"}
                </dd>
              </div>

              <div>
                <dt>Contract</dt>
                <dd>
                  {job.contract || "—"}
                </dd>
              </div>

              <div>
                <dt>Location</dt>
                <dd>
                  {job.location || "—"}
                </dd>
              </div>

              <div>
                <dt>Work mode</dt>
                <dd>
                  {job.mode || "—"}
                </dd>
              </div>

              <div>
                <dt>Domain</dt>
                <dd>
                  {job.domain || "—"}
                </dd>
              </div>

              <div>
                <dt>Compensation</dt>
                <dd>
                  {job.compensation || "—"}
                </dd>
              </div>

            </dl>

          </section>


          <section className="pro-detail-section">

            <div className="pro-detail-section-heading">

              <h3>
                Your tracking
              </h3>

            </div>


            <dl className="pro-detail-list">

              <div>
                <dt>Status</dt>
                <dd>
                  <span className="pro-track-status">
                    {statusLabel(
                      job.status
                    )}
                  </span>
                </dd>
              </div>

              <div>
                <dt>Applied</dt>
                <dd>
                  {job.appliedDate ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>Follow-up</dt>
                <dd>
                  {job.followUpDate ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>Priority</dt>
                <dd>
                  {job.priority ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>Notes</dt>
                <dd>
                  {job.notes ||
                    "—"}
                </dd>
              </div>

            </dl>


            <button
              type="button"
              className="pro-update-tracking"
              onClick={() =>
                onEdit(job)
              }
            >
              Update tracking ✎
            </button>

          </section>

        </div>


        <section className="pro-detail-section pro-skills-panel">

          <h3>
            Skills & technologies
          </h3>


          <div className="pro-detail-tags">

            {tags.length ? (
              tags.map((tag) => (
                <span key={tag}>
                  {tag}
                </span>
              ))
            ) : (
              <span>
                Not specified
              </span>
            )}

          </div>

        </section>


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

  const [userProfile, setUserProfile] =
    useState(null);

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
    useState("recommended");

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

          let enrichedInternships =
            internshipResult;

          try {
            enrichedInternships =
              await Promise.all(
                internshipResult.map(
                  async (job) =>
                    refreshOfferDescription({
                      job,

                      discoveryDescription:
                        job.discoveryDescription ||
                        "",

                      fetchDescription:
                        async (offer) =>
                          fetchOfferDescription({
                            endpoint:
                              OFFER_DESCRIPTION_ENDPOINT,

                            offerUrl:
                              offer.link,
                          }),

                      persistDescription:
                        async (patch) =>
                          updateDescriptionFields({
                            token,

                            spreadsheetId:
                              SPREADSHEET_ID,

                            jobId:
                              job.id,

                            patch,
                          }),
                    })
                )
              );
          } catch (descriptionError) {
            console.warn(
              "Offer description enrichment failed:",
              descriptionError
            );

            enrichedInternships =
              internshipResult;
          }

          setJobs(enrichedInternships);
          setLastUpdated(new Date());

          if (selectedJob) {
            const refreshed =
              enrichedInternships.find(
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

      try {
        const profile =
          await fetchGoogleProfile(
            response.access_token
          );

        setUserProfile(profile);
      } catch (profileError) {
        console.warn(
          "Google profile unavailable:",
          profileError
        );

        setUserProfile(null);
      }

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
            setUserProfile(null);
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
    setUserProfile(null);

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





  const alternateContent =
    view === "pipeline" ? (
      <Pipeline
        jobs={jobs}
        onOpen={setSelectedJob}
      />
    ) : view === "analytics" ? (
      <AnalyticsView
        jobs={jobs}
      />
    ) : null;


  return (
    <>
      <JobDriveDashboard
        userProfile={userProfile}
        view={view}
        onViewChange={setView}
        jobs={filteredJobs}
        selectedJob={detailJob}
        onSelectJob={setSelectedJobId}
        onFavorite={toggleFavorite}
        onEdit={setSelectedJob}
        search={search}
        onSearch={setSearch}
        sortMode={sortMode}
        onSortMode={setSortMode}
        onQuickFilter={setQuickFilter}
        onSpecialization={setSpecialization}
        onLogout={logout}
        alternateContent={alternateContent}
      />

      <JobDrawer
        job={selectedJob}
        saving={saving}
        onClose={() =>
          setSelectedJob(null)
        }
        onSave={saveJob}
      />
    </>
  );
}
