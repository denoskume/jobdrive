import {
  useEffect,
  useState,
} from "react";

import {
  deadlineInfo,
  statusLabel,
  toDateInput,
} from "./utils/jobDrive.mjs";

import CompanyLogo from "./components/CompanyLogo.jsx";

import "./jobdrive-dashboard.css";



function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
}) {
  const icons = {

    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),

    pipeline: (
      <>
        <path d="M6 3v18" />
        <path d="M18 3v18" />
        <path d="M6 7h12" />
        <path d="M6 17h12" />
        <circle cx="6" cy="7" r="2" />
        <circle cx="18" cy="17" r="2" />
      </>
    ),

    analytics: (
      <>
        <path d="M4 20V10" />
        <path d="M10 20V4" />
        <path d="M16 20v-7" />
        <path d="M22 20V7" />
      </>
    ),

    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),

    companies: (
      <>
        <path d="M4 21V5l8-3v19" />
        <path d="M12 8h8v13" />
        <path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1L5 6.1 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
      </>
    ),

    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),

    moon: (
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />
    ),

    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),

    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </>
    ),

    send: (
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    award: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="m8 13-2 9 6-3 6 3-2-9" />
      </>
    ),

    star: (
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    ),

    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),

    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),

    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] || null}
    </svg>
  );
}


