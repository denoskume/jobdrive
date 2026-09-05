import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { scoreInternship } from "../src/scoring/scoringEngine.mjs";

const APPS_SCRIPT_SCORER = "apps-script/Scoring.gs";
const nowIso = "2026-09-05T12:00:00Z";

function candidate(overrides = {}) {
  return {
    company: "Industrial Vision Co",
    role: "Computer Vision Intern",
    location: "Paris, France",
    contract: "Internship",
    postedDate: "2026-09-01",
    deadline: "2026-10-15",
    compensation: "",
    descriptionRaw:
      "Final-year MSc internship training and evaluating PyTorch computer vision models with an industrial R&D engineering team.",
    roleMission: "Train and evaluate segmentation models and compare algorithms.",
    expectations: "Final-year Master student available for six months in France.",
    mustHaveSkills: "Python, PyTorch, Computer Vision",
    ...overrides,
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadAppsScriptScorer() {
  assert.equal(
    fs.existsSync(APPS_SCRIPT_SCORER),
    true,
    "apps-script/Scoring.gs must exist"
  );

  const context = { console };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(APPS_SCRIPT_SCORER, "utf8"),
    context,
    { filename: APPS_SCRIPT_SCORER }
  );

  assert.equal(typeof context.scoreInternshipCandidate_, "function");
  return context.scoreInternshipCandidate_;
}

function assertParity(appsScorer, fixture) {
  const browser = plain(
    scoreInternship(fixture, { now: new Date(nowIso) })
  );
  const apps = plain(appsScorer(fixture, nowIso));
  assert.deepEqual(apps, browser);
}

test("Apps Script scorer stays in parity for accepted technical domains", () => {
  const appsScorer = loadAppsScriptScorer();

  const fixtures = [
    candidate(),
    candidate({
      role: "Signal Processing Intern",
      descriptionRaw:
        "Final-year Master internship designing spectral and time-frequency algorithms for industrial sensor signals with an R&D team.",
      roleMission: "Design signal-processing algorithms and evaluate experiments.",
      mustHaveSkills: "Python, DSP, Signal Processing",
    }),
    candidate({
      role: "Speech ML Intern",
      descriptionRaw:
        "Final-year Master internship training acoustic ASR models for speech signals with an engineering team.",
      roleMission: "Train and evaluate ASR models and compare experiments.",
      mustHaveSkills: "Python, ASR, Speech Processing",
    }),
    candidate({
      role: "Medical Imaging Intern",
      descriptionRaw:
        "Final-year Master internship developing deep-learning segmentation for MRI medical images with an industrial R&D team.",
      roleMission: "Train and evaluate MRI segmentation models.",
      mustHaveSkills: "Python, PyTorch, Medical Imaging",
    }),
    candidate({
      role: "Remote Sensing ML Intern",
      descriptionRaw:
        "Final-year Master internship training satellite remote-sensing models on geospatial imagery for an industrial product.",
      roleMission: "Train and evaluate geospatial land-cover models.",
      mustHaveSkills: "Python, PyTorch, Remote Sensing",
    }),
  ];

  for (const fixture of fixtures) {
    assertParity(appsScorer, fixture);
  }
});

test("Apps Script scorer stays in parity for rejection reasons", () => {
  const appsScorer = loadAppsScriptScorer();

  const fixtures = [
    candidate({ company: "Université de Nantes - Research Laboratory" }),
    candidate({ contract: "Alternance" }),
    candidate({
      descriptionRaw:
        "Develop target-detection algorithms for military missile guidance systems.",
      roleMission: "Evaluate a military weapon guidance system.",
    }),
    candidate({
      role: "Power BI Reporting Intern",
      descriptionRaw: "Build recurring business dashboards in Power BI.",
      roleMission: "Reporting and dashboards.",
      mustHaveSkills: "Power BI, Excel",
    }),
  ];

  for (const fixture of fixtures) {
    assertParity(appsScorer, fixture);
  }
});

test("Apps Script scorer stays in parity for French offer evidence", () => {
  const appsScorer = loadAppsScriptScorer();

  assertParity(appsScorer, candidate({
    role: "Stage M2 Traitement du signal",
    contract: "Stage",
    descriptionRaw:
      "Stage de fin d'études en équipe R&D industrielle. Concevoir des algorithmes de traitement du signal et évaluer des expériences sur des signaux capteurs.",
    roleMission:
      "Concevoir et évaluer des algorithmes spectraux et temps-fréquence.",
    expectations: "Étudiant Master 2 disponible six mois en France.",
    mustHaveSkills: "Python, DSP, traitement du signal",
  }));
});

test("Apps Script scorer preserves neutral missing-data behavior", () => {
  const appsScorer = loadAppsScriptScorer();

  assertParity(appsScorer, candidate({
    compensation: "",
    postedDate: "",
    deadline: "",
  }));
});
