import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchOfferDescription,
} from "../src/services/offerDescriptionApi.js";

test("requests server-side offer description acquisition", async () => {
  let requestedUrl = "";

  const fetchImpl = async (url) => {
    requestedUrl = String(url);

    return {
      ok: true,
      async json() {
        return {
          success: true,
          description: "Real official offer description",
          source: "https://company.example/jobs/123",
          fetchedAt: "2026-09-04T12:00:00Z",
        };
      },
    };
  };

  const result = await fetchOfferDescription({
    endpoint: "https://script.google.com/macros/s/example/exec",
    offerUrl: "https://company.example/jobs/123",
    fetchImpl,
  });

  assert.match(requestedUrl, /action=fetchOfferDescription/);
  assert.match(
    requestedUrl,
    /url=https%3A%2F%2Fcompany\.example%2Fjobs%2F123/
  );

  assert.equal(result.success, true);
  assert.equal(
    result.description,
    "Real official offer description"
  );
  assert.equal(
    result.source,
    "https://company.example/jobs/123"
  );
});

test("returns controlled failure for missing offer URL", async () => {
  const result = await fetchOfferDescription({
    endpoint: "https://script.google.com/macros/s/example/exec",
    offerUrl: "",
    fetchImpl: async () => {
      throw new Error("fetch must not run");
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.description, "");
  assert.match(result.error, /url/i);
});

test("returns controlled failure for missing endpoint", async () => {
  const result = await fetchOfferDescription({
    endpoint: "",
    offerUrl: "https://company.example/jobs/123",
    fetchImpl: async () => {
      throw new Error("fetch must not run");
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.description, "");
  assert.match(result.error, /endpoint/i);
});

test("preserves server-side controlled failure metadata", async () => {
  const fetchImpl = async () => ({
    ok: true,
    async json() {
      return {
        success: false,
        description: "",
        source: "https://company.example/jobs/404",
        fetchedAt: "2026-09-04T12:00:00Z",
        error: "HTTP 404",
      };
    },
  });

  const result = await fetchOfferDescription({
    endpoint: "https://script.google.com/macros/s/example/exec",
    offerUrl: "https://company.example/jobs/404",
    fetchImpl,
  });

  assert.equal(result.success, false);
  assert.equal(result.description, "");
  assert.equal(result.error, "HTTP 404");
  assert.equal(
    result.source,
    "https://company.example/jobs/404"
  );
});

test("network failure becomes controlled acquisition failure", async () => {
  const result = await fetchOfferDescription({
    endpoint: "https://script.google.com/macros/s/example/exec",
    offerUrl: "https://company.example/jobs/123",
    fetchImpl: async () => {
      throw new Error("Network unavailable");
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.description, "");
  assert.match(result.error, /network unavailable/i);
});

test("invalid server payload never fabricates description", async () => {
  const result = await fetchOfferDescription({
    endpoint: "https://script.google.com/macros/s/example/exec",
    offerUrl: "https://company.example/jobs/123",
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return null;
      },
    }),
  });

  assert.equal(result.success, false);
  assert.equal(result.description, "");
});
