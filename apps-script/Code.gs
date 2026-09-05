const SPREADSHEET_ID = "1o8n6ghifDv96P9rjJ7Vrzs0D50kTNz5a6DF9jODeMD8";
const SHEET_NAME = "Opportunités";

function doGet(e) {
  const parameters = (e && e.parameter) || {};

  if (parameters.action === "fetchOfferDescription") {
    return jsonResponse(
      fetchOfferDescription_(parameters.url || "")
    );
  }

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
      detectedDate: row[17],
      descriptionRaw: row[26] || "",
      about: row[27] || "",
      roleMission: row[28] || "",
      expectations: row[29] || "",
      mustHaveSkills: row[30] || "",
      descriptionSource: row[31] || "",
      descriptionFetchedAt: row[32] || "",
      descriptionStatus: row[33] || "",
      scoreGrade: row[34] || "",
      scoreBreakdown: row[35] || "",
      scoringStrengths: row[36] || "",
      scoringWeaknesses: row[37] || "",
      scoringVersion: row[38] || "",
      scoringUpdatedAt: row[39] || "",
      lastFollowUp: row[40] || "",
      followUpCount: Number(row[41] || 0),
      actionPriority: row[42] || "",
      actionReason: row[43] || "",
      actionUpdatedAt: row[44] || ""
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


function fetchOfferDescription_(url) {
  const fetchedAt = new Date().toISOString();
  const source = String(url || "").trim();

  if (!/^https?:\/\//i.test(source)) {
    return {
      success: false,
      description: "",
      source: source,
      fetchedAt: fetchedAt,
      error: "Invalid offer URL"
    };
  }

  if (
    /(^|\/\/)([^/]*\.)?(linkedin\.com|indeed\.[a-z.]+)(\/|$)/i
      .test(source)
  ) {
    return {
      success: false,
      description: "",
      source: source,
      fetchedAt: fetchedAt,
      error: "Non-authoritative offer source"
    };
  }

  try {
    const ashbyJob = parseAshbyJobUrl_(source);

    if (ashbyJob) {
      const ashbyDescription =
        fetchAshbyOfferDescription_(ashbyJob);

      if (ashbyDescription) {
        return {
          success: true,
          description: ashbyDescription,
          source: source,
          fetchedAt: fetchedAt
        };
      }
    }

    const response = UrlFetchApp.fetch(source, {
      method: "get",
      followRedirects: true,
      muteHttpExceptions: true,
      headers: {
        "User-Agent": "Mozilla/5.0 JobDrive/1.0"
      }
    });

    const statusCode = response.getResponseCode();

    if (statusCode < 200 || statusCode >= 300) {
      return {
        success: false,
        description: "",
        source: source,
        fetchedAt: fetchedAt,
        error: "HTTP " + statusCode
      };
    }

    const html = response.getContentText();
    const description = normalizeFetchedOfferHtml_(html);

    if (!description) {
      return {
        success: false,
        description: "",
        source: source,
        fetchedAt: fetchedAt,
        error: "No meaningful offer description found"
      };
    }

    return {
      success: true,
      description: description,
      source: source,
      fetchedAt: fetchedAt
    };
  } catch (error) {
    return {
      success: false,
      description: "",
      source: source,
      fetchedAt: fetchedAt,
      error:
        error && error.message
          ? String(error.message)
          : "Offer description fetch failed"
    };
  }
}



function parseAshbyJobUrl_(url) {
  const match = String(url || "").match(
    /^https?:\/\/jobs\.ashbyhq\.com\/([^/?#]+)\/([^/?#]+)(?:[/?#]|$)/i
  );

  if (!match) {
    return null;
  }

  if (match[2].toLowerCase() === "application") {
    return null;
  }

  return {
    board: match[1],
    jobId: match[2]
  };
}


function fetchAshbyOfferDescription_(ashbyJob) {
  if (
    !ashbyJob ||
    !ashbyJob.board ||
    !ashbyJob.jobId
  ) {
    return "";
  }

  const endpoint =
    "https://api.ashbyhq.com/posting-api/job-board/" +
    encodeURIComponent(ashbyJob.board);

  const response = UrlFetchApp.fetch(endpoint, {
    method: "get",
    followRedirects: true,
    muteHttpExceptions: true,
    headers: {
      "User-Agent": "Mozilla/5.0 JobDrive/1.0"
    }
  });

  const statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    return "";
  }

  let payload;

  try {
    payload = JSON.parse(
      response.getContentText()
    );
  } catch (error) {
    return "";
  }

  const jobs =
    payload && Array.isArray(payload.jobs)
      ? payload.jobs
      : [];

  const job = jobs.find(function (item) {
    return (
      item &&
      String(item.id || "") ===
        String(ashbyJob.jobId)
    );
  });

  if (!job) {
    return "";
  }

  const plain =
    String(job.descriptionPlain || "").trim();

  if (plain) {
    return plain;
  }

  const html =
    String(job.descriptionHtml || "").trim();

  if (html) {
    return normalizeFetchedOfferHtml_(html);
  }

  return "";
}



function normalizeFetchedOfferHtml_(html) {
  let text = String(html || "");

  if (!text.trim()) {
    return "";
  }

  text = text
    .replace(
      /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,
      " "
    )
    .replace(
      /<\/?(h[1-6]|p|div|section|article|header|footer|li|ul|ol|br)\b[^>]*>/gi,
      "\n"
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .split("\n")
    .map(function (line) {
      return line.replace(/[ \t]+/g, " ").trim();
    })
    .filter(function (line) {
      return Boolean(line);
    })
    .join("\n")
    .trim();

  return text;
}
