import test from "node:test";
import assert from "node:assert/strict";

import { generateImageWithGemini } from "./provider-core";

const PNG_BASE64 = Buffer.from([137, 80, 78, 71]).toString("base64");

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const imageBody = {
  candidates: [
    { content: { parts: [{ text: "here" }, { inlineData: { mimeType: "image/png", data: PNG_BASE64 } }] } },
  ],
};

test("returns the first inline image", async () => {
  let calledUrl = "";
  const result = await generateImageWithGemini("prompt", "gemini-2.5-flash-image", {
    apiKey: "key",
    fetchImpl: async (url) => {
      calledUrl = String(url);
      return jsonResponse(200, imageBody);
    },
  });

  assert.equal(result.mimeType, "image/png");
  assert.deepEqual([...result.bytes], [137, 80, 78, 71]);
  assert.match(calledUrl, /gemini-2\.5-flash-image:generateContent$/);
});

test("throws without an API key", async () => {
  await assert.rejects(
    generateImageWithGemini("prompt", "m", { apiKey: undefined }),
    /GOOGLE_AI_API_KEY/,
  );
});

test("throws with the status on a non-retryable error", async () => {
  await assert.rejects(
    generateImageWithGemini("prompt", "m", {
      apiKey: "key",
      fetchImpl: async () => jsonResponse(400, { error: "bad prompt" }),
    }),
    /\(400\)/,
  );
});

test("retries once on 503", async () => {
  let calls = 0;
  const result = await generateImageWithGemini("prompt", "m", {
    apiKey: "key",
    sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? jsonResponse(503, {}) : jsonResponse(200, imageBody);
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.mimeType, "image/png");
});

test("throws when no image part is returned", async () => {
  await assert.rejects(
    generateImageWithGemini("prompt", "m", {
      apiKey: "key",
      fetchImpl: async () => jsonResponse(200, { candidates: [{ content: { parts: [{ text: "no" }] } }] }),
    }),
    /no image/,
  );
});
