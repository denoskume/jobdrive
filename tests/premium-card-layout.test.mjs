import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test(
  "M2 internships use the premium responsive card layout",
  () => {
    const appPath = path.resolve("src/AppPro.jsx");
    const app = fs.readFileSync(appPath, "utf8");

    const imports = [
      ...app.matchAll(
        /import\s+["']([^"']+\.css)["'];?/g
      ),
    ].map((match) => match[1]);

    assert.ok(
      imports.length > 0,
      "AppPro must import a stylesheet"
    );

    const cssImport =
      imports.find((item) =>
        /AppPro|pro/i.test(item)
      ) ?? imports.at(-1);

    const cssPath = path.resolve(
      path.dirname(appPath),
      cssImport
    );

    const css = fs.readFileSync(cssPath, "utf8");

    assert.match(
      css,
      /JOBDRIVE_PREMIUM_CARDS_V1/
    );

    assert.match(
      css,
      /grid-template-columns:\s*repeat\(3/
    );

    assert.match(
      css,
      /translateY\(-4px\)/
    );

    assert.match(
      css,
      /@media\s*\(max-width:\s*1100px\)/
    );

    assert.match(
      css,
      /@media\s*\(max-width:\s*720px\)/
    );
  }
);
