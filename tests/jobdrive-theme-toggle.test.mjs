import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard =
  fs.readFileSync(
    "src/JobDriveDashboard.jsx",
    "utf8"
  );

const main =
  fs.readFileSync(
    "src/main.jsx",
    "utf8"
  );

const css =
  fs.readFileSync(
    "src/jobdrive-dashboard.css",
    "utf8"
  );

const lightThemeCss =
  fs.existsSync("src/light-theme.css")
    ? fs.readFileSync("src/light-theme.css", "utf8")
    : "";

test("theme button toggles dark and light modes", () => {
  assert.match(
    dashboard,
    /const \[theme, setTheme\]/
  );

  assert.match(
    dashboard,
    /onClick=\{onToggleTheme\}/
  );

  assert.match(
    dashboard,
    /jd-theme-\$\{theme\}/
  );
});

test("theme preference persists in localStorage", () => {
  assert.match(
    dashboard,
    /jobdrive\.theme/
  );

  assert.match(
    dashboard,
    /localStorage\.setItem/
  );
});

test("dashboard provides light theme styles", () => {
  assert.match(
    css,
    /\.jd-shell\.jd-theme-light/
  );

  assert.match(
    dashboard,
    /name=\{\s*theme === "dark"\s*\? "moon"\s*:\s*"sun"/
  );
});

test("light mode loads a final global surface override", () => {
  assert.match(main, /import "\.\/light-theme\.css";/);
});

test("light mode covers every fullscreen detail surface", () => {
  const requiredSelectors = [
    ".jd-shell.jd-theme-light .jd-detail-backdrop",
    ".jd-shell.jd-theme-light .jd-detail-modal",
    ".jd-shell.jd-theme-light .jd-detail-modal .jd-detail-header",
    ".jd-shell.jd-theme-light .jd-detail-modal .jd-detail-scroll",
    ".jd-shell.jd-theme-light .jd-detail-modal .jd-match-card",
    ".jd-shell.jd-theme-light .jd-detail-modal .jd-info-card",
    ".jd-shell.jd-theme-light .jd-detail-modal .jd-skills",
    ".jd-shell.jd-theme-light .jd-detail-close",
  ];

  for (const selector of requiredSelectors) {
    assert.ok(
      lightThemeCss.includes(selector),
      `missing light-theme override for ${selector}`
    );
  }
});
