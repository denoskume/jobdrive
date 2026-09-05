# JobDrive Phase 2B — Internship Scoring & Ranking Engine

## Goal

Replace JobDrive's current coarse internship scoring with a deterministic, explainable scoring engine designed for the M2 DASSIP/CORO internship search.

Priority order:

1. M2 DASSIP/CORO technical alignment.
2. Technical quality of the internship.
3. Company and engineering environment quality.
4. Practical M2 compatibility.
5. Freshness and deadline.
6. Compensation only as the final factor.

The system remains free and uses no paid AI API.

## Current state

The current discovery pipeline already contains:

- `evaluateDiscoveryCandidate_()`
- `scoreDiscoveryCandidate_()`
- `domain`
- `priority`
- `fitScore`
- `whyRelevant`

Candidates below 75 are currently rejected.

Phase 2B replaces the scoring logic while preserving discovery, deduplication, Google Sheets, descriptions, company identity, tracking fields and the existing 12-hour schedule.

## Core principle

Scoring happens in two stages:

1. mandatory eligibility gates;
2. weighted ranking for eligible internships only.

A weighted score must never compensate for a fundamental incompatibility.

## Mandatory eligibility gates

Reject before scoring when reliable evidence shows any of the following.

### Wrong employment type

Reject:

- CDI / permanent role
- apprenticeship / alternance
- PhD
- CIFRE
- postdoc
- non-internship employment

### Academic employer

Reject internships primarily hosted by:

- university
- college
- academic school
- public academic laboratory
- research institute
- doctoral school

Industry R&D teams remain eligible.

### Defense policy

Reject explicitly defense-oriented or military-oriented internships.

A dual-use company is not rejected solely by its name when the internship itself is clearly civilian.

### Technical misalignment

Core accepted families:

- Data Science
- Machine Learning
- Deep Learning
- Computer Vision
- Image Processing
- Signal Processing
- Audio / Speech ML
- Multimodal AI
- Representation Learning
- Time Series
- Sensor ML
- Medical Imaging
- Biomedical Signal ML
- Remote Sensing
- Geospatial ML
- substantial Generative AI with real modelling, experimentation or evaluation

Reject clearly off-target roles such as:

- generic Business Intelligence
- Power BI reporting
- ERP / SAP consulting
- cybersecurity
- QA testing
- generic web development
- software support
- purely business analytics
- non-technical product or marketing work

## Weighted score

Eligible internships receive a score from 0 to 100.

### 1. M2 DASSIP/CORO & technical alignment — 45 points

Evaluate:

- target technical family relevance;
- ML / signal / image / data depth;
- final-year MSc level;
- modelling, experimentation or algorithm work;
- explicitly requested technical skills;
- relevance to ML Engineer, Computer Vision Engineer and Image Processing Engineer directions.

### 2. Internship technical quality — 20 points

Positive evidence includes:

- real technical problem ownership;
- model development;
- training or fine-tuning;
- algorithm design;
- experimentation and evaluation;
- computer vision or signal-processing pipelines;
- ML-related data pipelines;
- engineering validation;
- ML deployment or MLOps exposure.

Reduce the score for vague, reporting-heavy or primarily non-technical work.

### 3. Company & environment quality — 15 points

Evaluate:

- credible engineering or R&D teams;
- strong product or industrial context;
- recognised expertise in the target field;
- technical mentorship;
- real technical exposure;
- credible post-internship employment potential.

Company prestige alone must not dominate.

### 4. Practical M2 compatibility — 10 points

Evaluate:

- duration;
- expected start period;
- final-year/Master compatibility;
- location in France;
- realistic candidate level;
- explicit language/work-authorisation requirements.

Target period: approximately January–June 2027.

### 5. Freshness & deadline — 5 points

Prefer active, recent offers and opportunities with sufficient time to apply.

Missing publication dates are neutral, not rejection criteria.

### 6. Compensation — 5 points

Compensation is intentionally the smallest component.

Missing compensation is neutral.

Compensation must never overcome poor technical alignment.

## Score grades

- A: 90–100
- B: 80–89
- C: 75–79
- D: below 75

Only eligible opportunities scoring at least 75 are automatically inserted by discovery.

## Application priority

Default:

- Haute: 85–100
- Moyenne: 75–84
- Basse: below 75

Deadline urgency may affect application action priority but must not modify the underlying fit score.

## Domain classification

Every eligible internship receives one dominant domain.

Supported domains include:

- Machine Learning
- Deep Learning
- Computer Vision
- Image Processing
- Signal Processing
- Audio / Speech
- Data Science
- Time Series
- Medical Imaging
- Biomedical Signal
- Remote Sensing / Geospatial
- Multimodal AI
- Generative AI

Classification must use real offer evidence. When a description is available, the job title alone is insufficient.

## Evidence hierarchy

Use the richest trustworthy evidence available:

1. `descriptionRaw`
2. `roleMission`
3. `mustHaveSkills`
4. `expectations`
5. role/title
6. source metadata

Do not invent missing technologies, compensation, responsibilities, degree requirements or company characteristics.

