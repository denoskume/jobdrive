const FALLBACK =
  "Not specified in the available offer description.";


const ABOUT_HEADINGS = new Set([
  "about",
  "about us",
  "who we are",
  "company",
  "team",
  "context",
  "project",
  "environment",
  "à propos",
  "a propos",
  "contexte",
  "présentation",
  "presentation",
]);


const ROLE_HEADINGS = new Set([
  "role",
  "the role",
  "role & mission",
  "role and mission",
  "your role",
  "mission",
  "missions",
  "your mission",
  "responsibilities",
  "what you will do",
  "job description",
  "tasks",
  "responsibilities & duties",
  "vos missions",
  "le poste",
]);


const EXPECTATION_HEADINGS = new Set([
  "requirements",
  "expectations",
  "qualifications",
  "who you are",
  "profile",
  "candidate profile",
  "what we expect",
  "your profile",
  "profil recherché",
  "profil recherche",
  "prérequis",
  "prerequis",
]);


const CANDIDATE_PROFILE_HEADINGS = new Set([
  "what we're looking for",
  "what we are looking for",
]);


const MUST_HAVE_HEADINGS = new Set([
  "required skills",
  "must have skills",
  "must-have skills",
  "must-have skills",
  "skills required",
  "technical requirements",
  "compétences requises",
  "competences requises",
  "compétences obligatoires",
  "competences obligatoires",
]);


const OPTIONAL_HEADINGS = new Set([
  "nice to have",
  "nice-to-have",
  "preferred skills",
  "preferred qualifications",
  "optional skills",
  "bonus",
  "compétences appréciées",
  "competences appreciees",
  "compétences souhaitées",
  "competences souhaitees",
]);


function normalizeHeading(value = "") {
  return String(value)
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/[:：]\s*$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}


function headingType(line) {
  const normalized =
    normalizeHeading(line);

  if (
    ABOUT_HEADINGS.has(normalized) ||
    normalized.startsWith("about ")
  ) {
    return "about";
  }

  if (ROLE_HEADINGS.has(normalized)) {
    return "roleMission";
  }

  if (EXPECTATION_HEADINGS.has(normalized)) {
    return "expectations";
  }

  if (CANDIDATE_PROFILE_HEADINGS.has(normalized)) {
    return "candidateProfile";
  }

  if (MUST_HAVE_HEADINGS.has(normalized)) {
    return "mustHaveSkills";
  }

  if (OPTIONAL_HEADINGS.has(normalized)) {
    return "optional";
  }

  return null;
}


function cleanLine(value = "") {
  return String(value)
    .trim()
    .replace(/^[-*•]\s*/, "")
    .trim();
}



function splitCandidateProfile(lines = []) {
  const expectations = [];
  const mustHaveSkills = [];

  const technicalPattern =
    /^(expert\b|proficient\b|experience\b|experienced\b|knowledge\b|hands-on\b|writes?\b.*\bcode\b)/i;

  for (const line of lines) {
    if (technicalPattern.test(line)) {
      mustHaveSkills.push(line);
    } else {
      expectations.push(line);
    }
  }

  return {
    expectations,
    mustHaveSkills,
  };
}


export function extractOfferSections(
  descriptionRaw = ""
) {
  const text =
    String(descriptionRaw || "")
      .replace(/\r\n?/g, "\n")
      .trim();

  if (!text) {
    return {
      about: FALLBACK,
      roleMission: FALLBACK,
      expectations: FALLBACK,
      mustHaveSkills: FALLBACK,
    };
  }

  const sections = {
    about: [],
    roleMission: [],
    expectations: [],
    mustHaveSkills: [],
    candidateProfile: [],
  };

  let current = null;

  for (const rawLine of text.split("\n")) {
    const line =
      cleanLine(rawLine);

    if (!line) {
      continue;
    }

    const type =
      headingType(line);

    if (type) {
      current =
        type === "optional"
          ? null
          : type;

      continue;
    }

    if (current) {
      sections[current].push(line);
    }
  }

  const candidateProfile =
    splitCandidateProfile(
      sections.candidateProfile
    );

  sections.expectations.push(
    ...candidateProfile.expectations
  );

  sections.mustHaveSkills.push(
    ...candidateProfile.mustHaveSkills
  );

  return {
    about:
      sections.about.join(" ").trim() ||
      FALLBACK,

    roleMission:
      sections.roleMission
        .join(" ")
        .trim() ||
      FALLBACK,

    expectations:
      sections.expectations
        .join(" ")
        .trim() ||
      FALLBACK,

    mustHaveSkills:
      sections.mustHaveSkills
        .join(" ")
        .trim() ||
      FALLBACK,
  };
}
