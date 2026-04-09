import type { CustomRecipeAiOutput } from "@/lib/custom-recipes/contracts";
import {
  parseCustomRecipeAmount,
  type CustomRecipeAllowedUnit,
} from "@/lib/custom-recipes/unit-validation";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

function buildExplicitSuggestedAmount(
  suggestedAmount: string,
  suggestedUnit: CustomRecipeAllowedUnit,
) {
  const parsedAmount = parseCustomRecipeAmount(suggestedAmount);

  if (parsedAmount.hasUnit && parsedAmount.normalizedUnit) {
    return suggestedAmount.trim();
  }

  return `${suggestedAmount.trim()} ${suggestedUnit}`.trim();
}

function applyIssueToCandidate(
  candidate:
    | CustomRecipeAiOutput["pantryRecipe"]
    | CustomRecipeAiOutput["almostCookableRecipe"],
  ingredientName: string,
  suggestedAmount: string,
) {
  if (candidate.status !== "available") {
    return false;
  }

  const ingredient = candidate.ingredients.find(
    (item) => item.name.trim().toLowerCase() === ingredientName.trim().toLowerCase(),
  );

  if (!ingredient) {
    return false;
  }

  ingredient.amount = suggestedAmount;
  return true;
}

export async function repairRecipeUnits(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  if (!state.parsedAiOutput || !state.unitSemanticAudit || state.unitSemanticAudit.passed) {
    return {
      requestError: null,
      validationErrorType: null,
    };
  }

  const nextOutput: CustomRecipeAiOutput = JSON.parse(
    JSON.stringify(state.parsedAiOutput),
  ) as CustomRecipeAiOutput;
  let repairedIssues = 0;

  for (const issue of state.unitSemanticAudit.issues) {
    const repairedAmount = buildExplicitSuggestedAmount(
      issue.suggestedAmount,
      issue.suggestedUnit,
    );
    const repaired =
      issue.recipeKind === "pantry"
        ? applyIssueToCandidate(nextOutput.pantryRecipe, issue.ingredientName, repairedAmount)
        : applyIssueToCandidate(
            nextOutput.almostCookableRecipe,
            issue.ingredientName,
            repairedAmount,
          );

    if (!repaired) {
      const requestError = `Unable to repair unit for ingredient ${issue.ingredientName}`;

      apiLogger.warn("[customRecipe.repairRecipeUnits] repair failed", {
        metadata: {
          userId: state.userId,
          userProfileId: state.userProfileId,
          retryCount: state.retryCount + 1,
          issue,
        },
      });

      return {
        requestError,
        retryCount: state.retryCount + 1,
        validationErrorType: "unit_repair_failed",
      };
    }

    repairedIssues += 1;
  }

  apiLogger.info("[customRecipe.repairRecipeUnits] repair applied", {
    metadata: {
      userId: state.userId,
      userProfileId: state.userProfileId,
      repairedIssues,
      retryCount: state.retryCount,
    },
  });

  return {
    parsedAiOutput: null,
    rawAiOutput: JSON.stringify(nextOutput),
    unitSemanticAudit: null,
    requestError: null,
    validationErrorType: null,
  };
}