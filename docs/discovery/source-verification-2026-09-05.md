# JobDrive Discovery Source Verification — 2026-09-05

Phase 2A source verification matrix. A source is active only when the public ATS relationship and job records were verified. Existing production-run evidence is accepted for sources that returned successfully during the validated 7/7 run; newly added sources were verified from their public ATS job boards before activation.

| Source | Company | ATS | Tenant | Status | Evidence / note |
| --- | --- | --- | --- | --- | --- |
| mistral-ashby | Mistral AI | Ashby | mistral.ai | verified / active | Public Ashby jobs under `jobs.ashbyhq.com/mistral.ai`; existing production adapter already successful. |
| datadog-greenhouse | Datadog | Greenhouse | datadog | verified / active | Existing production run successful. |
| doctolib-greenhouse | Doctolib | Greenhouse | doctolib | verified / active | Public board: `https://job-boards.greenhouse.io/doctolib`; production run successful. |
| backmarket-ashby | Back Market | Ashby | backmarket | verified / active | Public Ashby job pages under `jobs.ashbyhq.com/backmarket`; production run successful. |
| bosch-smartrecruiters | Bosch France | SmartRecruiters | BoschGroup | verified / active | Existing production run successful. |
| visa-smartrecruiters | Visa | SmartRecruiters | Visa | verified / active | Existing production run successful. |
| publicis-smartrecruiters | Publicis Groupe | SmartRecruiters | PublicisGroupe | verified / active | Existing production run successful. |
| alan-ashby | Alan | Ashby | alan | verified / active | Public France jobs under `https://jobs.ashbyhq.com/alan/...`. |
| nabla-ashby | Nabla | Ashby | nabla | verified / active | Public Paris jobs under `https://jobs.ashbyhq.com/nabla/...`. |
| owkin-ashby | Owkin | Ashby | owkin | verified / active | Public Paris/France jobs under `https://jobs.ashbyhq.com/owkin/...`. |
| pennylane-ashby | Pennylane | Ashby | pennylane | verified / active | Public Paris/France jobs under `https://jobs.ashbyhq.com/pennylane/...`. |
| hcompany-ashby | H Company | Ashby | hcompany | verified / active | Public Paris jobs including Graduation Internship - AI Research under `https://jobs.ashbyhq.com/hcompany/...`. |
| photoroom-ashby | Photoroom | Ashby | photoroom | verified / active | Public Paris ML jobs under `https://jobs.ashbyhq.com/photoroom/...`. |
| dust-ashby | Dust | Ashby | dust | verified / active | Public Paris jobs under `https://jobs.ashbyhq.com/dust/...`. |
| gladia-ashby | Gladia | Ashby | gladia | verified / active | Public Paris audio-AI jobs under `https://jobs.ashbyhq.com/gladia/...`. |
| decathlon-greenhouse | Decathlon Digital | Greenhouse | decathlontechnologyen | verified / active | Public board `https://job-boards.greenhouse.io/decathlontechnologyen` with AI/ML/Data roles in Paris/Lille. |
| ubisoft-smartrecruiters | Ubisoft | SmartRecruiters | Ubisoft2 | verified / active | Public ML roles under `https://jobs.smartrecruiters.com/Ubisoft2/...` in Paris. |
| poolside-ashby | Poolside | Ashby | poolside | verified / active | Public Paris-oriented research/engineering board `https://jobs.ashbyhq.com/poolside`. |
| dataiku-greenhouse | Dataiku | Greenhouse | dataiku | verified / active | Public board `https://job-boards.greenhouse.io/dataiku` with France/Paris roles. |
| blablacar-lever | BlaBlaCar | Lever | blablacar | verified / active | Public board `https://jobs.lever.co/blablacar` with Paris/France jobs and internship records. |
| pivot-ashby | Pivot | Ashby | pivot | verified / active | Public Paris board under `https://jobs.ashbyhq.com/pivot/...`. |
| huggingface-greenhouse | Hugging Face | Greenhouse | huggingface | failed / inactive | Production endpoint returned HTTP 404; deliberately disabled. |
| qonto-ashby | Qonto | Ashby | qonto | unverified / inactive | Candidate retained only for future verification; not queried in production. |
| pigment-ashby | Pigment | Ashby | pigment | unverified / inactive | Candidate retained only for future verification; not queried in production. |
| contentsquare-greenhouse | Contentsquare | Greenhouse | contentsquare | unverified / inactive | Candidate retained only for future verification; not queried in production. |
| criteo-greenhouse | Criteo | Greenhouse | criteo | unverified / inactive | Candidate retained only for future verification; not queried in production. |
| shifttechnology-lever | Shift Technology | Lever | shifttechnology | unverified / inactive | Candidate retained only for future verification; not queried in production. |

## Result

- Candidates evaluated/recorded: 27
- Verified active sources: 21
- Failed source retained inactive: 1
- Unverified candidates retained inactive: 5
- Active ATS families represented: Ashby, Greenhouse, Lever, SmartRecruiters
- No active source uses an unverified tenant.
