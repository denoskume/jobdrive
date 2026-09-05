var FRANCE_TRAVAIL_TOKEN_URL_ = "https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire";
var FRANCE_TRAVAIL_SEARCH_URL_ = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";
var FRANCE_TRAVAIL_DEFAULT_SCOPE_ = "api_offresdemploiv2 o2dsoffre";
var FRANCE_TRAVAIL_PAGE_SIZE_ = 150;
var FRANCE_TRAVAIL_QUERY_FAMILIES_ = [
  "data science", "machine learning", "deep learning", "computer vision",
  "traitement du signal", "traitement d'image", "audio speech",
  "series temporelles", "forecasting", "imagerie medicale",
  "teledetection", "multimodal", "intelligence artificielle"
];

function franceTravailResult_(status, jobs, nextCursor, done, error) {
  return {
    status: String(status || "unsupported"),
    jobs: Array.isArray(jobs) ? jobs : [],
    nextCursor: String(nextCursor || ""),
    done: done !== false,
    error: String(error || "")
  };
}

function franceTravailProperties_() {
  return PropertiesService.getScriptProperties();
}

function franceTravailConfigStatus_() {
  var properties = franceTravailProperties_();
  var clientId = String(properties.getProperty("JOBDRIVE_FT_CLIENT_ID") || "").trim();
  var clientSecret = String(properties.getProperty("JOBDRIVE_FT_CLIENT_SECRET") || "").trim();
  if (!clientId || !clientSecret) return {configured:false, reason:"missing_credentials"};
  return {configured:true, reason:"configured"};
}

function fetchFranceTravailAccessToken_() {
  var config = franceTravailConfigStatus_();
  if (!config.configured) throw new Error(config.reason);

  var cache = CacheService.getScriptCache();
  var cached = cache.get("JOBDRIVE_FT_ACCESS_TOKEN");
  if (cached) return cached;

  var properties = franceTravailProperties_();
  var response = UrlFetchApp.fetch(FRANCE_TRAVAIL_TOKEN_URL_, {
    method: "post",
    muteHttpExceptions: true,
    payload: {
      grant_type: "client_credentials",
      client_id: properties.getProperty("JOBDRIVE_FT_CLIENT_ID"),
      client_secret: properties.getProperty("JOBDRIVE_FT_CLIENT_SECRET"),
      scope: properties.getProperty("JOBDRIVE_FT_SCOPE") || FRANCE_TRAVAIL_DEFAULT_SCOPE_
    }
  });

  var code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("France Travail OAuth HTTP " + code);
  var body = JSON.parse(response.getContentText() || "{}");
  var token = String(body.access_token || "");
  if (!token) throw new Error("France Travail OAuth response missing access_token");

  var ttl = Math.max(60, Math.min(3300, Number(body.expires_in || 3600) - 120));
  cache.put("JOBDRIVE_FT_ACCESS_TOKEN", token, ttl);
  return token;
}

function normalizeFranceTravailOffer_(offer) {
  offer = offer || {};
  var origin = offer.origineOffre || {};
  var workplace = offer.lieuTravail || {};
  var company = offer.entreprise || {};
  var salary = offer.salaire || {};
  return {
    id: String(offer.id || ""),
    title: String(offer.intitule || ""),
    company: String(company.nom || "France Travail employer"),
    location: String(workplace.libelle || ""),
    country: "France",
    jobUrl: String(origin.urlOrigine || offer.contact && offer.contact.urlPostulation || ""),
    publishedAt: String(offer.dateCreation || offer.dateActualisation || ""),
    descriptionPlain: String(offer.description || ""),
    descriptionHtml: "",
    employmentType: String(offer.typeContratLibelle || offer.typeContrat || ""),
    compensation: String(salary.libelle || "")
  };
}

function franceTravailParseCursor_(cursor) {
  if (!cursor) return {queryIndex:0, start:0};
  try {
    var parsed = JSON.parse(cursor);
    return {
      queryIndex: Math.max(0, Number(parsed.queryIndex || 0)),
      start: Math.max(0, Number(parsed.start || 0))
    };
  } catch (error) {
    return {queryIndex:0, start:0};
  }
}

function franceTravailTotalFromHeaders_(headers, fallback) {
  headers = headers || {};
  var raw = headers["Content-Range"] || headers["content-range"] || "";
  var match = String(raw).match(/\/(\d+)\s*$/);
  return match ? Number(match[1]) : Number(fallback || 0);
}

function discoverFranceTravailPage_(source, cursor) {
  var config = franceTravailConfigStatus_();
  if (!config.configured) {
    return franceTravailResult_("configuration_required", [], "", true, config.reason);
  }

  var state = franceTravailParseCursor_(cursor);
  if (state.queryIndex >= FRANCE_TRAVAIL_QUERY_FAMILIES_.length) {
    return franceTravailResult_("empty", [], "", true, "");
  }

  try {
    var token = fetchFranceTravailAccessToken_();
    var query = FRANCE_TRAVAIL_QUERY_FAMILIES_[state.queryIndex];
    var end = state.start + FRANCE_TRAVAIL_PAGE_SIZE_ - 1;
    var url = FRANCE_TRAVAIL_SEARCH_URL_ +
      "?motsCles=" + encodeURIComponent(query) +
      "&range=" + encodeURIComponent(state.start + "-" + end);

    var response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json"
      }
    });
    var code = response.getResponseCode();
    if (code < 200 || code >= 300) {
      return franceTravailResult_("fetch_error", [], cursor || "", false, "France Travail search HTTP " + code);
    }

    var body = JSON.parse(response.getContentText() || "{}");
    var offers = body.resultats || [];
    var jobs = offers.map(normalizeFranceTravailOffer_);
    var total = franceTravailTotalFromHeaders_(response.getHeaders && response.getHeaders(), state.start + jobs.length);
    var consumed = state.start + jobs.length;
    var nextState;

    if (jobs.length && consumed < total) {
      nextState = {queryIndex:state.queryIndex, start:consumed};
    } else if (state.queryIndex + 1 < FRANCE_TRAVAIL_QUERY_FAMILIES_.length) {
      nextState = {queryIndex:state.queryIndex + 1, start:0};
    } else {
      nextState = null;
    }

    return franceTravailResult_(
      jobs.length ? "ok" : "empty",
      jobs,
      nextState ? JSON.stringify(nextState) : "",
      !nextState,
      ""
    );
  } catch (error) {
    return franceTravailResult_("fetch_error", [], cursor || "", false, String(error && error.message || error));
  }
}
