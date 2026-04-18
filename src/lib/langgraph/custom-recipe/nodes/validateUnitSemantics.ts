import { HumanMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";

import {
  CUSTOM_RECIPE_ALLOWED_UNITS,
  describeIngredientUnitRule,
  parseCustomRecipeAmount,
  type CustomRecipeUnitSemanticAudit,
} from "@/lib/custom-recipes/unit-validation";
import { apiLogger } from "@/lib/logger";
import type { CustomRecipeState } from "../state";

const unitSemanticIssueSchema = z.object({
  recipeKind: z.enum(["pantry", "almost_cookable"]),
  ingredientName: z.string().min(1).max(120),
  currentAmount: z.string().min(1).max(80),
  suggestedAmount: z.string().min(1).max(80),
  suggestedUnit: z.enum(CUSTOM_RECIPE_ALLOWED_UNITS),
  reason: z.string().min(1).max(300),
});

const unitSemanticAuditSchema = z.object({
  passed: z.boolean(),
  issues: z.array(unitSemanticIssueSchema).max(20),
});

function shouldIgnoreProduceGramToPieceSuggestion(
  issue: CustomRecipeUnitSemanticAudit["issues"][number],
) {
  if (issue.suggestedUnit !== "ks") {
    return false;
  }

  const currentAmount = parseCustomRecipeAmount(issue.currentAmount);
  if (
    !currentAmount.hasUnit ||
    (currentAmount.normalizedUnit !== "g" && currentAmount.normalizedUnit !== "kg")
  ) {
    return false;
  }

  const rule = describeIngredientUnitRule({
    ingredientName: issue.ingredientName,
  });

  return rule.form === "produce";
}

export function normalizeUnitSemanticAudit(audit: CustomRecipeUnitSemanticAudit) {
  const filteredIssues = audit.issues.filter(
    (issue) => !shouldIgnoreProduceGramToPieceSuggestion(issue),
  );

  return {
    passed: filteredIssues.length === 0,
    issues: filteredIssues,
  } satisfies CustomRecipeUnitSemanticAudit;
}

function buildCandidateLines(
  state: typeof CustomRecipeState.State,
  kind: "pantry" | "almost_cookable",
) {
  const candidate =
    kind === "pantry"
      ? state.parsedAiOutput?.pantryRecipe
      : state.parsedAiOutput?.almostCookableRecipe;

  if (!candidate || candidate.status !== "available") {
    return [];
  }

  return candidate.ingredients.map((ingredient) => {
    const rule = describeIngredientUnitRule({
      ingredientName: ingredient.name,
    });

    return [
      `- Recipe kind: ${kind}`,
      `- Ingredient: ${ingredient.name}`,
      `- Current amount: ${ingredient.amount ?? "missing"}`,
      `- Pantry status: ${ingredient.pantryStatus}`,
      `- Detected form: ${rule.form}`,
      `- Preferred unit: ${rule.preferredUnit}`,
      `- Allowed units: ${rule.allowedUnits.join(", ")}`,
    ].join("\n");
  });
}

export async function validateUnitSemantics(
  state: typeof CustomRecipeState.State,
): Promise<Partial<typeof CustomRecipeState.State>> {
  if (!state.parsedAiOutput) {
    return {
      unitSemanticAudit: null,
      validationErrorType: null,
    };
  }

  const ingredientLines = [
    ...buildCandidateLines(state, "pantry"),
    ...buildCandidateLines(state, "almost_cookable"),
  ];

  if (ingredientLines.length === 0) {
    return {
      unitSemanticAudit: { passed: true, issues: [] },
      validationErrorType: null,
      requestError: null,
    };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return {
      unitSemanticAudit: null,
      requestError: "GOOGLE_AI_API_KEY is not configured",
      retryCount: state.retryCount + 1,
      validationErrorType: "unit_semantic_error",
    };
  }

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite-preview",
    temperature: 0,
    maxOutputTokens: 1200,
    apiKey,
  }).withStructuredOutput(unitSemanticAuditSchema, {
    method: "functionCalling",
    name: "audit_custom_recipe_units",
  });

  const prompt = `You are validating ingredient units for a generated recipe.\n\nRules:\n- Allowed units only: ${CUSTOM_RECIPE_ALLOWED_UNITS.join(", ")}\n- Reject kitchen units like tbsp, tsp, cup.\n- Liquids should prefer ml/l/dl.\n- Pastes, dry goods and powders should prefer g/kg unless the provided allowed units specify otherwise.\n- Countable items should use ks.\n- For produce, explicit grams or kilograms are also acceptable when the quantity is realistic. Do not flag those just because ks could also work.\n- Only return an issue when the current amount/unit is semantically wrong for the ingredient.\n- If everything is fine, return passed=true and issues=[].\n- suggestedAmount must preserve the quantity intent and only fix the unit/amount formatting.\n\nIngredients to review:\n${ingredientLines.join("\n\n")}`;

  try {
    const audit = normalizeUnitSemanticAudit(
      (await model.invoke([new HumanMessage(prompt)])) as CustomRecipeUnitSemanticAudit,
    );

    apiLogger.info("[customRecipe.validateUnitSemantics] semantic audit completed", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        passed: audit.passed,
        issueCount: audit.issues.length,
        issues: audit.issues,
        retryCount: state.retryCount,
      },
    });

    return {
      unitSemanticAudit: audit,
      validationErrorType: audit.passed ? null : "unit_semantic_error",
      requestError: null,
    };
  } catch (error) {
    apiLogger.warn("[customRecipe.validateUnitSemantics] semantic audit failed", {
      metadata: {
        userId: state.userId,
        userProfileId: state.userProfileId,
        retryCount: state.retryCount + 1,
        errorMessage: error instanceof Error ? error.message : "unknown error",
      },
    });

    return {
      unitSemanticAudit: null,
      requestError: error instanceof Error ? error.message : "Unit semantic audit failed",
      retryCount: state.retryCount + 1,
      validationErrorType: "unit_semantic_error",
    };
  }
}