import {
  mapMatchedRecipeToSuggestion,
  type CustomRecipeSuggestion,
} from "@/lib/custom-recipes/contracts";
import { apiLogger } from "@/lib/logger";
import { getRecipeMatchesForUserProfile } from "@/lib/recipe-matches";
import type { CustomRecipeState } from "../state";

export async function fallbackDatabaseRecommendations(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  try {
    const matches = await getRecipeMatchesForUserProfile(state.userProfileId, {
      locale: state.locale,
      maxMissingIngredients: 3,
      cookableLimit: state.fallbackSuggestionLimit,
      almostCookableLimit: state.fallbackSuggestionLimit,
    });

    const suggestions: CustomRecipeSuggestion[] = [
      ...matches.cookable.map((recipe) =>
        mapMatchedRecipeToSuggestion(recipe, "pantry"),
      ),
      ...matches.almostCookable.map((recipe) =>
        mapMatchedRecipeToSuggestion(recipe, "almost_cookable"),
      ),
    ].slice(0, state.fallbackSuggestionLimit);

    return {
      fallbackSuggestions: suggestions,
      pantryIngredientKeyCount: matches.pantryIngredientKeyCount,
    };
  } catch (error) {
    apiLogger.error(
      "[customRecipe.fallbackDatabaseRecommendations] fallback query failed",
      error,
      {
        metadata: {
          userId: state.userId,
          userProfileId: state.userProfileId,
        },
      },
    );

    return {
      fallbackSuggestions: [],
    };
  }
}
