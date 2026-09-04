import {
  shouldRefreshDescription,
} from "./descriptionRefreshPolicy.mjs";

import {
  enrichOfferDescription,
} from "./descriptionEnrichment.mjs";


const DESCRIPTION_FIELDS = [
  "descriptionRaw",
  "about",
  "roleMission",
  "expectations",
  "mustHaveSkills",
  "descriptionSource",
  "descriptionFetchedAt",
  "descriptionStatus",
];


function descriptionPatch(snapshot = {}) {
  return Object.fromEntries(
    DESCRIPTION_FIELDS.map((field) => [
      field,
      String(snapshot[field] || "").trim(),
    ])
  );
}


function descriptionChanged(job = {}, snapshot = {}) {
  return DESCRIPTION_FIELDS.some(
    (field) =>
      String(job[field] || "").trim() !==
      String(snapshot[field] || "").trim()
  );
}


export async function refreshOfferDescription({
  job = {},
  discoveryDescription = "",
  fetchDescription,
  persistDescription,
  now = new Date().toISOString(),
} = {}) {
  if (!shouldRefreshDescription(job)) {
    return job;
  }

  const supplied =
    String(discoveryDescription || "").trim();

  let fetchedDescription = "";
  let source = "";
  let fetchedAt = now;
  let fetchFailed = false;

  if (supplied) {
    source =
      String(job.descriptionSource || "discovery").trim();
  } else if (
    typeof fetchDescription === "function"
  ) {
    try {
      const fetched =
        await fetchDescription(job);

      if (
        fetched &&
        fetched.success === true &&
        String(fetched.description || "").trim()
      ) {
        fetchedDescription =
          String(fetched.description).trim();

        source =
          String(
            fetched.source ||
              job.link ||
              ""
          ).trim();

        fetchedAt =
          String(
            fetched.fetchedAt ||
              now
          ).trim();
      } else {
        fetchFailed = true;
      }
    } catch {
      fetchFailed = true;
    }
  } else {
    fetchFailed = true;
  }

  const snapshot =
    enrichOfferDescription({
      existing: job,
      discoveryDescription: supplied,
      fetchedDescription,
      source,
      fetchedAt,
      fetchFailed,
      expired:
        String(job.status || "")
          .trim()
          .toLowerCase() === "expiré",
    });

  const updatedJob = {
    ...job,
    ...descriptionPatch(snapshot),
  };

  if (
    descriptionChanged(job, snapshot) &&
    typeof persistDescription === "function"
  ) {
    await persistDescription(
      descriptionPatch(snapshot)
    );
  }

  return updatedJob;
}
