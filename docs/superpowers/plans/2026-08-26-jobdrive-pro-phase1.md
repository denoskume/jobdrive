# JobDrive Pro Phase 1 Implementation Plan

Goal: transform JobDrive into a secure Google-authenticated application tracker.

Architecture:
- GitHub Pages remains static hosting.
- Google Identity Services obtains a temporary OAuth access token.
- Google Sheets API reads and writes the private tracker.
- No OAuth client secret or permanent token is stored in the repository.
- Job rows are located by their ID before every write.

Files:
- src/AppPro.jsx: JobDrive Pro application UI and state.
- src/pro.css: responsive light-theme interface.
- src/services/googleAuth.js: Google Identity Services OAuth.
- src/services/sheetsApi.js: Sheets API read/write layer.
- src/utils/jobDrive.mjs: normalization, deadlines, follow-ups and analytics.
- tests/jobDrive.test.mjs: pure behavior tests.

Features:
- Google authentication gate
- private Sheet reads
- status updates
- favorites
- application date
- automatic +7 day follow-up
- private notes
- smart deadlines
- advanced filters
- analytics
- application pipeline
- desktop table
- mobile opportunity cards
- job detail drawer

Verification:
- node tests
- Vite production build
- git diff --check
