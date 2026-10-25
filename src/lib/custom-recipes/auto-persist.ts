import "server-only";

import { after } from "next/server";

import { customRecipeGeneratedRecipeSchema } from "@/lib/custom-recipes/contracts";
import { persistAcceptedCustomRecipe } from "@/lib/custom-recipes/persistence";
import { apiLogger } from "@/lib/logger";
import { ensureRecipeImage } from "@/lib/recipe-images/service";

interface PersistGeneratedRecipesInput {
  userId: string;
  locale: "en" | "sk";
  jobId: string;
  /** Raw candidates from the final result (pantry + almost-cookable). */
  candidates: unknown[];
}

async function persistAll({ userId, locale, jobId, candidates }: PersistGeneratedRecipesInput) {
  for (const candidate of candidates) {
    // The same shape the client posts to /api/recipes/custom/accept.
    const parsed = customRecipeGeneratedRecipeSchema.safeParse(candidate);
    if (!parsed.success) {
      continue;
    }

    try {
      const persisted = await persistAcceptedCustomRecipe({
        userId,
        locale,
        recipe: parsed.data,
        sourceJobId: jobId,
      });
      await ensureRecipeImage(persisted.id);
    } catch (error) {
      apiLogger.error("[customRecipe.autoPersist] failed", error, {
        metadata: { userId, jobId, recipeName: parsed.data.name },
      });
    }
  }
}

/**
 * Every generated recipe becomes an official recipe with a cover photo. Runs
 * after the response so the user never waits for persistence or the image.
 */
export function persistGeneratedRecipesInBackground(input: PersistGeneratedRecipesInput) {
  const task = () => persistAll(input);

  try {
    after(task);
  } catch {
    // Outside a request scope (e.g. scripts): run without blocking the caller.
    void task();
  }
}
