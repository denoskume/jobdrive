import fs from "node:fs";

function replaceOnce(source, needle, replacement, label) {
  const index = source.indexOf(needle);
  if (index < 0) throw new Error(`Missing transform anchor: ${label}`);
  if (source.indexOf(needle, index + needle.length) >= 0) {
    throw new Error(`Ambiguous transform anchor: ${label}`);
  }
  return source.slice(0, index) + replacement + source.slice(index + needle.length);
}

const appPath = "src/AppPro.jsx";
let app = fs.readFileSync(appPath, "utf8");

app = replaceOnce(
  app,
  'import ActionCenterView from "./actions/ActionCenterView.jsx";\n',
  'import ActionCenterView from "./actions/ActionCenterView.jsx";\nimport TargetCompaniesView from "./companies/TargetCompaniesView.jsx";\nimport { normalizeTargetCompanyRows } from "./companies/targetCompanies.mjs";\n',
  "AppPro company imports"
);

app = replaceOnce(
  app,
  '  readDiscoveryCoverage,\n  readJobs,\n  updateDescriptionFields,',
  '  readDiscoveryCoverage,\n  readJobs,\n  readTargetCompanies,\n  updateDescriptionFields,',
  "AppPro sheets import"
);

app = replaceOnce(
  app,
  '  const [coverageError, setCoverageError] = useState("");\n  const [loading, setLoading] = useState(false);',
  '  const [coverageError, setCoverageError] = useState("");\n  const [targetCompanies, setTargetCompanies] = useState([]);\n  const [targetCompaniesError, setTargetCompaniesError] = useState("");\n  const [loading, setLoading] = useState(false);',
  "AppPro target company state"
);

app = replaceOnce(
  app,
  '      const [result, coverageRead] = await Promise.all([\n        readJobs({ token, spreadsheetId: SPREADSHEET_ID }),\n        readDiscoveryCoverage({ token, spreadsheetId: SPREADSHEET_ID })\n          .then((value) => ({ value, error: null }))\n          .catch((coverageReadError) => ({ value: null, error: coverageReadError })),\n      ]);',
  '      const [result, coverageRead, targetCompanyRead] = await Promise.all([\n        readJobs({ token, spreadsheetId: SPREADSHEET_ID }),\n        readDiscoveryCoverage({ token, spreadsheetId: SPREADSHEET_ID })\n          .then((value) => ({ value, error: null }))\n          .catch((coverageReadError) => ({ value: null, error: coverageReadError })),\n        readTargetCompanies({ token, spreadsheetId: SPREADSHEET_ID })\n          .then((values) => ({ value: normalizeTargetCompanyRows(values), error: null }))\n          .catch((readError) => ({ value: [], error: readError })),\n      ]);',
  "AppPro parallel target company read"
);

app = replaceOnce(
  app,
  '      const internshipResult = filterInternships(result);',
  '      setTargetCompanies(targetCompanyRead.value);\n      setTargetCompaniesError(targetCompanyRead.error?.message || "");\n\n      const internshipResult = filterInternships(result);',
  "AppPro target company result"
);

app = replaceOnce(
  app,
  '        setCoverage(emptyCoverageSnapshot());\n        setCoverageError("");\n        setUserProfile(null);',
  '        setCoverage(emptyCoverageSnapshot());\n        setCoverageError("");\n        setTargetCompanies([]);\n        setTargetCompaniesError("");\n        setUserProfile(null);',
  "AppPro expiry reset"
);

app = replaceOnce(
  app,
  '    setCoverage(emptyCoverageSnapshot());\n    setCoverageError("");\n    setSelectedJob(null);',
  '    setCoverage(emptyCoverageSnapshot());\n    setCoverageError("");\n    setTargetCompanies([]);\n    setTargetCompaniesError("");\n    setSelectedJob(null);',
  "AppPro logout reset"
);

app = replaceOnce(
  app,
  '    ) : view === "analytics" ? (\n      <AnalyticsView jobs={jobs} />\n    ) : null;',
  '    ) : view === "analytics" ? (\n      <AnalyticsView jobs={jobs} />\n    ) : view === "companies" ? (\n      <TargetCompaniesView\n        companies={targetCompanies}\n        error={targetCompaniesError}\n        loading={loading}\n      />\n    ) : null;',
  "AppPro companies alternate content"
);

fs.writeFileSync(appPath, app);

const dashboardPath = "src/JobDriveDashboard.jsx";
let dashboard = fs.readFileSync(dashboardPath, "utf8");

dashboard = replaceOnce(
  dashboard,
  '        <button>\n          <Icon name="companies" />\n          Companies\n        </button>',
  '        <button\n          className={\n            view === "companies"\n              ? "active"\n              : ""\n          }\n          onClick={() =>\n            onViewChange("companies")\n          }\n        >\n          <Icon name="companies" />\n          Companies\n        </button>',
  "JobDrive Companies navigation"
);

fs.writeFileSync(dashboardPath, dashboard);
console.log("Target Companies UI transforms applied.");
