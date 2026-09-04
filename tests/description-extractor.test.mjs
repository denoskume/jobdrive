import test from "node:test";
import assert from "node:assert/strict";

import {
  extractOfferSections,
} from "../src/offerDescription/descriptionExtractor.mjs";

test("extracts English offer sections", () => {
  const description = `
About us
We build industrial AI systems for manufacturing.

Your role
Develop computer vision models and evaluate them on production data.
Work with the engineering team to improve model performance.

Qualifications
Final-year MSc student in Data Science or related field.
Professional English required.

Required skills
Python, PyTorch, Git and Linux.

Nice to have
Docker and CUDA.
`;

  const result =
    extractOfferSections(description);

  assert.match(
    result.about,
    /industrial AI systems/i
  );

  assert.match(
    result.roleMission,
    /Develop computer vision models/i
  );

  assert.match(
    result.expectations,
    /Final-year MSc student/i
  );

  assert.match(
    result.expectations,
    /Professional English/i
  );

  assert.match(
    result.mustHaveSkills,
    /Python/i
  );

  assert.match(
    result.mustHaveSkills,
    /PyTorch/i
  );

  assert.match(
    result.mustHaveSkills,
    /Git/i
  );

  assert.match(
    result.mustHaveSkills,
    /Linux/i
  );

  assert.doesNotMatch(
    result.mustHaveSkills,
    /Docker/i
  );

  assert.doesNotMatch(
    result.mustHaveSkills,
    /CUDA/i
  );
});


test("extracts French offer sections", () => {
  const description = `
À propos
Nous développons des solutions de vision industrielle.

Vos missions
Développer et évaluer des modèles de deep learning.
Analyser des images issues de systèmes industriels.

Profil recherché
Étudiant en dernière année de Master.
Anglais professionnel demandé.

Compétences requises
Python, PyTorch, traitement d'image et Git.

Compétences appréciées
Docker et Kubernetes.
`;

  const result =
    extractOfferSections(description);

  assert.match(
    result.about,
    /vision industrielle/i
  );

  assert.match(
    result.roleMission,
    /Développer et évaluer/i
  );

  assert.match(
    result.expectations,
    /dernière année de Master/i
  );

  assert.match(
    result.mustHaveSkills,
    /Python/i
  );

  assert.match(
    result.mustHaveSkills,
    /traitement d'image/i
  );

  assert.doesNotMatch(
    result.mustHaveSkills,
    /Docker/i
  );

  assert.doesNotMatch(
    result.mustHaveSkills,
    /Kubernetes/i
  );
});


test("returns explicit fallback for missing sections", () => {
  const description = `
Your role
Build machine learning models.

Required skills
Python and SQL.
`;

  const result =
    extractOfferSections(description);

  assert.equal(
    result.about,
    "Not specified in the available offer description."
  );

  assert.equal(
    result.expectations,
    "Not specified in the available offer description."
  );

  assert.match(
    result.roleMission,
    /Build machine learning models/i
  );

  assert.match(
    result.mustHaveSkills,
    /Python and SQL/i
  );
});


test("does not invent content from an empty description", () => {
  const result =
    extractOfferSections("");

  const fallback =
    "Not specified in the available offer description.";

  assert.equal(result.about, fallback);
  assert.equal(result.roleMission, fallback);
  assert.equal(result.expectations, fallback);
  assert.equal(result.mustHaveSkills, fallback);
});
