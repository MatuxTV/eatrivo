import {
  customRecipeAiOutputSchema,
  type CustomRecipeAiOutput,
} from "@/lib/custom-recipes/contracts";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";
import { ZodError } from "zod";

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
    // Log input characteristics before parsing
    const trimmed = state.rawAiOutput.trim();
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;

    apiLogger.info("[customRecipe.validateRecipeJson] validating JSON", {
      metadata: {
        userId: state.userId,
        length: trimmed.length,
        braceBalance: openBraces === closeBraces,
        bracketBalance: openBrackets === closeBrackets,
        openBraces,
        closeBraces,
        openBrackets,
        closeBrackets,
        retryCount: state.retryCount,
      },
    });

    const parsed = JSON.parse(state.rawAiOutput) as unknown;
    const validated = customRecipeAiOutputSchema.parse(parsed);
    const pantryReferenceError = validatePantryReferences(validated, state);

    if (pantryReferenceError) {
      apiLogger.warn(
        "[customRecipe.validateRecipeJson] pantry reference validation failed",
        {
          metadata: {
            userId: state.userId,
            userProfileId: state.userProfileId,
            retryCount: state.retryCount + 1,
            pantryReferenceError,
            pantryItemCount: state.pantryRows.length,
          },
        },
      );

      return {
        parsedAiOutput: null,
        rawAiOutput: null,
        requestError: pantryReferenceError,
        retryCount: state.retryCount + 1,
      };
    }

    // Log successful validation
    apiLogger.info("[customRecipe.validateRecipeJson] validation successful", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        jsonLength: state.rawAiOutput.length,
        pantryRecipeStatus: validated.pantryRecipe.status,
        almostCookableStatus: validated.almostCookableRecipe.status,
        retryCount: state.retryCount,
      },
    });

    return {
      parsedAiOutput: validated,
      requestError: null,
    };
  } catch (error) {
    // Enhanced error logging for debugging
    const errorDetails: Record<string, unknown> = {
      userId: state.userId,
      userProfileId: state.userProfileId,
      retryCount: state.retryCount + 1,
    };

    // Extract detailed error information
    if (error instanceof ZodError) {
      errorDetails.validationType = "zod_schema";
      errorDetails.zodErrors = error.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
        code: e.code,
      }));
      errorDetails.firstError = error.issues[0]?.message;
    } else if (error instanceof SyntaxError) {
      errorDetails.validationType = "json_parse";
      errorDetails.parseError = error.message;
      
      // Extract position info from syntax error
      const positionMatch = error.message.match(/position (\\d+)/);
      if (positionMatch) {
        const position = parseInt(positionMatch[1], 10);
        errorDetails.errorPosition = position;
        
        // Show context around error position
        if (state.rawAiOutput) {
          const start = Math.max(0, position - 50);
          const end = Math.min(state.rawAiOutput.length, position + 50);
          errorDetails.errorContext = state.rawAiOutput.slice(start, end);
        }
      }
    } else if (error instanceof Error) {
      errorDetails.validationType = "other";
      errorDetails.errorMessage = error.message;
    }

    // Log a safe excerpt of raw AI output (truncated to avoid log overflow)
    if (state.rawAiOutput) {
      const maxLength = 500;
      errorDetails.rawAiOutputExcerpt =
        state.rawAiOutput.length > maxLength
          ? state.rawAiOutput.slice(0, maxLength) + "..."
          : state.rawAiOutput;
      errorDetails.rawAiOutputLength = state.rawAiOutput.length;
    }

    apiLogger.warn("[customRecipe.validateRecipeJson] validation failed", {
      metadata: errorDetails,
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
