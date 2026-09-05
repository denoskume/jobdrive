function text(value) {
  return String(value ?? "").trim();
}

function bool(value) {
  return ["true", "1", "yes", "oui"].includes(text(value).toLowerCase());
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function time(value) {
  if (!value) return 0;
  if (value && typeof value.getTime === "function") {
    const direct = value.getTime();
    return Number.isFinite(direct) ? direct : 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowsToObjects(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const headers = (rows[0] || []).map(text);
  return rows.slice(1).filter((row) => (row || []).some((cell) => text(cell))).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      if (header) object[header] = row?.[index] ?? "";
    });
    return object;
  });
}

export function emptyCoverageSnapshot() {
  return {
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
}

export function normalizeCoverageRows({ sources = [], runs = [] } = {}, { now = new Date() } = {}) {
  const sourceObjects = rowsToObjects(sources).map((source) => ({
    ...source,
    active: bool(source.active),
  }));
  const runObjects = rowsToObjects(runs);
  const currentTime = time(now) || Date.now();
  const cutoff = currentTime - 24 * 60 * 60 * 1000;

  const accessible = sourceObjects.filter(
    (source) => source.active && text(source.verificationStatus) === "verified"
  );
  const restricted = sourceObjects.filter(
    (source) => text(source.verificationStatus) === "restricted"
  ).length;
  const pending = sourceObjects.filter((source) => {
    if (!source.active) return false;
    const verification = text(source.verificationStatus);
    const health = text(source.healthState);
    return (
      verification === "unverified" ||
      verification === "configuration_required" ||
      (verification === "verified" && (!text(source.lastAttemptAt) || health === "pending"))
    );
  }).length;
  const failed = sourceObjects.filter((source) => {
    if (!source.active) return false;
    const verification = text(source.verificationStatus);
    const health = text(source.healthState);
    return verification === "failed" || (verification === "verified" && health === "fetch_error");
  }).length;

  const scanned24h = accessible.filter((source) => {
    const attempt = time(source.lastAttemptAt);
    return attempt >= cutoff && attempt <= currentTime;
  }).length;

  const recentRuns = runObjects.filter((run) => {
    const finished = time(run.finishedAt);
    return finished >= cutoff && finished <= currentTime;
  });
  const rawListings24h = recentRuns.reduce(
    (total, run) => total + numberValue(run.rawListingsInspected),
    0
  );
  const retained24h = recentRuns.reduce(
    (total, run) => total + numberValue(run.acceptedStored),
    0
  );

  const completedRuns = runObjects
    .filter((run) => bool(run.rotationCompleted))
    .sort(
      (a, b) =>
        time(b.lastRotationCompletedAt || b.finishedAt) -
        time(a.lastRotationCompletedAt || a.finishedAt)
    );
  const lastRotationCompletedAt = completedRuns.length
    ? text(completedRuns[0].lastRotationCompletedAt || completedRuns[0].finishedAt)
    : "";
  const hasRecentCompletedRotation = completedRuns.some((run) => {
    const completed = time(run.lastRotationCompletedAt || run.finishedAt);
    return completed >= cutoff && completed <= currentTime;
  });

  let state = "incomplete";
  const accessibleComplete =
    accessible.length > 0 &&
    pending === 0 &&
    failed === 0 &&
    scanned24h >= accessible.length &&
    hasRecentCompletedRotation;

  if (accessibleComplete) state = restricted > 0 ? "restricted" : "complete";
  else if (accessible.length === 0 && restricted > 0 && pending === 0 && failed === 0) {
    state = "restricted";
  }

  return {
    totalKnownSources: sourceObjects.length,
    activeSources: accessible.length,
    scanned24h,
    pending,
    failed,
    restricted,
    rawListings24h,
    retained24h,
    lastRotationCompletedAt,
    state,
  };
}
