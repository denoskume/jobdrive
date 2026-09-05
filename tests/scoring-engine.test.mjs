import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const SCORER_PATH = new URL("../src/scoring/scoringEngine.mjs", import.meta.url);
const CONFIG_PATH = new URL("../src/scoring/scoringConfig.mjs", import.meta.url);
const now = new Date("2026-09-05T12:00:00Z");

async function loadScoring() {
  assert.equal(fs.existsSync(SCORER_PATH), true, "scoringEngine.mjs must exist");
  assert.equal(fs.existsSync(CONFIG_PATH), true, "scoringConfig.mjs must exist");

  const scoring = await import(SCORER_PATH.href);
  const config = await import(CONFIG_PATH.href);
  return { scoring, config };
}

function candidate(overrides = {}) {
  return {
    company: "Industrial AI Company",
    role: "Machine Learning Intern",
    location: "Paris, France",
    contract: "Internship",
    postedDate: "2026-09-01",
    deadline: "2026-10-01",
    compensation: "",
    descriptionRaw:
      "Final-year Master internship. Train and evaluate PyTorch models with an R&D engineering team on an industrial product.",
    roleMission: "Train, evaluate and compare machine learning models.",
    expectations: "Final-year MSc student available for six months in France.",
    mustHaveSkills: "Python, PyTorch, Machine Learning",
    ...overrides,
  };
}

test("exports the approved scoring version and exact weights", async () => {
  const { config } = await loadScoring();

  assert.equal(config.SCORING_VERSION, "2.0");
  assert.deepEqual(config.SCORE_WEIGHTS, {
    alignment: 45,
    technicalQuality: 20,
    companyQuality: 15,
    practicalFit: 10,
    freshness: 5,
    compensation: 5,
  });
});

test("rejects academic laboratory internships before weighted scoring", async () => {
  const { scoring } = await loadScoring();
  const result = scoring.scoreInternship(candidate({
    company: "Université de Nantes - Research Laboratory",
  }), { now });

  assert.equal(result.accepted, false);
  assert.equal(result.rejectionReason, "academic_policy");
});

test("rejects explicitly military missions before weighted scoring", async () => {
  const { scoring } = await loadScoring();
  const result = scoring.scoreInternship(candidate({
    descriptionRaw:
      "Develop target detection algorithms for military missile guidance systems.",
    roleMission:
      "Develop and evaluate target detection for a military weapon system.",
  }), { now });

  assert.equal(result.accepted, false);
  assert.equal(result.rejectionReason, "defense_policy");
});

test("rejects wrong employment types", async () => {
  const { scoring } = await loadScoring();

  for (const contract of ["CDI", "Alternance", "PhD", "CIFRE", "Postdoc"]) {
    const result = scoring.scoreInternship(candidate({ contract }), { now });
    assert.equal(result.accepted, false, `expected ${contract} to be rejected`);
    assert.equal(result.rejectionReason, "internship_type");
  }
});

test("rejects clearly off-target reporting work", async () => {
  const { scoring } = await loadScoring();
  const result = scoring.scoreInternship(candidate({
    role: "Power BI Reporting Intern",
    descriptionRaw:
      "Build business dashboards and recurring reporting in Power BI and Excel.",
    roleMission: "Reporting and dashboard maintenance.",
    mustHaveSkills: "Power BI, Excel",
  }), { now });

  assert.equal(result.accepted, false);
  assert.equal(result.rejectionReason, "technical_alignment");
});