Missing information reduces confidence but is not automatically negative.

## Output contract

Accepted candidates return:

- `accepted`
- `fitScore`
- `grade`
- `priority`
- `domain`
- `whyRelevant`
- `strengths`
- `weaknesses`
- `scoreBreakdown`
- `scoringVersion`

`scoreBreakdown` contains:

- `alignment` — max 45
- `technicalQuality` — max 20
- `companyQuality` — max 15
- `practicalFit` — max 10
- `freshness` — max 5
- `compensation` — max 5

The components must always sum exactly to `fitScore`.

Rejected candidates return:

- `accepted: false`
- `rejectionReason`
- `rejectionSignals`

## Explainability

`whyRelevant` must explain the actual reasons for the match rather than repeat the role title.

`strengths` contains positive evidence.

`weaknesses` contains real limitations or unknowns, for example:

- compensation not specified;
- duration not specified;
- limited production exposure.

Unknown information must never be guessed.

## Persistence

Preserve existing fields:

- `domain`
- `priority`
- `fitScore`
- `whyRelevant`

Add scoring metadata after the current description columns:

- AI: `scoreGrade`
- AJ: `scoreBreakdown`
- AK: `scoringStrengths`
- AL: `scoringWeaknesses`
- AM: `scoringVersion`
- AN: `scoringUpdatedAt`

`scoreBreakdown` is stored as compact JSON.

Existing rows without the new fields remain valid. No user-owned tracking field may be overwritten.

## Scoring version

Initial scoring version: `2.0`.

## Architecture

Create an isolated scoring subsystem.

Target structure:

```text
src/scoring/
  scoringConfig.mjs
  eligibility.mjs
  domainClassifier.mjs
  scoringEvidence.mjs
  scoringEngine.mjs
```

Apps Script production scoring follows the same contract.

If browser/test modules and Apps Script cannot share identical files, their behaviour must be protected by parity tests.

`Discovery.gs` remains orchestration code rather than containing all rules.

## Discovery flow

Phase 2B flow:

```text
source
→ normalize
→ collect evidence
→ mandatory eligibility gates
→ domain classification
→ weighted scoring
→ explanation
→ threshold
→ Sheet upsert
```

One scoring failure must not crash the complete discovery run.

## Existing opportunity compatibility

Previously stored opportunities must continue to load.

The dashboard must tolerate:

- old scores;
- old `whyRelevant`;
- no scoring metadata;
- missing descriptions;
- missing compensation.

Phase 2B must not delete existing tracked opportunities automatically.

## Sorting

Default eligible-opportunity ranking:

1. fitScore descending;
2. application priority;
3. deadline urgency;
4. publication date descending;
5. detected date descending.

A weaker technical fit must never outrank a stronger fit merely because it is newer or better paid.

## Testing

Required coverage:

- academic internship rejected;
- university/laboratory rejected;
- defense internship rejected;
- CDI rejected;
- alternance rejected;
- PhD/CIFRE/postdoc rejected;
- cybersecurity rejected;
- Power BI/reporting rejected;
- strong ML internship accepted;
- strong Computer Vision internship accepted;
- Image Processing internship accepted;
- Signal Processing internship accepted;
- Audio/Speech internship accepted;
- Medical Imaging internship accepted;
- Remote Sensing internship accepted;
- rich technical work scores above generic data work;
- company prestige cannot dominate alignment;
- compensation cannot dominate alignment;
- missing compensation is safe;
- missing publication date is safe;
- component maximum weights are enforced;
- score breakdown sum equals fitScore;
- grade boundaries are correct;
- priority boundaries are correct;
- deterministic identical input produces identical output;
- French offers work;
- English offers work;
- old Sheet rows remain compatible;
- new scoring columns normalize safely;
- rejected offers are not inserted;
- deduplication remains unchanged;
- discovery source registry remains unchanged.

Final verification requires:

```text
npm test
npm run build
git diff --check
```

## Non-goals

Phase 2B does not:

- use paid AI APIs;
- apply automatically to internships;
- generate cover letters;
- redesign Google OAuth;
- replace discovery sources;
- change the 12-hour discovery schedule;
- scrape LinkedIn or Indeed;
- invent missing offer data;
- optimise primarily for compensation;
- include academic/research-lab internships.

## Acceptance criteria

Phase 2B is complete when JobDrive can:

1. reject incompatible opportunities correctly;
2. identify the dominant technical domain;
3. assign an explainable 0–100 score;
4. preserve the 45/20/15/10/5/5 weighting;
5. produce grade and application priority;
6. explain strengths and weaknesses;
7. persist scoring metadata safely;
8. rank strong DASSIP/CORO internships above weak matches;
9. prevent compensation from dominating;
10. preserve tracking, descriptions, identity, discovery and deduplication.

## Rollout

Implement on `feature/phase2b-scoring-engine` using test-driven development.

Before merge:

```text
npm test
npm run build
git diff --check
```

Review the final diff before merging to `main`.

After merge, push Apps Script once with `npx clasp push`.

Do not recreate the existing 12-hour trigger unless its handler changes.
