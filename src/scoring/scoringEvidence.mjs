function clean(value) {
  return String(value || "").trim();
}

function join(values) {
  return values.map(clean).filter(Boolean).join(" \n");
}

export function collectScoringEvidence(candidate = {}) {
  const offerValues = [
    candidate.descriptionRaw,
    candidate.roleMission,
    candidate.mustHaveSkills,
    candidate.expectations,
    candidate.role,
    candidate.domain,
  ];

  const text = join(offerValues).toLowerCase();

  return {
    text,
    organizationText: join([
      candidate.company,
      candidate.source,
      candidate.link,
    ]).toLowerCase(),
    technicalText: text,
    practicalText: join([
      candidate.location,
      candidate.contract,
      candidate.expectations,
      candidate.descriptionRaw,
    ]).toLowerCase(),
    roleText: join([
      candidate.role,
      candidate.mustHaveSkills,
    ]).toLowerCase(),
    compensationText: clean(candidate.compensation).toLowerCase(),
  };
}
