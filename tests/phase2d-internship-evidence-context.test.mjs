import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEligibility } from "../src/discovery/eligibility.mjs";

const base = {
  company: "Datadog",
  location: "Paris, France",
  country: "France",
  link: "https://careers.datadoghq.com/detail/7965428/?gh_jid=7965428",
};

test("generic early-stage wording in a permanent manager description is not internship evidence", () => {
  const result = evaluateEligibility({
    ...base,
    role: "Manager I, Engineering - AI Platform - Evaluation & Annotation",
    contract: "",
    descriptionRaw: "Engineering manager for a generative AI platform. Lead AI model evaluation, training and inference systems. Interested in working on an early stage project with a fast iteration cycle.",
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "internship_type");
  assert.equal(result.evidence.internshipEvidence, "");
});

test("English 'at this stage a model' wording is not internship evidence", () => {
  const result = evaluateEligibility({
    ...base,
    role: "Applied Scientist",
    contract: "",
    descriptionRaw: "At this stage a model is trained and evaluated for production deployment.",
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "internship_type");
  assert.equal(result.evidence.internshipEvidence, "");
});

test("explicit French stage wording in a description remains valid internship evidence", () => {
  const result = evaluateEligibility({
    company: "Industrial Vision SAS",
    location: "Lyon, France",
    country: "France",
    link: "https://careers.example.com/vision-2027",
    role: "Applied Scientist",
    contract: "",
    descriptionRaw: "Stage de 6 mois en fin d'études. Développer et évaluer des modèles de computer vision en Python et PyTorch.",
  });

  assert.equal(result.accepted, true);
  assert.match(result.evidence.internshipEvidence, /^description:/);
});
