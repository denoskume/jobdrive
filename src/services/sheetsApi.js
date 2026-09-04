import {
  normalizeJobs,
} from "../utils/jobDrive.mjs";

const SHEET_NAME = "Opportunités";

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

export async function readJobs({
  token,
  spreadsheetId,
}) {
  const range = encodeURIComponent(
    `'${SHEET_NAME}'!A:AG`
  );

  const url =
    `${GOOGLE_SHEETS_API}/${spreadsheetId}` +
    `/values/${range}`;

  const response = await apiFetch(url, {
    headers: authHeaders(token),
  });

  return normalizeJobs(
    response.values || []
  );
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
