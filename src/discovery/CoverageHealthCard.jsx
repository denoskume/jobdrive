import "./coverage-health.css";

const EMPTY_COVERAGE = {
  totalKnownSources: 0,
  activeSources: 0,
  scanned24h: 0,
  pending: 0,
  failed: 0,
  restricted: 0,
  rawListings24h: 0,
  retained24h: 0,
  lastRotationCompletedAt: "",
  state: "incomplete",
};

function asCount(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRotation(value) {
  if (!value) return "No completed rotation yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CoverageHealthCard({
  coverage = EMPTY_COVERAGE,
  retainedTotal = 0,
  error = "",
}) {
  const snapshot = { ...EMPTY_COVERAGE, ...(coverage || {}) };
  const state = ["complete", "restricted"].includes(snapshot.state)
    ? snapshot.state
    : "incomplete";

  const statusText = {
    complete: "Coverage complete for registered accessible sources",
    incomplete: "Coverage incomplete",
    restricted: "Restricted sources not scanned",
  }[state];

  const failedRestricted =
    asCount(snapshot.failed) + asCount(snapshot.restricted);

  const metrics = [
    {
      label: "Sources scanned / active sources (24h)",
      value: `${asCount(snapshot.scanned24h)} / ${asCount(snapshot.activeSources)}`,
    },
    {
      label: "Pending",
      value: asCount(snapshot.pending),
    },
    {
      label: "Failed / Restricted",
      value: failedRestricted,
    },
    {
      label: "Raw listings inspected",
      value: asCount(snapshot.rawListings24h),
    },
    {
      label: "Relevant M2 internships retained",
      value: asCount(retainedTotal),
    },
    {
      label: "Last rotation completed",
      value: formatRotation(snapshot.lastRotationCompletedAt),
      compact: true,
    },
  ];

  return (
    <section className={`jd-coverage-health jd-coverage-${state}`} aria-live="polite">
      <header className="jd-coverage-head">
        <div>
          <span>DISCOVERY COVERAGE</span>
          <strong>Coverage Health</strong>
        </div>
        <b>{statusText}</b>
      </header>

      <div className="jd-coverage-metrics">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <small>{metric.label}</small>
            <strong className={metric.compact ? "compact" : ""}>{metric.value}</strong>
          </article>
        ))}
      </div>

      {error ? (
        <p className="jd-coverage-error">
          Coverage diagnostics unavailable: {error}
        </p>
      ) : null}
    </section>
  );
}
