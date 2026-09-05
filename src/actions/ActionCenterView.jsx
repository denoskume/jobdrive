import { groupActionItems } from "./actionEngine.mjs";
import "./action-center.css";

const GROUPS = [
  ["overdue", "Overdue Follow-up"],
  ["today", "Follow-up Today"],
  ["deadlineRisk", "Deadline Risk"],
  ["applyNow", "Apply Now"],
  ["upcoming", "Upcoming"],
];

function actionDateLabel(item) {
  if (item.actionType.startsWith("FOLLOW_UP") || item.actionType === "UPCOMING_FOLLOW_UP") {
    return item.job.followUpDate ? `Follow-up ${item.job.followUpDate}` : "";
  }

  if (item.actionType === "DEADLINE_RISK") {
    return item.job.deadline ? `Deadline ${item.job.deadline}` : "";
  }

  return item.job.deadline ? `Deadline ${item.job.deadline}` : "";
}

function ActionCard({
  item,
  onOpenDetails,
  onScheduleFollowUp,
  onMarkFollowUp,
  savingJobId,
}) {
  const { job } = item;
  const saving = savingJobId === job.id;
  const dateLabel = actionDateLabel(item);
  const canCompleteFollowUp =
    ["Candidature envoyée", "Entretien", "Offre"].includes(job.status) &&
    Boolean(job.followUpDate);

  return (
    <article className={`jd-action-card priority-${item.actionPriority.toLowerCase()}`}>
      <header className="jd-action-card-head">
        <div>
          <span className="jd-action-priority">{item.actionPriority}</span>
          <h3>{job.role || "Internship opportunity"}</h3>
          <strong>{job.company || "Company"}</strong>
        </div>

        {job.fitScore ? (
          <div className="jd-action-score">
            <b>{job.fitScore}%</b>
            <span>{job.scoreGrade ? `Grade ${job.scoreGrade}` : "Match"}</span>
          </div>
        ) : null}
      </header>

      <p className="jd-action-reason">{item.actionReason}</p>

      <div className="jd-action-meta">
        {job.domain && <span>{job.domain}</span>}
        {job.status && <span>{job.status}</span>}
        {dateLabel && <span>{dateLabel}</span>}
        {job.appliedDate && <span>Applied {job.appliedDate}</span>}
        {Number(job.followUpCount || 0) > 0 && (
          <span>Follow-ups {Number(job.followUpCount || 0)}</span>
        )}
      </div>

      <div className="jd-action-links">
        <button
          type="button"
          onClick={() => onOpenDetails(job)}
          disabled={saving}
        >
          Open Details
        </button>

        {job.link && (
          <a href={job.link} target="_blank" rel="noreferrer">
            Open Official Offer ↗
          </a>
        )}
      </div>

      {item.actionType === "SCHEDULE_FOLLOW_UP" && (
        <div className="jd-action-control">
          <strong>Schedule Follow-up</strong>
          <div>
            {[3, 7, 14].map((days) => (
              <button
                key={days}
                type="button"
                disabled={saving}
                onClick={() => onScheduleFollowUp(job, days)}
              >
                +{days} days
              </button>
            ))}
          </div>
        </div>
      )}

      {canCompleteFollowUp && (
        <div className="jd-action-control">
          <strong>Mark Followed Up</strong>
          <div>
            {[3, 7, 14].map((days) => (
              <button
                key={days}
                type="button"
                disabled={saving}
                onClick={() => onMarkFollowUp(job, days)}
              >
                +{days} days
              </button>
            ))}
            <button
              type="button"
              disabled={saving}
              onClick={() => onMarkFollowUp(job, "none")}
            >
              No further follow-up
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function ActionCenterView({
  items = [],
  onOpenDetails,
  onScheduleFollowUp,
  onMarkFollowUp,
  savingJobId = "",
}) {
  const groups = groupActionItems(items);
  const visibleGroups = GROUPS.filter(([key]) => groups[key]?.length);

  if (!visibleGroups.length) {
    return (
      <section className="jd-action-center">
        <header className="jd-action-header">
          <div>
            <span>DAILY EXECUTION</span>
            <h1>Action Center</h1>
          </div>
        </header>
        <div className="jd-action-empty">
          <strong>No active actions</strong>
          <p>Your current internship pipeline has nothing urgent to handle.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="jd-action-center">
      <header className="jd-action-header">
        <div>
          <span>DAILY EXECUTION</span>
          <h1>Action Center</h1>
          <p>Application deadlines and follow-ups ordered by urgency.</p>
        </div>
        <strong>{items.length} active</strong>
      </header>

      <div className="jd-action-groups">
        {visibleGroups.map(([key, label]) => (
          <section className="jd-action-group" key={key}>
            <header>
              <h2>{label}</h2>
              <span>{groups[key].length}</span>
            </header>

            <div className="jd-action-list">
              {groups[key].map((item) => (
                <ActionCard
                  key={item.job.id}
                  item={item}
                  onOpenDetails={onOpenDetails}
                  onScheduleFollowUp={onScheduleFollowUp}
                  onMarkFollowUp={onMarkFollowUp}
                  savingJobId={savingJobId}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
