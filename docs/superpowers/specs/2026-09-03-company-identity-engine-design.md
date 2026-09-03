# JobDrive Company Identity Engine

Date: 2026-09-03
Status: Approved design, pending implementation plan

## Objective

Build a reusable Company Identity Engine for JobDrive so current and future
internship opportunities can display company logos without manually adding
every new employer to JobDriveDashboard.jsx.

The solution must remain free and compatible with the current static
GitHub Pages architecture.

## Core principle

JobDrive must resolve company identity dynamically.

The dashboard must not contain a growing hard-coded list of companies.

## Resolution pipeline

For every opportunity, the engine will resolve identity in this order:

1. Explicit logoUrl supplied with the opportunity.
2. Explicit companyDomain supplied with the opportunity.
3. Previously verified identity stored in local cache.
4. Official company domain extracted from the offer URL.
5. Company identity inferred from supported ATS URLs.
6. Small seed/alias registry for exceptional or known ambiguous companies.
7. Neutral company icon if no credible identity can be resolved.

The seed registry is a fallback, not the primary resolution mechanism.

## Architecture

The company identity system will be isolated from JobDriveDashboard.jsx.

Target structure:

    src/companyIdentity/
        companyIdentity.mjs
        companyIdentityCache.mjs
        companyIdentitySeeds.mjs
        companyIdentitySources.mjs

    src/components/
        CompanyLogo.jsx

The dashboard will consume CompanyLogo but will not implement company-specific
resolution logic itself.

## Resolver API

The main interface will be:

    resolveCompanyIdentity({
        company,
        link,
        source,
        companyDomain,
        logoUrl
    })

The resolver returns:

    {
        company,
        normalizedCompany,
        domain,
        logoUrl,
        source,
        confidence,
        resolved
    }

## Domain resolution

Company names will be normalized consistently.

The resolver will safely extract domains from official offer URLs.

Job boards and ATS domains must never be mistaken for employer domains.

Examples of protected intermediary domains include:

- LinkedIn
- Indeed
- Welcome to the Jungle
- Glassdoor
- HelloWork
- Greenhouse
- Lever
- SmartRecruiters
- Workday
- Teamtailor

Supported ATS URLs may still be inspected for company tenant information.

## Logo resolution

Domain discovery and logo rendering are separate responsibilities.

Once an identity is resolved, CompanyLogo will maintain a candidate chain.

Candidate order:

1. explicit verified logo URL;
2. logo/favicon source derived from the resolved company domain;
3. neutral local company icon.

If one image returns 404 or fails to load, CompanyLogo automatically tries
the next candidate.

A failed logo must never crash or blank JobDrive.

## Cache

Successful company identity resolutions will be cached in localStorage.

Versioned cache key:

    jobdrive.companyIdentity.v1

The cache must:

- tolerate corrupted data;
- never throw into React;
- avoid unnecessary repeated resolution;
- remain independent from internship/job data;
- support future migration.

## Future opportunities

New opportunities should not require source-code modifications simply because
their company has never appeared in JobDrive before.

If an opportunity contains an official company URL, domain, or resolvable ATS
identity, the engine should attempt automatic resolution.

If identity cannot be established safely, JobDrive displays the neutral
company icon instead of inventing branding.

## Google Sheets compatibility

The current Sheet schema remains supported.

Two optional fields may later be accepted:

    companyDomain
    logoUrl

Existing rows do not require migration.

## Error handling

The identity subsystem is non-critical.

Malformed URL:
    skip that resolution source.

Unknown company:
    continue through the pipeline.

Remote logo 404:
    try the next candidate.

Corrupted cache:
    ignore/reset safely.

Complete resolution failure:
    display neutral company icon.

No company-identity error may prevent JobDrive from rendering.

## Tests

Resolver tests will cover:

- official company URLs;
- subdomains;
- unknown companies;
- malformed URLs;
- accented company names;
- explicit companyDomain;
- explicit logoUrl;
- known aliases;
- ATS URLs;
- job-board URLs;
- resolution priority.

Cache tests will cover:

- successful write/read;
- corrupted JSON;
- missing entries;
- version isolation.

UI tests will verify:

- successful logo rendering;
- candidate fallback after image failure;
- neutral fallback;
- absence of generated company initials;
- dashboard render safety.

## Migration

Implementation will:

1. extract useful existing company mappings from JobDriveDashboard.jsx;
2. move exceptional aliases into companyIdentitySeeds.mjs;
3. remove company-domain resolution logic from JobDriveDashboard.jsx;
4. implement the standalone resolver;
5. implement the reusable CompanyLogo component;
6. connect opportunity URL/domain metadata;
7. preserve the current dashboard design;
8. preserve the fullscreen internship-detail popup;
9. preserve Google authentication and Sheets behavior;
10. preserve all existing internship filtering and tracking logic.

## Non-goals

This version will not:

- use paid logo APIs;
- require a backend;
- scrape arbitrary websites from the browser;
- perform browser-side web searches;
- modify JobDrive visual design;
- modify Google OAuth;
- modify internship-selection criteria.

## Acceptance criteria

The system passes when a newly discovered company can be displayed without
adding that company manually to JobDriveDashboard.jsx whenever sufficient
identity information exists in the opportunity.

An unresolved company must degrade safely to the neutral company icon.

The current JobDrive dashboard must otherwise behave and render exactly as
before.
