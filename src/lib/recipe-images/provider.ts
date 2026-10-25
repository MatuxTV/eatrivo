import "server-only";

import { getRecipeImageModel } from "./config";
import { generateImageWithGemini, type GeneratedImage } from "./provider-core";

export type { GeneratedImage };

export function generateRecipeImage(
  prompt: string,
  options?: { model?: string; signal?: AbortSignal },
): Promise<GeneratedImage> {
  return generateImageWithGemini(
    prompt,
    options?.model ?? getRecipeImageModel(),
    { apiKey: process.env.GOOGLE_AI_API_KEY },
    options?.signal,
  );
}
