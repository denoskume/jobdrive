function discoveryFetchJson_(url) {
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  var code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("HTTP " + code + " for " + url);
  return JSON.parse(response.getContentText());
}

function discoveryAdapterResult_(status, jobs, nextCursor, done, error) {
  return {
    status: String(status || "unsupported"),
    jobs: Array.isArray(jobs) ? jobs : [],
    nextCursor: String(nextCursor || ""),
    done: done !== false,
    error: String(error || "")
  };
}

function discoverAshbyJobs_(source) {
  var data = discoveryFetchJson_("https://api.ashbyhq.com/posting-api/job-board/" + encodeURIComponent(source.tenant));
  return (data.jobs || []).map(function(job) {
    return {
      id: String(job.id || ""),
      title: job.title || "",
      company: job.company || source.company || "",
      location: job.location || "",
      country: job.country || "",
      jobUrl: job.jobUrl || job.applyUrl || "",
      publishedAt: job.publishedAt || job.updatedAt || "",
      descriptionPlain: job.descriptionPlain || "",
      descriptionHtml: job.descriptionHtml || "",
      employmentType: job.employmentType || "",
      compensation: job.compensation || ""
    };
  });
}

function discoverGreenhouseJobs_(source) {
  var data = discoveryFetchJson_("https://boards-api.greenhouse.io/v1/boards/" + encodeURIComponent(source.tenant) + "/jobs?content=true");
  return (data.jobs || []).map(function(job) {
    return {
      id: String(job.id || ""),
      title: job.title || "",
      company: job.company_name || source.company || "",
      location: job.location && job.location.name || "",
      country: "",
      jobUrl: job.absolute_url || "",
      absoluteUrl: job.absolute_url || "",
      publishedAt: job.updated_at || "",
      descriptionHtml: job.content || "",
      descriptionPlain: "",
      employmentType: job.employment_type || "",
      compensation: ""
    };
  });
}

function discoverLeverJobs_(source) {
  var data = discoveryFetchJson_("https://api.lever.co/v0/postings/" + encodeURIComponent(source.tenant) + "?mode=json");
  return (data || []).map(function(job) {
    return {
      id: String(job.id || ""),
      title: job.text || "",
      company: source.company || "",
      location: job.categories && job.categories.location || "",
      country: "",
      jobUrl: job.hostedUrl || job.applyUrl || "",
      publishedAt: job.createdAt ? new Date(job.createdAt).toISOString() : "",
      descriptionPlain: job.descriptionPlain || job.description || "",
      descriptionHtml: job.description || "",
      employmentType: job.categories && job.categories.commitment || "",
      compensation: job.salaryRange || ""
    };
  });
}

function normalizeSmartRecruitersJobs_(source, data) {
  return (data.content || []).map(function(job) {
    var loc = job.location || {};
    return {
      id: String(job.id || ""),
      title: job.name || "",
      company: job.company && job.company.name || source.company || "",
      location: [loc.city, loc.region, loc.country].filter(Boolean).join(", "),
      country: loc.country || "",
      jobUrl: job.ref || ("https://jobs.smartrecruiters.com/" + source.tenant + "/" + job.id),
      publishedAt: job.releasedDate || job.updatedDate || "",
      descriptionPlain: job.jobAd && job.jobAd.sections && job.jobAd.sections.jobDescription && job.jobAd.sections.jobDescription.text || "",
      employmentType: job.typeOfEmployment && job.typeOfEmployment.label || "",
      compensation: ""
    };
  });
}

function discoverSmartRecruitersPage_(source, cursor) {
  var url = String(cursor || "").trim() || ("https://api.smartrecruiters.com/v1/companies/" + encodeURIComponent(source.tenant) + "/postings?limit=100");
  if (!/^https:\/\/api\.smartrecruiters\.com\//i.test(url)) throw new Error("Invalid SmartRecruiters cursor URL");
  var data = discoveryFetchJson_(url);
  var jobs = normalizeSmartRecruitersJobs_(source, data);
  var next = String(data.nextPage || data.links && data.links.next || "").trim();
  if (next && !/^https:\/\/api\.smartrecruiters\.com\//i.test(next)) throw new Error("Invalid SmartRecruiters next page URL");
  return discoveryAdapterResult_(jobs.length ? "ok" : "empty", jobs, next, !next, "");
}

function discoverSmartRecruitersJobs_(source) {
  return discoverSmartRecruitersPage_(source, "").jobs;
}

function discoverTeamtailorJobs_(source) {
  if (!source.endpoint) return [];
  var data = discoveryFetchJson_(source.endpoint);
  var jobs = data.jobs || data.data || [];
  return jobs.map(function(job) {
    var attributes = job.attributes || job;
    var id = job.id || attributes.id || "";
    var location = attributes.location || attributes.location_name || attributes.locationName || "";
    var url = attributes.jobUrl || attributes.url || attributes.applyUrl || attributes.career_site_url || attributes.careerSiteUrl || "";
    return {
      id: String(id),
      title: attributes.title || attributes.name || "",
      company: attributes.company || source.company || "",
      location: typeof location === "string" ? location : location.name || "",
      country: attributes.country || "",
      jobUrl: url,
      publishedAt: attributes.publishedAt || attributes.published_at || attributes.createdAt || attributes.created_at || "",
      descriptionPlain: attributes.descriptionPlain || attributes.description || attributes.body || "",
      descriptionHtml: attributes.descriptionHtml || "",
      employmentType: attributes.employmentType || attributes.employment_type || "",
      compensation: attributes.compensation || ""
    };
  });
}

function discoverSourcePage_(source, cursor) {
  source = source || {};
  var sourceType = String(source.sourceType || source.type || "");

  if (sourceType === "linkedin_discovery" || sourceType === "indeed_discovery") {
    return discoveryAdapterResult_("restricted", [], "", true, "Direct automated market search is not configured for this platform.");
  }

  if (sourceType === "france_travail") {
    if (typeof discoverFranceTravailPage_ === "function") {
      try {
        return discoverFranceTravailPage_(source, cursor || "");
      } catch (error) {
        return discoveryAdapterResult_("fetch_error", [], cursor || "", false, String(error && error.message || error));
      }
    }
    return discoveryAdapterResult_("configuration_required", [], cursor || "", true, "France Travail adapter is not loaded.");
  }

  if (sourceType === "smartrecruiters") {
    try {
      return discoverSmartRecruitersPage_(source, cursor || "");
    } catch (error) {
      return discoveryAdapterResult_("fetch_error", [], cursor || "", false, String(error && error.message || error));
    }
  }

  try {
    var jobs;
    if (sourceType === "ashby") jobs = discoverAshbyJobs_(source);
    else if (sourceType === "greenhouse") jobs = discoverGreenhouseJobs_(source);
    else if (sourceType === "lever") jobs = discoverLeverJobs_(source);
    else if (sourceType === "teamtailor") jobs = discoverTeamtailorJobs_(source);
    else return discoveryAdapterResult_("unsupported", [], "", true, "Unsupported discovery source type: " + sourceType);

    return discoveryAdapterResult_(jobs.length ? "ok" : "empty", jobs, "", true, "");
  } catch (error) {
    return discoveryAdapterResult_("fetch_error", [], cursor || "", false, String(error && error.message || error));
  }
}

// Transitional compatibility for the current runner and older tests. Phase 2D orchestration uses the paged contract.
function discoverSourceJobs_(source) {
  return discoverSourcePage_(source, "");
}
