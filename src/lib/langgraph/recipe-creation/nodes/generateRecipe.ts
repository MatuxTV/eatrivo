import { buildCustomRecipeGraph } from "@/lib/langgraph/custom-recipe";
import type { CustomRecipeState } from "@/lib/langgraph/custom-recipe/state";

import type { RecipeCreationState } from "../state";

export async function generateRecipe(
  state: typeof RecipeCreationState.State,
): Promise<Partial<typeof RecipeCreationState.State>> {
  const graph = buildCustomRecipeGraph();
  const result = await graph.invoke(
    {
      userId: state.userId,
      userProfileId: state.userProfileId,
      locale: state.locale,
      mode: state.includePantry ? "pantry" : "preferences_only",
      fallbackSuggestionLimit: 1,
      requestedServings: state.servings,
      requestedMealType: state.mealType,
      requestedMealPrep: state.mealPrep,
      respectUserProfile: state.includeProfile,
      userRecipeBrief: state.brief,
    },
    { recursionLimit: 40 },
  ) as typeof CustomRecipeState.State;

  const primaryRecipe = result.finalResult?.pantryRecipe;
  const secondaryRecipe = result.finalResult?.almostCookableRecipe;
  const selectedRecipe =
    primaryRecipe?.status === "available"
      ? primaryRecipe
      : secondaryRecipe?.status === "available"
        ? secondaryRecipe
        : null;

  if (!selectedRecipe) {
    return {
      generatedRecipe: null,
      fatalError: "Recipe creation could not produce an available recipe.",
    };
  }

  return {
    generatedRecipe: selectedRecipe,
    fatalError: null,
  };
}