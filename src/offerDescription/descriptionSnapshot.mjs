const DESCRIPTION_FIELDS = [
  "descriptionRaw",
  "about",
  "roleMission",
  "expectations",
  "mustHaveSkills",
  "descriptionSource",
  "descriptionFetchedAt",
];


function clean(value = "") {
  return String(value || "").trim();
}


function hasValidSnapshot(value = {}) {
  return Boolean(
    clean(value.descriptionRaw)
  );
}


function emptySnapshot(status = "unavailable") {
  return {
    descriptionRaw: "",
    about: "",
    roleMission: "",
    expectations: "",
    mustHaveSkills: "",
    descriptionSource: "",
    descriptionFetchedAt: "",
    descriptionStatus: status,
  };
}


export function mergeDescriptionSnapshot(
  existingJob = {},
  incomingDescription = {}
) {
  const incomingValid =
    hasValidSnapshot(incomingDescription);

  if (incomingValid) {
    const result = {};

    for (const field of DESCRIPTION_FIELDS) {
      result[field] =
        clean(incomingDescription[field]);
    }

    result.descriptionStatus =
      clean(
        incomingDescription.descriptionStatus
      ) || "live";

    return result;
  }

  const existingValid =
    hasValidSnapshot(existingJob);

  if (existingValid) {
    const result = {};

    for (const field of DESCRIPTION_FIELDS) {
      result[field] =
        clean(existingJob[field]);
    }

    result.descriptionStatus =
      "cached";

    return result;
  }

  return emptySnapshot("unavailable");
}
