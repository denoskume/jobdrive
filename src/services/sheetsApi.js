import {
  normalizeJobsWithDiscoveryMetadata,
} from "../discovery/jobsPhase2d.mjs";

const SHEET_NAME = "Opportunités";
const DISCOVERY_SOURCES_SHEET = "Discovery Sources";
const DISCOVERY_RUNS_SHEET = "Discovery Runs";
const TARGET_COMPANIES_SHEET = "Target Companies";

const GOOGLE_SHEETS_API =
  "https://sheets.googleapis.com/v4/spreadsheets";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(url, options = {}) {
  const response = await fetch(
    url,
    options
  );

  let body = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const error = new Error(
      body?.error?.message ||
        `Google Sheets request failed (${response.status}).`
    );

    error.status = response.status;
    throw error;
  }

  return body;
}

async function readRange({
  token,
  spreadsheetId,
  range,
}) {
  const encodedRange = encodeURIComponent(range);
  const url =
    `${GOOGLE_SHEETS_API}/${spreadsheetId}` +
    `/values/${encodedRange}`;

  const response = await apiFetch(url, {
    headers: authHeaders(token),
  });

  return response.values || [];
}

export async function readJobs({
  token,
  spreadsheetId,
}) {
  const values = await readRange({
    token,
    spreadsheetId,
    range: `'${SHEET_NAME}'!A:BC`,
  });

  return normalizeJobsWithDiscoveryMetadata(values);
}

export async function readDiscoveryCoverage({
  token,
  spreadsheetId,
}) {
  const [sources, runs] = await Promise.all([
    readRange({
      token,
      spreadsheetId,
      range: `'${DISCOVERY_SOURCES_SHEET}'!A:T`,
    }),
    readRange({
      token,
      spreadsheetId,
      range: `'${DISCOVERY_RUNS_SHEET}'!A:AA`,
    }),
  ]);

  return { sources, runs };
}

export async function readTargetCompanies({
  token,
  spreadsheetId,
}) {
  return readRange({
    token,
    spreadsheetId,
    range: `'${TARGET_COMPANIES_SHEET}'!A:Q`,
  });
}

export async function findRowByJobId({
  token,
  spreadsheetId,
  jobId,
}) {
  const range = encodeURIComponent(
    `'${SHEET_NAME}'!A2:A`
  );

  const url =
    `${GOOGLE_SHEETS_API}/${spreadsheetId}` +
    `/values/${range}`;

  const response = await apiFetch(url, {
    headers: authHeaders(token),
  });

  const rows = response.values || [];

  const index = rows.findIndex(
    (row) =>
      String(row?.[0] || "") ===
      String(jobId)
  );

  if (index < 0) {
    throw new Error(
      `Opportunity ${jobId} was not found in Google Sheets.`
    );
  }

  return index + 2;
}

const COLUMNS = {
  status: "L",
  favorite: "S",
  appliedDate: "T",
  followUpDate: "U",
  notes: "V",
  lastUpdated: "W",
  lastFollowUp: "AO",
  followUpCount: "AP",
  actionPriority: "AQ",
  actionReason: "AR",
  actionUpdatedAt: "AS",
};

const DESCRIPTION_COLUMNS = {
  descriptionRaw: "AA",
  about: "AB",
  roleMission: "AC",
  expectations: "AD",
  mustHaveSkills: "AE",
  descriptionSource: "AF",
  descriptionFetchedAt: "AG",
  descriptionStatus: "AH",
};

function sheetValue(key, value) {
  if (key === "favorite") {
    return value ? "TRUE" : "FALSE";
  }

  return value ?? "";
}

export async function updateJobFields({
  token,
  spreadsheetId,
  jobId,
  patch,
}) {
  const row = await findRowByJobId({
    token,
    spreadsheetId,
    jobId,
  });

  const data = Object.entries(patch)
    .filter(([key]) => COLUMNS[key])
    .map(([key, value]) => ({
      range:
        `'${SHEET_NAME}'!` +
        `${COLUMNS[key]}${row}`,

      majorDimension: "ROWS",

      values: [
        [sheetValue(key, value)],
      ],
    }));

  if (!data.length) {
    return;
  }

  const url =
    `${GOOGLE_SHEETS_API}/${spreadsheetId}` +
    `/values:batchUpdate`;

  await apiFetch(url, {
    method: "POST",

    headers:
      authHeaders(token),

    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data,
    }),
  });
}

export async function updateDescriptionFields({
  token,
  spreadsheetId,
  jobId,
  patch,
}) {
  const row = await findRowByJobId({
    token,
    spreadsheetId,
    jobId,
  });

  const data = Object.entries(patch)
    .filter(([key]) => DESCRIPTION_COLUMNS[key])
    .map(([key, value]) => ({
      range:
        `'${SHEET_NAME}'!` +
        `${DESCRIPTION_COLUMNS[key]}${row}`,

      majorDimension: "ROWS",

      values: [
        [value ?? ""],
      ],
    }));

  if (!data.length) {
    return;
  }

  const url =
    `${GOOGLE_SHEETS_API}/${spreadsheetId}` +
    `/values:batchUpdate`;

  await apiFetch(url, {
    method: "POST",

    headers:
      authHeaders(token),

    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data,
    }),
  });
}
