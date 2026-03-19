import {
  customRecipeAiOutputSchema,
  type CustomRecipeAiOutput,
} from "@/lib/custom-recipes/contracts";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

function buildPantryNameSet(state: typeof CustomRecipeState.State): Set<string> {
  return new Set(
    state.pantryRows
      .map((item) => item.pantryName.trim().toLowerCase())
      .filter(Boolean),
  );
}

function validatePantryReferences(
  output: CustomRecipeAiOutput,
  state: typeof CustomRecipeState.State,
): string | null {
  const pantryNames = buildPantryNameSet(state);

  const candidates = [
    output.pantryRecipe.status === "available" ? output.pantryRecipe : null,
    output.almostCookableRecipe.status === "available"
      ? output.almostCookableRecipe
      : null,
  ].filter(
    (
      candidate,
    ): candidate is Extract<
      CustomRecipeAiOutput["pantryRecipe"],
      { status: "available" }
    > => candidate !== null,
  );

  for (const candidate of candidates) {
    for (const ingredient of candidate.ingredients) {
      if (ingredient.pantryStatus !== "pantry") {
        continue;
      }

      const matchName = ingredient.pantryMatchName?.trim().toLowerCase();
      if (!matchName || !pantryNames.has(matchName)) {
        return `Invalid pantryMatchName for ingredient "${ingredient.name}"`;
      }
    }
  }

  return null;
}

export async function validateRecipeJson(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  if (!state.rawAiOutput) {
    return {
      parsedAiOutput: null,
      requestError: "Missing AI output",
    };
  }

  try {
    const parsed = JSON.parse(state.rawAiOutput) as unknown;
    const validated = customRecipeAiOutputSchema.parse(parsed);
    const pantryReferenceError = validatePantryReferences(validated, state);

    if (pantryReferenceError) {
      return {
        parsedAiOutput: null,
        rawAiOutput: null,
        requestError: pantryReferenceError,
        retryCount: state.retryCount + 1,
      };
    }

    return {
      parsedAiOutput: validated,
      requestError: null,
    };
  } catch (error) {
    apiLogger.warn("[customRecipe.validateRecipeJson] validation failed", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        retryCount: state.retryCount + 1,
      },
    });

    return {
      parsedAiOutput: null,
      rawAiOutput: null,
      requestError:
        error instanceof Error ? error.message : "Recipe JSON validation failed",
      retryCount: state.retryCount + 1,
    };
  }
}
