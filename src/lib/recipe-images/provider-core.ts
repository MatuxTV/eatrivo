// Gemini image generation over plain REST. Kept free of `server-only` and env
// access so it can be unit-tested with a fake fetch; `provider.ts` wires the key.

import { z } from "zod";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 60_000;
const RETRY_DELAY_MS = 2_000;

export interface GeneratedImage {
  bytes: Uint8Array;
  mimeType: string;
  model: string;
}

export interface GenerateImageDeps {
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const responseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z.object({
                  inlineData: z
                    .object({ mimeType: z.string(), data: z.string() })
                    .optional(),
                }),
              )
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

export async function generateImageWithGemini(
  prompt: string,
  model: string,
  deps: GenerateImageDeps,
  signal?: AbortSignal,
): Promise<GeneratedImage> {
  if (!deps.apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured.");
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleep =
    deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  const request = () =>
    fetchImpl(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": deps.apiKey!,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1" },
        },
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
        : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

  let response = await request();
  if (!response.ok && isRetryableStatus(response.status)) {
    await sleep(RETRY_DELAY_MS);
    response = await request();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Image generation failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const parsed = responseSchema.safeParse(await response.json().catch(() => null));
  const inlineData = parsed.success
    ? parsed.data.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .find((part) => part.inlineData)?.inlineData
    : undefined;

  if (!inlineData) {
    throw new Error("Image generation returned no image.");
  }

  return {
    bytes: Uint8Array.from(Buffer.from(inlineData.data, "base64")),
    mimeType: inlineData.mimeType,
    model,
  };
}