function splitTags(value = "") {
  return String(value)
    .split(/[\/,|•]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}


function KPI({
  label,
  value,
  hint,
  icon,
  tone,
}) {
  return (
    <article className={`jd-kpi ${tone}`}>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>

      <i>
        <Icon
          name={icon}
          size={30}
          strokeWidth={1.55}
        />
      </i>
    </article>
  );
}


function Sidebar({
  view,
  onViewChange,
  jobs,
  onHighMatch,
  onUrgent,
  onAI,
  onShortlist,
}) {
  const [detailJobId, setDetailJobId] =
    useState(null);


  const modalJob =
    detailJobId
      ? jobs.find(
          (job) =>
            job.id === detailJobId
        ) || null
      : null;


  const openJobDetail = (jobId) => {
    onSelectJob(jobId);
    setDetailJobId(jobId);
  };


  const closeJobDetail = () => {
    setDetailJobId(null);
  };


  const highMatch =
    jobs.filter(
      (job) =>
        Number(job.fitScore || 0) >= 85
    ).length;

  const urgent =
    jobs.filter((job) => {
      const info =
        deadlineInfo(job.deadline);

      return (
        info.days !== null &&
        info.days >= 0 &&
        info.days <= 7
      );
    }).length;

  const shortlist =
    jobs.filter(
      (job) => job.favorite
    ).length;

  return (
    <aside className="jd-sidebar">

      <div className="jd-brand">
        <span className="jd-brand-logo">
          J
        </span>

        <div>
          <strong>JobDrive</strong>
          <small>M2 Internship Tracker</small>
        </div>
      </div>


      <nav className="jd-nav">

        <button
          className={
            view === "overview"
              ? "active"
              : ""
          }
          onClick={() =>
            onViewChange("overview")
          }
        >
          <Icon name="overview" />
          Overview
        </button>

        <button
          className={
            view === "pipeline"
              ? "active"
              : ""
          }
          onClick={() =>
            onViewChange("pipeline")
          }
        >
          <Icon name="pipeline" />
          Pipeline
        </button>

        <button
          className={
            view === "analytics"
              ? "active"
              : ""
          }
          onClick={() =>
            onViewChange("analytics")
          }
        >
          <Icon name="analytics" />
          Analytics
        </button>

        <button>
          <Icon name="calendar" />
          Calendar
        </button>

        <button>
          <Icon name="companies" />
          Companies
        </button>

        <button>
          <Icon name="bell" />
          Alerts
        </button>

        <button>
          <Icon name="settings" />
          Settings
        </button>

      </nav>


      <div className="jd-saved">

        <h6>FILTERS SAVED</h6>

        <button onClick={onHighMatch}>
          <i className="purple" />
          High Match
          <span>{highMatch}</span>
        </button>

        <button onClick={onUrgent}>
          <i className="orange" />
          Urgent Deadlines
          <span>{urgent}</span>
        </button>

        <button onClick={onAI}>
          <i className="cyan" />
          AI / Deep Learning
        </button>

        <button onClick={onShortlist}>
          <i className="pink" />
          My Shortlist
          <span>{shortlist}</span>
        </button>

      </div>


      <div className="jd-profile">

        <div className="jd-profile-head">
          <span>DK</span>

          <div>
            <strong>Denos K.</strong>
            <small>M2 DASSIP – ECN</small>
          </div>
        </div>

        <div className="jd-profile-label">
          <span>Profile match</span>
          <strong>82%</strong>
        </div>

        <div className="jd-profile-bar">
          <i />
        </div>

      </div>

    </aside>
  );
}


function Topbar({
  search,
  onSearch,
  onLogout,
}) {
  return (
    <header className="jd-topbar">

      <label className="jd-search">

        <Icon
          name="search"
          size={17}
        />

        <input
          type="search"
          value={search}
          onChange={(event) =>
            onSearch(event.target.value)
          }
          placeholder="Search companies, roles, skills, technologies..."
        />

        <kbd>⌘ K</kbd>

      </label>


      <div className="jd-top-actions">

        <button>
          <Icon
            name="bell"
            size={18}
          />
          <b>3</b>
        </button>

        <button>
          <Icon
            name="moon"
            size={18}
          />
        </button>

        <button
          className="jd-avatar"
          onClick={onLogout}
          title="Sign out"
        >
          DK
          <i />
        </button>

      </div>

    </header>
  );
}


function JobFeed({
  jobs,
  selectedJobId,
  onSelect,
  onFavorite,
  sortMode,
  onSortMode,
}) {
  return (
    <section className="jd-feed">

      <header className="jd-feed-header">
        <strong>
          {jobs.length} internships
        </strong>

        <label>
          <span>Sort:</span>

          <select
            value={sortMode}
            onChange={(event) =>
              onSortMode(
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
        </label>
      </header>


      <div className="jd-job-list">

        {jobs.map((job) => {
          const active =
            job.id === selectedJobId;

          const deadline =
            deadlineInfo(
              job.deadline
            );

          const tags =
            splitTags(job.domain);

          return (
            <article
              key={job.id}
              className={
                active
                  ? "jd-job-card active"
                  : "jd-job-card"
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


              <div className="jd-job-body">

                <div className="jd-job-top">

                  {job.fitScore ? (
                    <span className="jd-match-mini">
                      {job.fitScore}% MATCH
                    </span>
                  ) : (
                    <span />
                  )}

                  {deadline.days !== null &&
                  deadline.days >= 0 && (
                    <strong className="jd-days">
                      {deadline.days}d left
                    </strong>
                  )}

                </div>


                <div className="jd-job-title">

                  <div>
                    <h3>
                      {job.role ||
                        "Internship opportunity"}
                    </h3>

                    <p>
                      {job.company ||
                        "Company"}
                    </p>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onFavorite(job);
                    }}
                  >
                    <Icon
                      name="star"
                      size={18}
                    />
                  </button>

                </div>


                <div className="jd-job-meta">

                  {job.location && (
                    <span>
                      <Icon
                        name="location"
                        size={14}
                      />
                      {job.location}
                    </span>
                  )}

                  {job.postedDate && (
                    <span>
                      <Icon
                        name="calendar"
                        size={14}
                      />
                      Published{" "}
                      {toDateInput(
                        job.postedDate
                      )}
                    </span>
                  )}

                </div>


                {tags.length > 0 && (
                  <div className="jd-job-tags">
                    {tags
                      .slice(0, 3)
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


      <footer className="jd-feed-footer">

        <span>
          Showing 1 to {jobs.length} of{" "}
          {jobs.length}
        </span>

        <div>
          <button disabled>‹</button>
          <button className="active">
            1
          </button>
          <button disabled>›</button>
        </div>

      </footer>

    </section>
  );
}


function MatchRing({ score }) {
  const safe =
    Math.max(
      0,
      Math.min(
        100,
        Number(score || 0)
      )
    );

  return (
    <div
      className="jd-match-ring"
      style={{
        "--score":
          `${safe * 3.6}deg`,
      }}
    >
      <div>
        <strong>{safe}%</strong>
        <span>Match</span>
      </div>
    </div>
  );
}


function JobDetail({
  job,
  onFavorite,
  onEdit,
}) {
  if (!job) {
    return (
      <section className="jd-detail">
        <div className="jd-no-selection">
          Select an opportunity
        </div>
      </section>
    );
  }

  const deadline =
    deadlineInfo(job.deadline);

  const tags =
    splitTags(job.domain);

  return (
    <section className="jd-detail">

      <header className="jd-detail-header">

        <div className="jd-detail-title">

          <span className="jd-stage">
            STAGE M2
          </span>

          <h1>
            {job.role ||
              "Internship opportunity"}
          </h1>

          <h2>
            {job.company || "Company"}
          </h2>

          {job.location && (
            <p>
              <Icon
                name="location"
                size={16}
              />
              {job.location}
            </p>
          )}

        </div>


        <div className="jd-detail-actions">

          <button
            className="jd-save"
            onClick={() =>
              onFavorite(job)
            }
          >
            <Icon
              name="star"
              size={16}
            />
            Save
          </button>

          {job.link && (
            <a
              href={job.link}
              target="_blank"
              rel="noreferrer"
            >
              Open official offer
              <span>↗</span>
            </a>
          )}

        </div>

      </header>


      <div className="jd-detail-scroll">

        <div className="jd-status-row">

          <div className="jd-badges">

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


          <div className="jd-deadline">

            {deadline.days !== null &&
            deadline.days >= 0 && (
              <strong>
                <Icon
                  name="calendar"
                  size={14}
                />
                {deadline.days} days left
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


        <section className="jd-match-card">

          <div>
            <h3>
              Why this matches
            </h3>

            <p>
              {job.whyRelevant ||
                "Strong alignment with your technical profile and M2 internship objectives."}
            </p>
          </div>

          <MatchRing
            score={job.fitScore}
          />

        </section>


        <div className="jd-detail-columns">

          <section className="jd-info-card">

            <h3>
              Job details
            </h3>

            <dl>
              <div>
                <dt>Type</dt>
                <dd>
                  {job.type ||
                    "Stage M2"}
                </dd>
              </div>

              <div>
                <dt>Contract</dt>
                <dd>
                  {job.contract ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>Location</dt>
                <dd>
                  {job.location ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>Work mode</dt>
                <dd>
                  {job.mode ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>Domain</dt>
                <dd>
                  {job.domain ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>Compensation</dt>
                <dd>
                  {job.compensation ||
                    "—"}
                </dd>
              </div>
            </dl>

          </section>


          <section className="jd-info-card">

            <h3>
              Your tracking
            </h3>

            <dl>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className="jd-track-status">
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
              className="jd-update"
              onClick={() =>
                onEdit(job)
              }
            >
              Update tracking
              <span>✎</span>
            </button>

          </section>

        </div>


        <section className="jd-skills">

          <h3>
            Skills & technologies
          </h3>

          <div>
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

      </div>

    </section>
  );
}



function FullscreenJobDetail({
  job,
  onClose,
  onFavorite,
  onEdit,
}) {
  useEffect(() => {
    if (!job) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [job, onClose]);


  if (!job) {
    return null;
  }


  return (
    <div
      className="jd-detail-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <section
        className="jd-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          job.role ||
          "Internship details"
        }
      >

        <button
          type="button"
          className="jd-detail-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <Icon
            name="close"
            size={21}
          />
        </button>


        <JobDetail
          job={job}
          onFavorite={onFavorite}
          onEdit={onEdit}
        />

      </section>

    </div>
  );
}


export default function JobDriveDashboard({
  view,
  onViewChange,
  jobs,
  selectedJob,
  onSelectJob,
  onFavorite,
  onEdit,
  search,
  onSearch,
  sortMode,
  onSortMode,
  onQuickFilter,
  onSpecialization,
  onLogout,
  alternateContent,
}) {

  const [detailJobId, setDetailJobId] =
    useState(null);


  const modalJob =
    detailJobId
      ? jobs.find(
          (job) =>
            job.id === detailJobId
        ) || null
      : null;


  const openJobDetail = (jobId) => {
    onSelectJob(jobId);
    setDetailJobId(jobId);
  };


  const closeJobDetail = () => {
    setDetailJobId(null);
  };


  const highMatch =
    jobs.filter(
      (job) =>
        Number(job.fitScore || 0) >= 85
    ).length;

  const applied =
    jobs.filter((job) =>
      [
        "Candidature envoyée",
        "Entretien",
        "Offre",
        "Accepté",
      ].includes(job.status)
    ).length;

  const interviews =
    jobs.filter((job) =>
      [
        "Entretien",
        "Offre",
        "Accepté",
      ].includes(job.status)
    ).length;

  const offers =
    jobs.filter((job) =>
      [
        "Offre",
        "Accepté",
      ].includes(job.status)
    ).length;

  const percent = (value) =>
    jobs.length
      ? Math.round(
          value / jobs.length * 100
        )
      : 0;

  return (
    <div className="jd-shell">

      <Sidebar
        view={view}
        onViewChange={onViewChange}
        jobs={jobs}
        onHighMatch={() =>
          onQuickFilter("match90")
        }
        onUrgent={() =>
          onQuickFilter("deadline7")
        }
        onAI={() =>
          onSpecialization(
            "Machine Learning"
          )
        }
        onShortlist={() =>
          onQuickFilter("favorites")
        }
      />


      <main className="jd-main">

        <Topbar
          search={search}
          onSearch={onSearch}
          onLogout={onLogout}
        />


        {view === "overview" ? (
          <>

            <section className="jd-kpis">

              <KPI
                label="TOTAL INTERNSHIPS"
                value={jobs.length}
                hint="100% industry"
                icon="briefcase"
                tone="purple"
              />

              <KPI
                label="HIGH MATCH"
                value={highMatch}
                hint="≥ 85% match"
                icon="target"
                tone="green"
              />

              <KPI
                label="APPLIED"
                value={applied}
                hint={`${percent(applied)}%`}
                icon="send"
                tone="blue"
              />

              <KPI
                label="INTERVIEWS"
                value={interviews}
                hint={`${percent(interviews)}%`}
                icon="user"
                tone="orange"
              />

              <KPI
                label="OFFERS"
                value={offers}
                hint={`${percent(offers)}%`}
                icon="award"
                tone="purple"
              />

            </section>


            <section className="jd-workspace jd-internship-stage">

              <JobFeed
                jobs={jobs}
                selectedJobId={
                  modalJob?.id
                }
                onSelect={
                  openJobDetail
                }
                onFavorite={
                  onFavorite
                }
                sortMode={sortMode}
                onSortMode={
                  onSortMode
                }
              />

            </section>


            <FullscreenJobDetail
              job={modalJob}
              onClose={
                closeJobDetail
              }
              onFavorite={
                onFavorite
              }
              onEdit={onEdit}
            />

          </>
        ) : (
          <div className="jd-alternate">
            {alternateContent}
          </div>
        )}

      </main>

    </div>
  );
}
