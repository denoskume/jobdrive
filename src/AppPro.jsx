import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./pro.css";
import JobDriveDashboard from "./JobDriveDashboard.jsx";
import ActionCenterView from "./actions/ActionCenterView.jsx";

import {
  fetchGoogleProfile,
  requestGoogleToken,
  revokeGoogleToken,
} from "./services/googleAuth";

import {
  readDiscoveryCoverage,
  readJobs,
  updateDescriptionFields,
  updateJobFields,
} from "./services/sheetsApi";

import {
  STATUS_OPTIONS,
  addDaysISO,
  calculateAnalytics,
  deadlineInfo,
  filterInternships,
  sortInternships,
  sourceAnalytics,
  statusLabel,
  toDateInput,
} from "./utils/jobDrive.mjs";

import {
  emptyCoverageSnapshot,
  normalizeCoverageRows,
} from "./discovery/coverage.mjs";

import {
  refreshOfferDescription,
} from "./offerDescription/runtimeDescriptionRefresh.mjs";

import {
  fetchOfferDescription,
} from "./services/offerDescriptionApi.js";

import {
  actionKpi as calculateActionKpi,
  buildActionItems,
  evaluateAction,
} from "./actions/actionEngine.mjs";

import {
  buildCompletedFollowUpPatch,
  buildScheduleFollowUpPatch,
} from "./actions/followUpActions.mjs";

const CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const SPREADSHEET_ID =
  import.meta.env.VITE_JOBDRIVE_SPREADSHEET_ID ||
  "1o8n6ghifDv96P9rjJ7Vrzs0D50kTNz5a6DF9jODeMD8";

const OFFER_DESCRIPTION_ENDPOINT =
  import.meta.env.VITE_JOBDRIVE_APPS_SCRIPT_URL || "";

function LoginScreen({ clientConfigured, loading, error, onLogin }) {
  return (
    <main className="pro-login">
      <section className="pro-login-card">
        <div className="pro-login-logo"><span>J</span></div>
        <p className="pro-eyebrow">JOB SEARCH COMMAND CENTER</p>
        <h1>JobDrive Pro</h1>
        <p className="pro-login-copy">Your private career opportunity tracker.</p>

        <div className="pro-private-note">
          <span>●</span>
          <div>
            <strong>Private Google Sheet access</strong>
            <p>
              Application notes, follow-ups and status changes are loaded only
              after Google authorization.
            </p>
          </div>
        </div>

        {!clientConfigured ? (
          <div className="pro-config-error">
            <strong>Google OAuth setup required</strong>
            <p>Repository variable <code>VITE_GOOGLE_CLIENT_ID</code> is not configured yet.</p>
          </div>
        ) : (
          <button
            className="pro-google-button"
            onClick={onLogin}
            disabled={loading}
          >
            <span>G</span>
            {loading ? "Connecting..." : "Sign in with Google"}
          </button>
        )}

        {error && <p className="pro-auth-error">{error}</p>}
        <small className="pro-login-footer">No Google password is stored by JobDrive.</small>
      </section>
    </main>
  );
}

