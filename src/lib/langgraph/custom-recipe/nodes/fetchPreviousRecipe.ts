import { getLatestGeneratedCustomRecipe } from "@/lib/custom-recipes/diversity";
import { CustomRecipeGenerationStore } from "@/lib/custom-recipes/store";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

export async function fetchPreviousRecipe(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  try {
    const latestResult = await CustomRecipeGenerationStore.getResult(state.userId);
    const previousGeneratedRecipe = getLatestGeneratedCustomRecipe(
      latestResult?.result,
    );

    return {
      previousGeneratedRecipe: previousGeneratedRecipe ?? null,
      previousGeneratedRecipeJobId: previousGeneratedRecipe
        ? latestResult?.jobId ?? null
        : null,
    };
  } catch (error) {
    apiLogger.warn("[customRecipe.fetchPreviousRecipe] failed", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        errorMessage: error instanceof Error ? error.message : "unknown error",
      },
    });

    return {
      previousGeneratedRecipe: null,
      previousGeneratedRecipeJobId: null,
    };
  }
}