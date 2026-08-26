const API_URL = import.meta.env.VITE_JOBDRIVE_API_URL || "";

function normalizeJob(job = {}) {
  return {
    id: job.id || crypto.randomUUID(),
    type: job.type || "",
    company: job.company || "",
    role: job.role || "",
    domain: job.domain || "",
    location: job.location || "",
    mode: job.mode || "",
    contract: job.contract || "",
    compensation: job.compensation || "",
    postedDate: job.postedDate || "",
    deadline: job.deadline || "",
    status: job.status || "Nouveau",
    priority: job.priority || "Moyenne",
    fitScore: Number(job.fitScore || 0),
    whyRelevant: job.whyRelevant || "",
    link: job.link || "",
    source: job.source || "",
    detectedDate: job.detectedDate || "",
  };
}

export async function fetchJobs() {
  if (!API_URL) {
    return {
      jobs: [],
      configured: false,
    };
  }

  const response = await fetch(API_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const jobs = Array.isArray(payload) ? payload : payload.jobs || [];

  return {
    jobs: jobs.map(normalizeJob),
    configured: true,
  };
}
