import {
  buildMessageDescriptor,
  buildUnavailableRecipe,
  customRecipeResultSchema,
  mapAiCandidateToGeneratedRecipe,
} from "@/lib/custom-recipes/contracts";
import type { CustomRecipeState } from "../state";

function buildPantryUnavailable(state: typeof CustomRecipeState.State) {
  const unavailableReason =
    state.parsedAiOutput?.pantryRecipe.status === "unavailable"
      ? state.parsedAiOutput.pantryRecipe.reason
      : state.pantryItemCount === 0
        ? "PANTRY_EMPTY"
        : "INSUFFICIENT_PANTRY";

  if (state.pantryItemCount === 0) {
    return buildUnavailableRecipe(
      unavailableReason,
      buildMessageDescriptor("basic.customRecipe.recipeUnavailable.pantryEmpty"),
    );
  }

  return buildUnavailableRecipe(
    unavailableReason,
    buildMessageDescriptor("basic.customRecipe.recipeUnavailable.noPantryRecipe"),
  );
}

function buildAlmostUnavailableFromState(state: typeof CustomRecipeState.State) {
  const unavailableReason =
    state.parsedAiOutput?.almostCookableRecipe.status === "unavailable"
      ? state.parsedAiOutput.almostCookableRecipe.reason
      : "AI_UNABLE_TO_COMPOSE";

  return buildUnavailableRecipe(
    unavailableReason,
    buildMessageDescriptor("basic.customRecipe.recipeUnavailable.noAlmostCookable"),
  );
}

export async function finalizeResult(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  const pantryRecipe =
    state.parsedAiOutput?.pantryRecipe.status === "available"
      ? mapAiCandidateToGeneratedRecipe(state.parsedAiOutput.pantryRecipe, "pantry")
      : buildPantryUnavailable(state);

  const almostCookableRecipe =
    state.parsedAiOutput?.almostCookableRecipe.status === "available"
      ? mapAiCandidateToGeneratedRecipe(
          state.parsedAiOutput.almostCookableRecipe,
          "almost_cookable",
        )
      : buildAlmostUnavailableFromState(state);

  const hasPrimaryRecipe =
    pantryRecipe.status === "available" ||
    almostCookableRecipe.status === "available";

  const fallbackUsed = !hasPrimaryRecipe;

  const userMessage =
    pantryRecipe.status === "available"
      ? buildMessageDescriptor("basic.customRecipe.message.pantryRecipeReady", {
          recipeName: pantryRecipe.name,
        })
      : almostCookableRecipe.status === "available"
        ? buildMessageDescriptor("basic.customRecipe.message.almostCookableReady", {
            recipeName: almostCookableRecipe.name,
            missingCount: almostCookableRecipe.missingIngredientNames.length,
          })
        : state.fallbackSuggestions.length > 0
          ? buildMessageDescriptor("basic.customRecipe.message.fallbackSuggestionsReady", {
              suggestionCount: state.fallbackSuggestions.length,
            })
          : state.pantryItemCount === 0
            ? buildMessageDescriptor("basic.customRecipe.message.emptyPantry")
            : buildMessageDescriptor("basic.customRecipe.message.noRecipeAvailable");

  const finalResult = customRecipeResultSchema.parse({
    pantryRecipe,
    almostCookableRecipe,
    fallbackDatabaseSuggestions: state.fallbackSuggestions,
    userMessage,
    meta: {
      locale: state.locale,
      pantryItemCount: state.pantryItemCount,
      pantryIngredientKeyCount: state.pantryIngredientKeyCount,
      fallbackUsed,
      retryCount: state.retryCount,
    },
  });

  return {
    finalResult,
  };
}
