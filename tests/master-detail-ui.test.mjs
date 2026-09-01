import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(
  "src/AppPro.jsx",
  "utf8"
);

test(
  "renders master detail internship workspace",
  () => {
    assert.match(
      app,
      /function OpportunityFeed/
    );

    assert.match(
      app,
      /function OpportunityDetail/
    );

    assert.match(
      app,
      /className="pro-opportunity-workspace"/
    );

    assert.match(
      app,
      /selectedJobId/
    );
  }
);

test(
  "removes old opportunity grid component",
  () => {
    assert.doesNotMatch(
      app,
      /function OpportunityCards/
    );
  }
);
