import test from "node:test";
import assert from "node:assert/strict";

import {
  htmlToOfferText,
} from "../src/offerDescription/htmlToText.mjs";


test("preserves headings and paragraph boundaries", () => {
  const html = `
    <h2>About</h2>
    <p>We build computer vision systems.</p>
    <h2>Role & mission</h2>
    <p>Develop image processing pipelines.</p>
  `;

  const result = htmlToOfferText(html);

  assert.equal(
    result,
    [
      "About",
      "We build computer vision systems.",
      "Role & mission",
      "Develop image processing pipelines.",
    ].join("\n")
  );
});


test("converts list items into separate lines", () => {
  const html = `
    <h3>Must-have skills</h3>
    <ul>
      <li>Python</li>
      <li>PyTorch</li>
      <li>Computer Vision</li>
    </ul>
  `;

  const result = htmlToOfferText(html);

  assert.equal(
    result,
    [
      "Must-have skills",
      "Python",
      "PyTorch",
      "Computer Vision",
    ].join("\n")
  );
});


test("removes script style and noscript content", () => {
  const html = `
    <style>.hidden { display: none; }</style>
    <script>window.secret = "do not keep";</script>
    <noscript>Enable JavaScript</noscript>
    <p>Real internship description.</p>
  `;

  const result = htmlToOfferText(html);

  assert.equal(
    result,
    "Real internship description."
  );

  assert.doesNotMatch(result, /window\.secret/);
  assert.doesNotMatch(result, /display:\s*none/);
  assert.doesNotMatch(result, /Enable JavaScript/);
});


test("decodes common HTML entities", () => {
  const html = `
    <p>R&amp;D &mdash; AI &amp; Computer Vision</p>
    <p>Python &gt; basic scripting</p>
  `;

  const result = htmlToOfferText(html);

  assert.equal(
    result,
    [
      "R&D — AI & Computer Vision",
      "Python > basic scripting",
    ].join("\n")
  );
});


test("collapses excessive whitespace while preserving useful lines", () => {
  const html = `
    <h2>Expectations</h2>

    <p>
      Strong   Python
      skills
    </p>

    <br><br>

    <p>Good communication.</p>
  `;

  const result = htmlToOfferText(html);

  assert.equal(
    result,
    [
      "Expectations",
      "Strong Python skills",
      "Good communication.",
    ].join("\n")
  );
});


test("returns empty string for meaningless input", () => {
  assert.equal(htmlToOfferText(""), "");
  assert.equal(htmlToOfferText("   "), "");
  assert.equal(
    htmlToOfferText(
      "<script>alert('x')</script><style>body{}</style>"
    ),
    ""
  );
});