test("classifies strong target-domain internships from real offer evidence", async () => {
  const { scoring } = await loadScoring();
  const fixtures = [
    [
      "Computer Vision",
      "Computer Vision Intern",
      "Python, PyTorch, Computer Vision",
      "Train vision models for object detection on industrial camera images.",
    ],
    [
      "Image Processing",
      "Image Processing Intern",
      "Python, OpenCV, Image Processing",
      "Design image-processing algorithms for industrial inspection and image enhancement.",
    ],
    [
      "Signal Processing",
      "Signal Processing Intern",
      "Python, DSP, Signal Processing",
      "Design spectral and time-frequency algorithms for sensor signals.",
    ],
    [
      "Audio / Speech",
      "Speech ML Intern",
      "Python, ASR, Speech Processing",
      "Train acoustic and ASR models for speech signals and evaluate word error rate.",
    ],
    [
      "Medical Imaging",
      "Medical Imaging Intern",
      "Python, PyTorch, Medical Imaging",
      "Develop deep-learning segmentation for MRI medical images.",
    ],
    [
      "Remote Sensing / Geospatial",
      "Remote Sensing ML Intern",
      "Python, PyTorch, Remote Sensing",
      "Train satellite models on geospatial imagery for land-cover classification.",
    ],
  ];

  for (const [domain, role, mustHaveSkills, text] of fixtures) {
    const result = scoring.scoreInternship(candidate({
      role,
      mustHaveSkills,
      descriptionRaw: text,
      roleMission: text,
    }), { now });

    assert.equal(result.accepted, true, `${domain} should be accepted`);
    assert.equal(result.domain, domain);
  }
});

test("weighted score is deterministic and respects component caps", async () => {
  const { scoring, config } = await loadScoring();
  const input = candidate();
  const first = scoring.scoreInternship(input, { now });
  const second = scoring.scoreInternship(input, { now });

  assert.deepEqual(first, second);
  assert.equal(first.accepted, true);

  const entries = Object.entries(first.scoreBreakdown);
  const sum = entries.reduce((total, [, value]) => total + value, 0);
  assert.equal(sum, first.fitScore);

  for (const [key, max] of Object.entries(config.SCORE_WEIGHTS)) {
    assert.ok(first.scoreBreakdown[key] >= 0, `${key} must be non-negative`);
    assert.ok(first.scoreBreakdown[key] <= max, `${key} must not exceed ${max}`);
  }
});

test("missing compensation and publication date are neutral rather than rejection reasons", async () => {
  const { scoring } = await loadScoring();
  const result = scoring.scoreInternship(candidate({
    compensation: "",
    postedDate: "",
  }), { now });

  assert.equal(result.accepted, true);
  assert.equal(result.scoreBreakdown.compensation, 2);
  assert.equal(result.scoreBreakdown.freshness, 2);
});

test("grade and priority boundaries are exact", async () => {
  const { scoring } = await loadScoring();

  assert.equal(scoring.gradeForScore(100), "A");
  assert.equal(scoring.gradeForScore(90), "A");
  assert.equal(scoring.gradeForScore(89), "B");
  assert.equal(scoring.gradeForScore(80), "B");
  assert.equal(scoring.gradeForScore(79), "C");
  assert.equal(scoring.gradeForScore(75), "C");
  assert.equal(scoring.gradeForScore(74), "D");

  assert.equal(scoring.priorityForScore(85), "Haute");
  assert.equal(scoring.priorityForScore(84), "Moyenne");
  assert.equal(scoring.priorityForScore(75), "Moyenne");
  assert.equal(scoring.priorityForScore(74), "Basse");
});

test("technical depth outranks generic data work and compensation cannot dominate", async () => {
  const { scoring } = await loadScoring();

  const strong = scoring.scoreInternship(candidate({
    role: "Computer Vision Intern",
    mustHaveSkills: "Python, PyTorch, Computer Vision",
    descriptionRaw:
      "Design, train and evaluate computer vision models for industrial image segmentation. Run experiments, compare algorithms and deploy the selected model with the R&D team.",
    roleMission:
      "Own model training, experimentation, evaluation and deployment for an industrial vision pipeline.",
    compensation: "1200 EUR/month",
  }), { now });

  const generic = scoring.scoreInternship(candidate({
    role: "Data Science Intern",
    mustHaveSkills: "Python, SQL, Data Science",
    descriptionRaw:
      "Prepare datasets and basic descriptive analyses for an analytics team.",
    roleMission: "Clean data and prepare recurring analyses.",
    compensation: "2500 EUR/month",
  }), { now });

  assert.equal(strong.accepted, true);
  assert.equal(generic.accepted, true);
  assert.ok(strong.fitScore > generic.fitScore);
  assert.ok(strong.scoreBreakdown.alignment >= generic.scoreBreakdown.alignment);
});
