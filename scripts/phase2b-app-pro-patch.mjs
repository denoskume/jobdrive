import fs from "node:fs";

const path = "src/AppPro.jsx";
let code = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const index = code.indexOf(before);
  if (index < 0) {
    throw new Error(`Patch anchor not found: ${label}`);
  }
  if (code.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Patch anchor is ambiguous: ${label}`);
  }
  code = code.slice(0, index) + after + code.slice(index + before.length);
}

replaceOnce(
  "recommended sort option",
  `          >\n            <option value="newest">\n              Newest\n            </option>`,
  `          >\n            <option value="recommended">\n              Recommended\n            </option>\n            <option value="newest">\n              Newest\n            </option>`
);

replaceOnce(
  "default recommended sort",
  `  const [sortMode, setSortMode] =\n    useState("newest");`,
  `  const [sortMode, setSortMode] =\n    useState("recommended");`
);

replaceOnce(
  "fit intelligence state",
  `  const tags =\n    domainTags(job);\n\n\n  return (`,
  `  const tags =\n    domainTags(job);\n\n  const scoreBreakdown =\n    job.scoreBreakdown &&\n    typeof job.scoreBreakdown === "object"\n      ? job.scoreBreakdown\n      : {};\n\n  const scoringStrengths =\n    Array.isArray(job.scoringStrengths)\n      ? job.scoringStrengths\n      : [];\n\n  const scoringWeaknesses =\n    Array.isArray(job.scoringWeaknesses)\n      ? job.scoringWeaknesses\n      : [];\n\n  const hasFitIntelligence =\n    Boolean(\n      job.scoreGrade ||\n      job.scoringVersion ||\n      Object.keys(scoreBreakdown).length ||\n      scoringStrengths.length ||\n      scoringWeaknesses.length\n    );\n\n\n  return (`
);

replaceOnce(
  "fit intelligence section",
  `        </section>\n\n\n        <div className="pro-detail-two-column">`,
  `        </section>\n\n\n        {hasFitIntelligence && (\n          <section className="pro-detail-section">\n\n            <div className="pro-detail-section-heading">\n              <h3>Fit Intelligence</h3>\n\n              {job.scoreGrade && (\n                <span>\n                  Grade {job.scoreGrade}\n                </span>\n              )}\n            </div>\n\n            <dl className="pro-detail-list">\n              {[\n                ["Technical alignment", scoreBreakdown.alignment, 45],\n                ["Technical quality", scoreBreakdown.technicalQuality, 20],\n                ["Company & environment", scoreBreakdown.companyQuality, 15],\n                ["Practical fit", scoreBreakdown.practicalFit, 10],\n                ["Freshness", scoreBreakdown.freshness, 5],\n                ["Compensation", scoreBreakdown.compensation, 5],\n              ].map(([label, value, maximum]) => (\n                <div key={label}>\n                  <dt>{label}</dt>\n                  <dd>\n                    {Number.isFinite(Number(value))\n                      ? \`\${value}/\${maximum}\`\n                      : "—"}\n                  </dd>\n                </div>\n              ))}\n            </dl>\n\n            {scoringStrengths.length > 0 && (\n              <div className="pro-detail-copy">\n                <strong>Strengths</strong>\n                <ul>\n                  {scoringStrengths.map((item) => (\n                    <li key={item}>{item}</li>\n                  ))}\n                </ul>\n              </div>\n            )}\n\n            {scoringWeaknesses.length > 0 && (\n              <div className="pro-detail-copy">\n                <strong>Watch-outs</strong>\n                <ul>\n                  {scoringWeaknesses.map((item) => (\n                    <li key={item}>{item}</li>\n                  ))}\n                </ul>\n              </div>\n            )}\n\n          </section>\n        )}\n\n\n        <div className="pro-detail-two-column">`
);

fs.writeFileSync(path, code);
