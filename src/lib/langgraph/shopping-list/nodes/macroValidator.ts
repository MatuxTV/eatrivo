import type { ShoppingListState } from "../state";
import { apiLogger } from "@/lib/logger";

/**
 * Validates estimated macros from AI output against computed macro targets.
 * Acceptable range: 90% – 110% of target.
 * If invalid and retryCount < 3, triggers re-generation via feedback loop.
 */
export async function macroValidator(
  state: typeof ShoppingListState.State,
): Promise<Partial<typeof ShoppingListState.State>> {
  const { aiOutput, macroTargets, retryCount } = state;

  apiLogger.info("[macroValidator] start", { metadata: { userProfileId: state.userProfileId, retryCount, hasAiOutput: !!aiOutput } });

  // Ak sme vyčerpali retry a stále nemáme aiOutput, ukonči s jasnou chybou
  if (retryCount >= 3 && !aiOutput) {
    return {
      error:
        "Generovanie zlyhalo: makrá nezodpovedajú cieľom ani po 3 pokusoch.",
    };
  }

  // Ak nemáme AI output alebo macro targets, prepustíme
  if (!aiOutput || !macroTargets) {
    return {};
  }

  const { estimatedMacros } = aiOutput;
  const issues: string[] = [];

  // Kontrola každého makra (90%-110% range)
  const checks = [
    {
      name: "Kalórie",
      actual: estimatedMacros.totalCalories,
      target: macroTargets.dailyCalories,
      unit: "kcal",
    },
    {
      name: "Proteín",
      actual: estimatedMacros.protein,
      target: macroTargets.protein,
      unit: "g",
    },
    {
      name: "Tuky",
      actual: estimatedMacros.fat,
      target: macroTargets.fat,
      unit: "g",
    },
    {
      name: "Sacharidy",
      actual: estimatedMacros.carbs,
      target: macroTargets.carbs,
      unit: "g",
    },
  ];

  for (const check of checks) {
    const lower = check.target * 0.9;
    const upper = check.target * 1.1;
    if (check.actual < lower || check.actual > upper) {
      issues.push(
        `${check.name}: dostupné ${check.actual}${check.unit}, cieľ ${check.target}${check.unit} (±10%)`,
      );
    }
  }

  // Ak všetko OK alebo retryCount >= 3: prepustiť
  if (issues.length === 0 || retryCount >= 3) {
    if (issues.length === 0) {
      apiLogger.info("[macroValidator] PASS — macros within range", { metadata: { userProfileId: state.userProfileId } });
    } else {
      apiLogger.warn("[macroValidator] max retries reached, accepting output despite issues", {
        metadata: { userProfileId: state.userProfileId, issues },
      });
    }
    return {};
  }

  // Ak invalid a retryCount < 3: retry
  const feedbackContext = `Makrá mimo rozsahu:\n${issues.join("\n")}`;

  apiLogger.warn("[macroValidator] RETRY triggered", {
    metadata: { userProfileId: state.userProfileId, retryCount: retryCount + 1, issues },
  });

  return {
    retryCount: retryCount + 1,
    feedbackContext,
    aiOutput: null,
  };
}
