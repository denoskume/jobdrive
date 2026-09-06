import test from "node:test";
import assert from "node:assert/strict";

import {
  isIndustryInternship,
} from "../src/utils/jobDrive.mjs";

const base = {
  type: "Stage M2",
  location: "Paris, France",
  contract: "Stage 6 mois, janvier 2027",
  source: "Official careers",
  companyDomain: "",
  link: "https://example.com/internship",
  whyRelevant: "",
  notes: "",
  roleMission: "",
  mustHaveSkills: "",
  expectations: "",
};

test("accepts LiDAR internship when technical alignment is in domain and description", () => {
  const job = {
    ...base,
    company: "Alstom",
    role: "Internship - LiDAR Technology & System Design Engineer F/H",
    domain: "LiDAR / 3D Sensing / Signal & System Engineering",
    descriptionRaw:
      "Benchmark LiDAR sensors, process sensing data, perform 3D modelling, testing and system validation.",
  };

  assert.equal(isIndustryInternship(job), true);
});

test("accepts quant internship when technical alignment is outside the short title", () => {
  const job = {
    ...base,
    company: "Euronext",
    role: "Quant Intern",
    domain: "Data Science / Quantitative Research / High-Frequency Data / Statistics",
    descriptionRaw:
      "Research market microstructure using high-frequency data, Python, probability and statistics.",
  };

  assert.equal(isIndustryInternship(job), true);
});

test("accepts signal and ML internship when title alone is not an allow-list match", () => {
  const job = {
    ...base,
    company: "IFP Energies nouvelles",
    role: "Exploitation de données de vélocimétrie et de mesures haute fréquence par apprentissage automatique pour la caractérisation d'écoulements réactifs",
    domain: "Signal Processing / Machine Learning / Experimental Data / Flow Diagnostics",
    descriptionRaw:
      "Traitement du signal, analyse de données, intelligence artificielle, machine learning and computer vision.",
  };

  assert.equal(isIndustryInternship(job), true);
});

test("still rejects academic and research-lab organizations", () => {
  const job = {
    ...base,
    company: "Bordeaux Institute of Oncology — Inserm U1312 / Université de Bordeaux",
    role: "Data Science Intern",
    domain: "Data Science / Generative Modeling",
    descriptionRaw: "Machine learning and statistical learning internship.",
  };

  assert.equal(isIndustryInternship(job), false);
});

test("still rejects clearly off-target roles even when description mentions AI", () => {
  const job = {
    ...base,
    company: "Example Corp",
    role: "Marketing Intern",
    domain: "Artificial Intelligence",
    descriptionRaw: "Use AI tools to support marketing campaigns.",
  };

  assert.equal(isIndustryInternship(job), false);
});
