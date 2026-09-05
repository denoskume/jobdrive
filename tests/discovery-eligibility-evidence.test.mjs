import test from "node:test";
import assert from "node:assert/strict";
import { evaluateEligibility } from "../src/discovery/eligibility.mjs";
import { scoreInternship } from "../src/scoring/scoringEngine.mjs";

const base = {
  company: "Industrial Robotics SAS",
  location: "Lyon, France",
  link: "https://careers.example.com/jobs/1",
};

test("evidence matching accepts atypical technical internship titles from substantive missions", () => {
  const result = evaluateEligibility({
    ...base,
    role: "Algorithms Intern",
    contract: "Internship",
    descriptionRaw: "Develop and evaluate machine learning algorithms for sensor fusion and time-series prediction. 6 months.",
  });
  assert.equal(result.accepted, true);
  assert.match(result.evidence.internshipEvidence, /title:intern|contract:internship/);
  assert.ok(result.evidence.domainEvidence.length > 0);
  assert.equal(result.evidence.durationEvidence, "6_months");
});

test("internship proof may come only from the offer description", () => {
  const result = evaluateEligibility({
    ...base,
    role: "Applied Scientist",
    location: "Paris, France",
    contract: "",
    descriptionRaw: "This is a 6-month internship focused on computer vision model training and evaluation.",
  });
  assert.equal(result.accepted, true);
  assert.equal(result.evidence.internshipEvidence, "description:internship");
});

test("unknown duration stays eligible but is explicitly marked unknown", () => {
  const result = evaluateEligibility({
    ...base,
    role: "Computer Vision Intern",
    contract: "Internship",
    descriptionRaw: "Train and evaluate segmentation models with PyTorch.",
  });
  assert.equal(result.accepted, true);
  assert.equal(result.evidence.durationEvidence, "unknown");
});

test("explicit incompatible duration still rejects", () => {
  const result = evaluateEligibility({
    ...base,
    role: "ML Intern",
    contract: "Internship",
    descriptionRaw: "Three month internship developing machine learning models.",
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "internship_duration");
});

test("international and internal do not count as intern evidence", () => {
  for (const role of ["International AI Analyst", "Internal Data Specialist"]) {
    const result = evaluateEligibility({
      ...base,
      role,
      contract: "Full-time",
      descriptionRaw: "Machine learning model evaluation.",
    });
    assert.equal(result.accepted, false);
    assert.equal(result.reason, "internship_type");
  }
});

test("France evidence covers overseas territory and real remote-from-France wording", () => {
  const overseas = evaluateEligibility({
    ...base,
    role: "Data Science Intern",
    location: "Pointe-à-Pitre, Guadeloupe",
    contract: "Stage",
    descriptionRaw: "Développer et évaluer des modèles de machine learning. Stage de 6 mois.",
  });
  assert.equal(overseas.accepted, true);

  const remote = evaluateEligibility({
    ...base,
    role: "Machine Learning Intern",
    location: "Remote - France",
    contract: "Internship",
    descriptionRaw: "Develop machine learning models. 6 months.",
  });
  assert.equal(remote.accepted, true);
  assert.equal(remote.evidence.locationEvidence, "location:remote-france");
});

test("hard rejects still beat AI branding", () => {
  const cases = [
    {role:"Product Manager - AI Intern", company:"AI Company", contract:"Internship", descriptionRaw:"Work with customers on AI roadmap for 6 months."},
    {role:"Full Stack Intern - ML Platform", company:"ML Company", contract:"Internship", descriptionRaw:"Build web interfaces around machine learning for 6 months."},
    {role:"Customer Success Intern", company:"GenAI Company", contract:"Internship", descriptionRaw:"Support customers using LLM products for 6 months."},
    {role:"Signal Processing Intern", company:"Defense Systems SAS", contract:"Internship", descriptionRaw:"Develop radar signal processing for missile guidance. 6 months."},
  ];
  for (const item of cases) {
    const result = evaluateEligibility({...base, ...item});
    assert.equal(result.accepted, false, item.role);
  }
});

test("Quant Research internship passes when mission is substantive statistical modeling", () => {
  const result = evaluateEligibility({
    ...base,
    role: "Quant Research Intern",
    contract: "Internship",
    descriptionRaw: "Build and evaluate statistical models on high-frequency time series, simulation and forecasting. 6 months.",
  });
  assert.equal(result.accepted, true);
});

test("GenAI requires technical model-system evidence, not merely the label", () => {
  const weak = evaluateEligibility({
    ...base,
    role: "Generative AI Intern",
    contract: "Internship",
    descriptionRaw: "Coordinate customer workshops and AI product roadmap for 6 months.",
  });
  assert.equal(weak.accepted, false);

  const technical = evaluateEligibility({
    ...base,
    role: "Generative AI Intern",
    contract: "Internship",
    descriptionRaw: "Evaluate LLMs, build RAG retrieval pipelines and experiment with embeddings and agent systems. 6 months.",
  });
  assert.equal(technical.accepted, true);
});

test("Phase 2B scorer also accepts a strong atypically titled industrial internship", () => {
  const result = scoreInternship({
    ...base,
    role: "Algorithms Intern",
    contract: "Internship",
    postedDate: "2026-09-04T10:00:00Z",
    compensation: "Paid internship",
    descriptionRaw: "Final-year Master internship for 6 months in an industrial R&D engineering team. Develop machine learning models and algorithms for sensor fusion, train and benchmark them in Python and PyTorch, run experiments and validation, then deploy the resulting pipeline into a real-world production system with team mentorship.",
  }, {now:new Date("2026-09-05T12:00:00Z")});
  assert.equal(result.accepted, true);
  assert.ok(result.fitScore >= 75);
});
