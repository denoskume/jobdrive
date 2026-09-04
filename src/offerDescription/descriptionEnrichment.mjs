import {
  extractOfferSections,
} from "./descriptionExtractor.mjs";

import {
  mergeDescriptionSnapshot,
} from "./descriptionSnapshot.mjs";


function clean(value = "") {
  return String(value || "").trim();
}


function buildIncomingSnapshot({
  descriptionRaw,
  source,
  fetchedAt,
}) {
  const raw =
    clean(descriptionRaw);

  if (!raw) {
    return {
      descriptionRaw: "",
      descriptionStatus:
        "unavailable",
    };
  }

  const sections =
    extractOfferSections(raw);

  return {
    descriptionRaw: raw,
    about:
      sections.about,
    roleMission:
      sections.roleMission,
    expectations:
      sections.expectations,
    mustHaveSkills:
      sections.mustHaveSkills,
    descriptionSource:
      clean(source),
    descriptionFetchedAt:
      clean(fetchedAt),
    descriptionStatus:
      "live",
  };
}


export function enrichOfferDescription({
  existing = {},
  discoveryDescription = "",
  fetchedDescription = "",
  source = "",
  fetchedAt = "",
  fetchFailed = false,
  expired = false,
} = {}) {
  const discovery =
    clean(discoveryDescription);

  const fetched =
    clean(fetchedDescription);

  if (discovery) {
    return mergeDescriptionSnapshot(
      existing,
      buildIncomingSnapshot({
        descriptionRaw:
          discovery,
        source:
          source || "discovery",
        fetchedAt,
      })
    );
  }

  if (fetched) {
    return mergeDescriptionSnapshot(
      existing,
      buildIncomingSnapshot({
        descriptionRaw:
          fetched,
        source:
          source || "official",
        fetchedAt,
      })
    );
  }

  if (fetchFailed || expired) {
    return mergeDescriptionSnapshot(
      existing,
      {
        descriptionRaw: "",
        descriptionStatus:
          expired
            ? "expired"
            : "unavailable",
      }
    );
  }

  return mergeDescriptionSnapshot(
    existing,
    {
      descriptionRaw: "",
      descriptionStatus:
        "unavailable",
    }
  );
}
