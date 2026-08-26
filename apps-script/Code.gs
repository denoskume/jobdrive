const SPREADSHEET_ID = "1o8n6ghifDv96P9rjJ7Vrzs0D50kTNz5a6DF9jODeMD8";
const SHEET_NAME = "Opportunités";

function doGet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return jsonResponse({
      success: false,
      error: "Sheet not found",
      jobs: []
    });
  }

  const rows = sheet.getDataRange().getDisplayValues();

  if (rows.length <= 1) {
    return jsonResponse({
      success: true,
      count: 0,
      jobs: []
    });
  }

  const jobs = rows
    .slice(1)
    .filter(row => row[0])
    .map(row => ({
      id: row[0],
      type: row[1],
      company: row[2],
      role: row[3],
      domain: row[4],
      location: row[5],
      mode: row[6],
      contract: row[7],
      compensation: row[8],
      postedDate: row[9],
      deadline: row[10],
      status: row[11],
      priority: row[12],
      fitScore: Number(row[13] || 0),
      whyRelevant: row[14],
      link: row[15],
      source: row[16],
      detectedDate: row[17]
    }));

  return jsonResponse({
    success: true,
    count: jobs.length,
    jobs
  });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
