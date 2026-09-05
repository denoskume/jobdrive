function discoveryFetchJson_(url) {
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("HTTP " + code + " for " + url);
  return JSON.parse(response.getContentText());
}

function discoverAshbyJobs_(source) {
  var data = discoveryFetchJson_("https://api.ashbyhq.com/posting-api/job-board/" + encodeURIComponent(source.tenant));
  return (data.jobs || []).map(function(job) {
    return { id: job.id, title: job.title, location: job.location, jobUrl: job.jobUrl || job.applyUrl, publishedAt: job.publishedAt || job.updatedAt, descriptionPlain: job.descriptionPlain || "", descriptionHtml: job.descriptionHtml || "", employmentType: job.employmentType || "" };
  });
}

function discoverGreenhouseJobs_(source) {
  var data = discoveryFetchJson_("https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(source.tenant) + "/jobs?content=true");
  return (data.jobs || []).map(function(job) {
    return { id: String(job.id || ""), title: job.title, location: job.location && job.location.name, absoluteUrl: job.absolute_url, publishedAt: job.updated_at, descriptionHtml: job.content || "" };
  });
}

function discoverLeverJobs_(source) {
  var data = discoveryFetchJson_("https://api.lever.co/v0/postings/" + encodeURIComponent(source.tenant) + "?mode=json");
  return (data || []).map(function(job) {
    return { id: job.id, title: job.text, location: job.categories && job.categories.location, jobUrl: job.hostedUrl || job.applyUrl, publishedAt: job.createdAt ? new Date(job.createdAt).toISOString() : "", descriptionPlain: job.descriptionPlain || job.description || "", employmentType: job.categories && job.categories.commitment };
  });
}

function discoverSmartRecruitersJobs_(source) {
  var url = "https://api.smartrecruiters.com/v1/companies/" + encodeURIComponent(source.tenant) + "/postings?limit=100";
  var jobs = [];
  for (var page = 0; page < 5 && url; page++) {
    var data = discoveryFetchJson_(url);
    jobs = jobs.concat((data.content || []).map(function(job) {
      var loc = job.location || {};
      return { id: job.id, title: job.name, location: [loc.city, loc.region, loc.country].filter(Boolean).join(", "), jobUrl: job.ref || ("https://jobs.smartrecruiters.com/" + source.tenant + "/" + job.id), publishedAt: job.releasedDate || job.updatedDate, employmentType: job.typeOfEmployment && job.typeOfEmployment.label };
    }));
    url = data.nextPage || (data.links && data.links.next) || "";
  }
  return jobs;
}

function discoverTeamtailorJobs_(source) {
  if (!source.endpoint) return [];
  var data = discoveryFetchJson_(source.endpoint);
  return data.jobs || data.data || [];
}

function discoverSourceJobs_(source) {
  if (!source || !source.type) return { status: "unsupported", jobs: [] };
  try {
    var jobs;
    if (source.type === "ashby") jobs = discoverAshbyJobs_(source);
    else if (source.type === "greenhouse") jobs = discoverGreenhouseJobs_(source);
    else if (source.type === "lever") jobs = discoverLeverJobs_(source);
    else if (source.type === "smartrecruiters") jobs = discoverSmartRecruitersJobs_(source);
    else if (source.type === "teamtailor") jobs = discoverTeamtailorJobs_(source);
    else return { status: "unsupported", jobs: [] };
    return { status: jobs.length ? "ok" : "empty", jobs: jobs };
  } catch (error) {
    return { status: "fetch_error", jobs: [], error: String(error && error.message || error) };
  }
}
