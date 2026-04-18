import {
  evaluateCustomRecipeDiversity,
  type CustomRecipeDiversityCheck,
} from "@/lib/custom-recipes/diversity";
import { mapAiCandidateToGeneratedRecipe } from "@/lib/custom-recipes/contracts";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

function buildRejectedCandidateSummary(check: CustomRecipeDiversityCheck) {
  return {
    candidateRecipeName: check.candidateRecipeName,
    previousRecipeName: check.previousRecipeName,
    similarityScore: Number(check.similarityScore.toFixed(3)),
    diversityScore: Number(check.diversityScore.toFixed(3)),
    passed: check.passed,
    componentSimilarity: Object.fromEntries(
      Object.entries(check.componentSimilarity).map(([key, value]) => [
        key,
        Number(value.toFixed(3)),
      ]),
    ),
  };
}

export async function validateRecipeDiversity(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  if (!state.previousGeneratedRecipe || !state.parsedAiOutput) {
    return {
      diversityCheck: null,
      requestError: null,
    };
  }

  const rejectedChecks: CustomRecipeDiversityCheck[] = [];
  const passedChecks: CustomRecipeDiversityCheck[] = [];

  const pantryRecipe =
    state.parsedAiOutput.pantryRecipe.status === "available"
      ? mapAiCandidateToGeneratedRecipe(state.parsedAiOutput.pantryRecipe, "pantry", {
          pantryRows: state.pantryRows,
          locale: state.locale,
        })
      : null;
  const almostCookableRecipe =
    state.parsedAiOutput.almostCookableRecipe.status === "available"
      ? mapAiCandidateToGeneratedRecipe(
          state.parsedAiOutput.almostCookableRecipe,
          "almost_cookable",
          {
            pantryRows: state.pantryRows,
            locale: state.locale,
          },
        )
      : null;

  const nextParsedAiOutput = {
    pantryRecipe: state.parsedAiOutput.pantryRecipe,
    almostCookableRecipe: state.parsedAiOutput.almostCookableRecipe,
  };

  if (pantryRecipe) {
    const check = evaluateCustomRecipeDiversity(
      state.previousGeneratedRecipe,
      pantryRecipe,
    );
    if (check.passed) {
      passedChecks.push(check);
    } else {
      rejectedChecks.push(check);
      nextParsedAiOutput.pantryRecipe = {
        status: "unavailable",
        reason: "AI_UNABLE_TO_COMPOSE",
      };
    }
  }

  if (almostCookableRecipe) {
    const check = evaluateCustomRecipeDiversity(
      state.previousGeneratedRecipe,
      almostCookableRecipe,
    );
    if (check.passed) {
      passedChecks.push(check);
    } else {
      rejectedChecks.push(check);
      nextParsedAiOutput.almostCookableRecipe = {
        status: "unavailable",
        reason: "AI_UNABLE_TO_COMPOSE",
      };
    }
  }

  const representativeCheck =
    passedChecks[0] ?? rejectedChecks.sort((left, right) => left.similarityScore - right.similarityScore)[0] ?? null;

  apiLogger.info("[customRecipe.validateRecipeDiversity] diversity evaluated", {
    metadata: {
      userId: state.userId,
      userProfileId: state.userProfileId,
      previousGeneratedRecipeJobId: state.previousGeneratedRecipeJobId,
      previousRecipeName: state.previousGeneratedRecipe.name,
      passedCount: passedChecks.length,
      rejectedCount: rejectedChecks.length,
      passedChecks: passedChecks.map(buildRejectedCandidateSummary),
      rejectedChecks: rejectedChecks.map(buildRejectedCandidateSummary),
      retryCount: state.retryCount,
    },
  });

  if (rejectedChecks.length > 0 && passedChecks.length === 0) {
    const retryCount = state.retryCount + 1;
    const requestError = "Generated recipe was too similar to the previous result";

    apiLogger.warn(
      "[customRecipe.validateRecipeDiversity] diversity threshold failed",
      {
        metadata: {
          userId: state.userId,
          userProfileId: state.userProfileId,
          previousGeneratedRecipeJobId: state.previousGeneratedRecipeJobId,
          retryCount,
          rejectedChecks: rejectedChecks.map(buildRejectedCandidateSummary),
        },
      },
    );

    return {
      parsedAiOutput: nextParsedAiOutput,
      rawAiOutput: JSON.stringify(nextParsedAiOutput),
      requestError,
      retryCount,
      diversityCheck: representativeCheck,
    };
  }

  return {
    parsedAiOutput: nextParsedAiOutput,
    rawAiOutput: JSON.stringify(nextParsedAiOutput),
    requestError: null,
    diversityCheck: representativeCheck,
  };
}