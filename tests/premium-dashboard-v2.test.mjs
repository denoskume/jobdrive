import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app =
  fs.readFileSync(
    "src/AppPro.jsx",
    "utf8"
  );

const css =
  fs.readFileSync(
    "src/pro.css",
    "utf8"
  );

test(
  "uses native opportunity cards",
  () => {
    assert.match(
      app,
      /function OpportunityCards/
    );

    assert.match(
      app,
      /className="pro-opportunity-grid"/
    );

    assert.doesNotMatch(
      app,
      /function OpportunityTable/
    );
  }
);


test(
  "uses fixed premium top navigation",
  () => {
    assert.match(
      app,
      /className="pro-topbar"/
    );

    assert.match(
      css,
      /\.pro-topbar\s*\{[\s\S]*?position:\s*fixed/
    );

    assert.match(
      css,
      /grid-template-columns:\s*repeat\(\s*3/
    );
  }
);
