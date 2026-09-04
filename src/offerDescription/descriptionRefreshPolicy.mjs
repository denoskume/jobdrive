function hasStoredDescription(job = {}) {
  return Boolean(
    String(job.descriptionRaw || "").trim()
  );
}


export function shouldRefreshDescription(job = {}) {
  const status =
    String(job.descriptionStatus || "")
      .trim()
      .toLowerCase();

  const workflowStatus =
    String(job.status || "")
      .trim()
      .toLowerCase();

  const hasDescription =
    hasStoredDescription(job);

  if (
    status === "live" &&
    hasDescription
  ) {
    return false;
  }

  if (
    workflowStatus === "expiré" &&
    hasDescription
  ) {
    return false;
  }

  if (
    status === "unavailable"
  ) {
    return true;
  }

  return !hasDescription;
}