function Pipeline({ jobs, onOpen }) {
  return (
    <div className="pro-pipeline">
      {STATUS_OPTIONS.map((status) => {
        const group = jobs.filter((job) => job.status === status);
        return (
          <section className="pro-pipeline-column" key={status}>
            <header>
              <strong>{statusLabel(status)}</strong>
              <span>{group.length}</span>
            </header>
            <div>
              {group.map((job) => (
                <button
                  key={job.id}
                  className="pro-pipeline-card"
                  onClick={() => onOpen(job)}
                >
                  <small>{job.company}</small>
                  <strong>{job.role}</strong>
                  <span>{job.fitScore ? `${job.fitScore}% match` : job.type}</span>
                </button>
              ))}
              {!group.length && <p className="pro-pipeline-empty">Empty</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AnalyticsView({ jobs }) {
  const metrics = calculateAnalytics(jobs);
  const sources = sourceAnalytics(jobs).slice(0, 8);

  return (
    <div className="pro-analytics">
      <div className="pro-conversion-grid">
        <article>
          <span>Application rate</span>
          <strong>{metrics.applicationRate}%</strong>
          <small>{metrics.applications} submitted</small>
        </article>
        <article>
          <span>Interview conversion</span>
          <strong>{metrics.interviewRate}%</strong>
          <small>{metrics.interviews} interviews</small>
        </article>
        <article>
          <span>Offer conversion</span>
          <strong>{metrics.offerRate}%</strong>
          <small>{metrics.offers} offers</small>
        </article>
        <article>
          <span>Favorites</span>
          <strong>{metrics.favorites}</strong>
          <small>prioritized opportunities</small>
        </article>
      </div>

      <section className="pro-analytics-panel">
        <header>
          <div>
            <p className="pro-eyebrow">PERFORMANCE</p>
            <h2>Opportunity sources</h2>
          </div>
        </header>
        <div className="pro-source-list">
          {sources.map(({ source, count }) => (
            <div className="pro-source-row" key={source}>
              <span>{source}</span>
              <strong>{count}</strong>
            </div>
          ))}
          {!sources.length && <p className="pro-empty-copy">No source data yet.</p>}
        </div>
      </section>
    </div>
  );
}

function FitIntelligence({ job }) {
  const scoreBreakdown =
    job.scoreBreakdown && typeof job.scoreBreakdown === "object"
      ? job.scoreBreakdown
      : {};
  const strengths = Array.isArray(job.scoringStrengths) ? job.scoringStrengths : [];
  const weaknesses = Array.isArray(job.scoringWeaknesses) ? job.scoringWeaknesses : [];

  if (
    !job.scoreGrade &&
    !job.scoringVersion &&
    !Object.keys(scoreBreakdown).length &&
    !strengths.length &&
    !weaknesses.length
  ) {
    return null;
  }

  return (
    <section className="pro-drawer-section">
      <h3>Fit Intelligence {job.scoreGrade ? `· Grade ${job.scoreGrade}` : ""}</h3>
      <div className="pro-detail-grid">
        {[
          ["Alignment", scoreBreakdown.alignment, 45],
          ["Technical", scoreBreakdown.technicalQuality, 20],
          ["Company", scoreBreakdown.companyQuality, 15],
          ["Practical", scoreBreakdown.practicalFit, 10],
          ["Freshness", scoreBreakdown.freshness, 5],
          ["Compensation", scoreBreakdown.compensation, 5],
        ].map(([label, value, maximum]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{Number.isFinite(Number(value)) ? `${value}/${maximum}` : "—"}</strong>
          </div>
        ))}
      </div>
      {strengths.length > 0 && <p>{strengths.join(" · ")}</p>}
      {weaknesses.length > 0 && <p>{weaknesses.join(" · ")}</p>}
    </section>
  );
}

function priorityClass(priority) {
  if (priority === "Haute") return "high";
  if (priority === "Moyenne") return "medium";
  return "low";
}

function matchClass(score) {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  return "moderate";
}

function DeadlineBadge({ deadline }) {
  const info = deadlineInfo(deadline);
  if (info.state === "none") {
    return <span className="pro-deadline neutral">No deadline</span>;
  }
  if (info.state === "expired") {
    return <span className="pro-deadline expired">Expired</span>;
  }
  if (info.days <= 3) {
    return <span className="pro-deadline urgent">Deadline · {info.days}d</span>;
  }
  if (info.days <= 7) {
    return <span className="pro-deadline soon">Deadline · {info.days}d</span>;
  }
  return <span className="pro-deadline">Deadline · {deadline}</span>;
}

function FollowUpBadge({ job }) {
  if (!job.followUpDate) return null;
  const info = deadlineInfo(job.followUpDate);
  if (info.state === "expired") {
    return <span className="pro-followup overdue">Follow-up overdue</span>;
  }
  if (info.state === "future" && info.days <= 2) {
    return <span className="pro-followup">Follow-up in {info.days}d</span>;
  }
  return <span className="pro-followup">Follow-up · {job.followUpDate}</span>;
}

function JobDrawer({ job, saving, onClose, onSave }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!job) {
      setDraft(null);
      return;
    }

    setDraft({
      status: job.status || "Nouveau",
      favorite: Boolean(job.favorite),
      followUpDate: toDateInput(job.followUpDate),
      notes: job.notes || "",
    });
  }, [job]);

  if (!job || !draft) return null;

  return (
    <div className="pro-drawer-backdrop" onMouseDown={onClose}>
      <aside className="pro-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header className="pro-drawer-header">
          <div>
            <span className="pro-type">{job.type}</span>
            <h2>{job.role}</h2>
            <p>{job.company}</p>
          </div>
          <button className="pro-close" onClick={onClose}>×</button>
        </header>

        <div className="pro-drawer-body">
          <section className="pro-score-summary">
            <div>
              <span className={`pro-match ${matchClass(job.fitScore)}`}>
                {job.fitScore ? `${job.fitScore}% Match` : "No score"}
              </span>
              {job.priority && (
                <span className={`pro-priority ${priorityClass(job.priority)}`}>
                  {job.priority}
                </span>
              )}
            </div>
            <DeadlineBadge deadline={job.deadline} />
          </section>

          <section className="pro-detail-grid">
            <div><small>Location</small><strong>{job.location || "Not specified"}</strong></div>
            <div><small>Mode</small><strong>{job.mode || "Not specified"}</strong></div>
            <div><small>Contract</small><strong>{job.contract || "Not specified"}</strong></div>
            <div><small>Compensation</small><strong>{job.compensation || "Not specified"}</strong></div>
            <div><small>Detected</small><strong>{job.detectedDate || "Unknown"}</strong></div>
            <div><small>Source</small><strong>{job.source || "Unknown"}</strong></div>
          </section>

          {job.whyRelevant && (
            <section className="pro-drawer-section">
              <h3>Why this matches</h3>
              <p>{job.whyRelevant}</p>
            </section>
          )}

          <FitIntelligence job={job} />

          <section className="pro-drawer-section">
            <div className="pro-section-heading">
              <h3>Application management</h3>
              <button
                className={draft.favorite ? "pro-favorite-button active" : "pro-favorite-button"}
                onClick={() => setDraft({ ...draft, favorite: !draft.favorite })}
              >
                {draft.favorite ? "★ Favorite" : "☆ Favorite"}
              </button>
            </div>

            <label className="pro-field">
              <span>Status</span>
              <select
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option value={status} key={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </label>

            <div className="pro-two-fields">
              <label className="pro-field">
                <span>Applied Date</span>
                <input value={toDateInput(job.appliedDate) || "Not submitted"} disabled />
              </label>
              <label className="pro-field">
                <span>Follow-up Date</span>
                <input
                  type="date"
                  value={draft.followUpDate}
                  onChange={(event) => setDraft({ ...draft, followUpDate: event.target.value })}
                />
              </label>
            </div>

            <FollowUpBadge job={{ ...job, followUpDate: draft.followUpDate }} />

            <label className="pro-field">
              <span>Private Notes</span>
              <textarea
                rows="6"
                value={draft.notes}
                placeholder="Recruiter, interview feedback, preparation notes..."
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </label>
          </section>

          <section className="pro-activity">
            <h3>Activity</h3>
            <div><span /><p><strong>Opportunity detected</strong><small>{job.detectedDate || "Unknown date"}</small></p></div>
            {job.appliedDate && <div><span /><p><strong>Application submitted</strong><small>{job.appliedDate}</small></p></div>}
            {job.lastFollowUp && <div><span /><p><strong>Last follow-up</strong><small>{job.lastFollowUp} · #{job.followUpCount || 0}</small></p></div>}
            {job.followUpDate && <div><span /><p><strong>Follow-up scheduled</strong><small>{job.followUpDate}</small></p></div>}
          </section>
        </div>

        <footer className="pro-drawer-actions">
          {job.link && (
            <a href={job.link} target="_blank" rel="noreferrer" className="pro-secondary-action">
              Open official offer ↗
            </a>
          )}
          <button className="pro-primary-action" disabled={saving} onClick={() => onSave(job, draft)}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </footer>
      </aside>
    </div>
  );
}

function withActionSnapshot(job, patch, now) {
  const nextJob = { ...job, ...patch };
  const action = evaluateAction(nextJob, { now });

  return {
    ...patch,
    actionPriority: action.actionPriority,
    actionReason: action.actionReason,
    actionUpdatedAt: now.toISOString(),
  };
}

export default function AppPro() {
  const [token, setToken] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [coverage, setCoverage] = useState(() => emptyCoverageSnapshot());
  const [coverageError, setCoverageError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingFollowUpJobId, setSavingFollowUpJobId] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [sortMode, setSortMode] = useState("recommended");
  const [quickFilter, setQuickFilter] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const expiryTimer = useRef(null);

  const loadJobs = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const [result, coverageRead] = await Promise.all([
        readJobs({ token, spreadsheetId: SPREADSHEET_ID }),
        readDiscoveryCoverage({ token, spreadsheetId: SPREADSHEET_ID })
          .then((value) => ({ value, error: null }))
          .catch((coverageReadError) => ({ value: null, error: coverageReadError })),
      ]);

      if (coverageRead.error) {
        console.warn("Coverage read failed:", coverageRead.error);
        setCoverage(emptyCoverageSnapshot());
        setCoverageError(coverageRead.error.message || "Coverage read failed");
      } else {
        setCoverage(normalizeCoverageRows(coverageRead.value, { now: new Date() }));
        setCoverageError("");
      }

      const internshipResult = filterInternships(result);
      let enrichedInternships = internshipResult;

      try {
        enrichedInternships = await Promise.all(
          internshipResult.map(async (job) =>
            refreshOfferDescription({
              job,
              discoveryDescription: job.discoveryDescription || "",
              fetchDescription: async (offer) =>
                fetchOfferDescription({
                  endpoint: OFFER_DESCRIPTION_ENDPOINT,
                  offerUrl: offer.link,
                }),
              persistDescription: async (patch) =>
                updateDescriptionFields({
                  token,
                  spreadsheetId: SPREADSHEET_ID,
                  jobId: job.id,
                  patch,
                }),
            })
          )
        );
      } catch (descriptionError) {
        console.warn("Offer description enrichment failed:", descriptionError);
        enrichedInternships = internshipResult;
      }

      setJobs(enrichedInternships);
      setSelectedJob((current) =>
        current
          ? enrichedInternships.find((job) => job.id === current.id) || current
          : current
      );
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setToken("");
        setError("Google session expired or this account cannot access the JobDrive spreadsheet.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadJobs();
  }, [token, loadJobs]);

  useEffect(() => () => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
  }, []);

  async function connectGoogle() {
    setLoading(true);
    setError("");

    try {
      const response = await requestGoogleToken(CLIENT_ID);
      setToken(response.access_token);

      try {
        setUserProfile(await fetchGoogleProfile(response.access_token));
      } catch (profileError) {
        console.warn("Google profile unavailable:", profileError);
        setUserProfile(null);
      }

      const expiresIn = Math.max(Number(response.expires_in || 3600) - 60, 60);
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
      expiryTimer.current = setTimeout(() => {
        setToken("");
        setJobs([]);
        setCoverage(emptyCoverageSnapshot());
        setCoverageError("");
        setUserProfile(null);
      }, expiresIn * 1000);
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
    setCoverage(emptyCoverageSnapshot());
    setCoverageError("");
    setSelectedJob(null);
    setUserProfile(null);
    if (current) await revokeGoogleToken(current);
  }

  function applyLocalPatch(job, patch) {
    const next = { ...job, ...patch };
    setJobs((current) => current.map((item) => item.id === job.id ? next : item));
    setSelectedJob((current) => current?.id === job.id ? next : current);
    return next;
  }

  async function toggleFavorite(job) {
    if (!token) return;
    const patch = {
      favorite: !job.favorite,
      lastUpdated: new Date().toISOString(),
    };

    try {
      await updateJobFields({ token, spreadsheetId: SPREADSHEET_ID, jobId: job.id, patch });
      applyLocalPatch(job, patch);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveJob(job, draft) {
    setSaving(true);
    setError("");

    try {
      const now = new Date();
      let patch = {
        status: draft.status,
        favorite: draft.favorite,
        followUpDate: draft.followUpDate,
        notes: draft.notes,
        lastUpdated: now.toISOString(),
      };

      if (draft.status === "Candidature envoyée" && !job.appliedDate) {
        patch.appliedDate = now.toISOString();
        if (!patch.followUpDate) patch.followUpDate = addDaysISO(now, 7);
      }

      patch = withActionSnapshot(job, patch, now);

      await updateJobFields({
        token,
        spreadsheetId: SPREADSHEET_ID,
        jobId: job.id,
        patch,
      });
      applyLocalPatch(job, patch);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function markFollowedUp(job, choice) {
    if (!token) return;
    setSavingFollowUpJobId(job.id);
    setError("");

    try {
      const now = new Date();
      const basePatch = buildCompletedFollowUpPatch(job, choice, { now });
      const patch = withActionSnapshot(job, basePatch, now);

      await updateJobFields({
        token,
        spreadsheetId: SPREADSHEET_ID,
        jobId: job.id,
        patch,
      });
      applyLocalPatch(job, patch);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFollowUpJobId("");
    }
  }

  async function scheduleFollowUp(job, days) {
    if (!token) return;
    setSavingFollowUpJobId(job.id);
    setError("");

    try {
      const now = new Date();
      const basePatch = buildScheduleFollowUpPatch(days, { now });
      const patch = withActionSnapshot(job, basePatch, now);

      await updateJobFields({
        token,
        spreadsheetId: SPREADSHEET_ID,
        jobId: job.id,
        patch,
      });
      applyLocalPatch(job, patch);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFollowUpJobId("");
    }
  }

  const actionItems = useMemo(() => buildActionItems(jobs), [jobs]);
  const actionKpi = useMemo(() => calculateActionKpi(actionItems), [actionItems]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((job) =>
        [job.company, job.role, job.domain, job.location, job.mode, job.source]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    if (priority) result = result.filter((job) => job.priority === priority);
    if (status) result = result.filter((job) => job.status === status);
    if (specialization) result = result.filter((job) => job.domain === specialization);
    if (quickFilter === "favorites") result = result.filter((job) => job.favorite);
    if (quickFilter === "high") result = result.filter((job) => job.priority === "Haute");
    if (quickFilter === "match90") result = result.filter((job) => job.fitScore >= 90);
    if (quickFilter === "deadline7") {
      const now = new Date();
      result = result.filter((job) => {
        const deadline = new Date(job.deadline);
        if (Number.isNaN(deadline.getTime())) return false;
        const days = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
        return days >= 0 && days <= 7;
      });
    }
    if (quickFilter === "applied") result = result.filter((job) => job.status === "Candidature envoyée");
    if (quickFilter === "interview") result = result.filter((job) => job.status === "Entretien");

    return sortInternships(result, sortMode);
  }, [jobs, search, priority, status, specialization, quickFilter, sortMode]);

  const detailJob = useMemo(() => {
    if (!filteredJobs.length) return null;
    return filteredJobs.find((job) => job.id === selectedJobId) || filteredJobs[0];
  }, [filteredJobs, selectedJobId]);

  useEffect(() => {
    if (!filteredJobs.length) {
      setSelectedJobId(null);
      return;
    }
    if (!filteredJobs.some((job) => job.id === selectedJobId)) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs, selectedJobId]);

  if (!token) {
    return (
      <LoginScreen
        clientConfigured={Boolean(CLIENT_ID)}
        loading={loading}
        error={error}
        onLogin={connectGoogle}
      />
    );
  }

  const alternateContent =
    view === "actions" ? (
      <ActionCenterView
        items={actionItems}
        onOpenDetails={setSelectedJob}
        onScheduleFollowUp={scheduleFollowUp}
        onMarkFollowUp={markFollowedUp}
        savingJobId={savingFollowUpJobId}
      />
    ) : view === "pipeline" ? (
      <Pipeline jobs={jobs} onOpen={setSelectedJob} />
    ) : view === "analytics" ? (
      <AnalyticsView jobs={jobs} />
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
        onQuickFilter={(value) => {
          setQuickFilter(value);
          setView("overview");
        }}
        onSpecialization={(value) => {
          setSpecialization(value);
          setView("overview");
        }}
        onLogout={logout}
        alternateContent={alternateContent}
        actionKpi={actionKpi}
        coverage={coverage}
        coverageError={coverageError}
      />

      <JobDrawer
        job={selectedJob}
        saving={saving}
        onClose={() => setSelectedJob(null)}
        onSave={saveJob}
      />
    </>
  );
}
