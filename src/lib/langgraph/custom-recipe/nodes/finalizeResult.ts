import {
  buildMessageDescriptor,
  buildUnavailableRecipe,
  customRecipeResultSchema,
  mapAiCandidateToGeneratedRecipe,
} from "@/lib/custom-recipes/contracts";
import { scoreCustomRecipe } from "@/lib/custom-recipes/quality";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

function applyQualityGate(
  state: typeof CustomRecipeState.State,
  recipe: ReturnType<typeof mapAiCandidateToGeneratedRecipe>,
  unavailableMessageKey: string,
) {
  const quality = scoreCustomRecipe(recipe, {
    pantryItemCount: state.pantryItemCount,
    mode: state.mode,
    cookingTimePreference: state.userInfo?.cooking_time_pref ?? null,
    goal: state.userInfo?.goal ?? null,
  });

  apiLogger.info("[customRecipe.finalizeResult] recipe quality scored", {
    metadata: {
      userId: state.userId,
      userProfileId: state.userProfileId,
      recipeKind: recipe.kind,
      recipeName: recipe.name,
      score: quality.score,
      accepted: quality.accepted,
      reasons: quality.reasons,
    },
  });

  if (quality.accepted) {
    return recipe;
  }

  return buildUnavailableRecipe(
    "AI_UNABLE_TO_COMPOSE",
    buildMessageDescriptor(unavailableMessageKey),
  );
}

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
  if (state.mode === "preferences_only") {
    const primaryRecipe =
      state.parsedAiOutput?.pantryRecipe.status === "available"
        ? applyQualityGate(
            state,
            mapAiCandidateToGeneratedRecipe(
              state.parsedAiOutput.pantryRecipe,
              "preferences_only",
              {
                pantryRows: [],
                locale: state.locale,
              },
            ),
            "basic.customRecipe.recipeUnavailable.noPreferencesRecipe",
          )
        : buildUnavailableRecipe(
            state.parsedAiOutput?.pantryRecipe.status === "unavailable"
              ? state.parsedAiOutput.pantryRecipe.reason
              : "AI_UNABLE_TO_COMPOSE",
            buildMessageDescriptor(
              "basic.customRecipe.recipeUnavailable.noPreferencesRecipe",
            ),
          );

    const secondaryRecipe = buildUnavailableRecipe(
      "AI_UNABLE_TO_COMPOSE",
      buildMessageDescriptor("basic.customRecipe.recipeUnavailable.noAlmostCookable"),
    );

    const fallbackUsed = primaryRecipe.status !== "available";
    const userMessage =
      primaryRecipe.status === "available"
        ? buildMessageDescriptor(
            "basic.customRecipe.message.preferencesOnlyReady",
            {
              recipeName: primaryRecipe.name,
            },
          )
        : state.fallbackSuggestions.length > 0
          ? buildMessageDescriptor(
              "basic.customRecipe.message.preferencesFallbackReady",
              {
                suggestionCount: state.fallbackSuggestions.length,
              },
            )
          : buildMessageDescriptor(
              "basic.customRecipe.message.noPreferencesRecipeAvailable",
            );

    return {
      finalResult: customRecipeResultSchema.parse({
        pantryRecipe: primaryRecipe,
        almostCookableRecipe: secondaryRecipe,
        fallbackDatabaseSuggestions: state.fallbackSuggestions,
        userMessage,
        meta: {
          locale: state.locale,
          mode: state.mode,
          pantryItemCount: 0,
          pantryIngredientKeyCount: 0,
          fallbackUsed,
          retryCount: state.retryCount,
        },
      }),
    };
  }

  const pantryRecipe =
    state.parsedAiOutput?.pantryRecipe.status === "available"
      ? applyQualityGate(
          state,
          mapAiCandidateToGeneratedRecipe(state.parsedAiOutput.pantryRecipe, "pantry", {
            pantryRows: state.pantryRows,
            locale: state.locale,
          }),
          "basic.customRecipe.recipeUnavailable.noPantryRecipe",
        )
      : buildPantryUnavailable(state);

  const almostCookableRecipe =
    state.parsedAiOutput?.almostCookableRecipe.status === "available"
      ? applyQualityGate(
          state,
          mapAiCandidateToGeneratedRecipe(
            state.parsedAiOutput.almostCookableRecipe,
            "almost_cookable",
            {
              pantryRows: state.pantryRows,
              locale: state.locale,
            },
          ),
          "basic.customRecipe.recipeUnavailable.noAlmostCookable",
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
      mode: state.mode,
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
