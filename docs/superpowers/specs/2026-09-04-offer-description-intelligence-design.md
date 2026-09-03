# JobDrive Offer Description Intelligence — Design

## Goal

JobDrive must persist the real description of every internship and display a faithful one-column summary in the fullscreen popup.

The summary contains exactly:
1. About
2. Role & mission
3. Expectations
4. Must-have skills

No information may be invented.

## Persistent Google Sheets schema

Current identity columns:
- X: companyDomain
- Y: logoUrl

Add:
- Z: descriptionRaw
- AA: about
- AB: roleMission
- AC: expectations
- AD: mustHaveSkills
- AE: descriptionSource
- AF: descriptionFetchedAt
- AG: descriptionStatus

Normalized job fields must use the same camelCase names.

## Preservation policy

A previously valid description snapshot must never be erased because:
- the official page expired
- a fetch failed
- parsing failed
- an ATS returned incomplete data

Statuses:
- live
- cached
- unavailable

The last successful description remains available permanently.

## Acquisition priority

1. Description supplied by the discovery source
2. Official company careers page
3. Supported ATS structured content
4. Existing stored snapshot
5. unavailable

Supported ATS targets include Greenhouse, Lever, SmartRecruiters, Teamtailor and public Workday pages when accessible.

## Structured extraction

The extractor converts descriptionRaw into:

- about
- roleMission
- expectations
- mustHaveSkills

### About
Company, team, department, product, project or business context.

Typical headings:
About, About us, Who we are, Team, Context, Project,
À propos, Contexte, Présentation.

### Role & mission
Real tasks and responsibilities.

Typical headings:
Role, Mission, Responsibilities, What you will do,
Your role, Tasks, Vos missions, Le poste.

### Expectations
Candidate profile requirements other than technical skills.

Includes:
education, degree, graduation status, availability, duration,
languages, work authorization and explicitly requested soft skills.

Typical headings:
Requirements, Qualifications, Profile, Who you are,
Your profile, Profil recherché, Prérequis.

### Must-have skills
Only explicitly required or strongly expected technical skills.

Examples:
Python, PyTorch, TensorFlow, SQL, Git, Linux,
Machine Learning, Deep Learning, Computer Vision,
Signal Processing.

Optional or nice-to-have skills must not be promoted to mandatory skills.

## Extraction rules

Prefer real section headings from the source.

If headings are absent, classify sentences conservatively from the real description.

Do not infer technologies only from the job title.

Do not generate generic career language.

If reliable content is unavailable for a section, return:
"Not specified in the available offer description."

## Popup

Replace the current 2x2 Offer Snapshot layout with one vertical column:

About
Role & mission
Expectations
Must-have skills

Each block:
- full width
- natural height
- readable paragraphs or compact bullet-style content
- no fixed clipping
- internal popup scroll remains available

Keep:
- official offer button
- save action
- match score
- job details
- tracking controls

## Compatibility

Must preserve:
- Google OAuth
- current tracking updates
- existing Sheet rows
- company identity fields
- GitHub Pages static deployment
- zero paid APIs/services

Old rows with no description fields normalize safely to empty strings.

## Testing

Required regression coverage:
- new Sheet columns normalize correctly
- old rows remain compatible
- English descriptions
- French descriptions
- missing About section
- missing Expectations section
- optional skills stay optional
- failed refresh preserves old snapshot
- expired offer preserves cached snapshot
- exact four popup sections
- popup uses one column
- official link remains accessible
- no fabricated content
- full npm test
- production build
- git diff --check

## Non-goals

No paid AI backend.
No database migration.
No OAuth redesign.
No automatic job application.
No rewriting of official descriptions.
