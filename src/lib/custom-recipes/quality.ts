import type { CustomRecipeGeneratedRecipe } from "@/lib/custom-recipes/contracts";

export interface CustomRecipeQualityContext {
  pantryItemCount: number;
  cookingTimePreference?: string | null;
  goal?: string | null;
}

export interface CustomRecipeQualityResult {
  score: number;
  accepted: boolean;
  reasons: string[];
}

function scoreTimePreference(
  totalTimeMin: number,
  cookingTimePreference?: string | null,
): number {
  switch (cookingTimePreference) {
    case "quick":
      if (totalTimeMin <= 25) return 15;
      if (totalTimeMin <= 40) return 8;
      return 0;
    case "normal":
      if (totalTimeMin <= 45) return 12;
      if (totalTimeMin <= 65) return 6;
      return 2;
    case "slow":
      return totalTimeMin <= 90 ? 8 : 4;
    default:
      return totalTimeMin <= 50 ? 8 : 4;
  }
}

function scoreGoalFit(
  recipe: CustomRecipeGeneratedRecipe,
  goal?: string | null,
): number {
  switch (goal) {
    case "gain_muscle":
      if (recipe.proteinG >= 30) return 12;
      if (recipe.proteinG >= 22) return 8;
      return 2;
    case "lose_weight":
      if (recipe.calories <= 650 && recipe.proteinG >= 20) return 10;
      if (recipe.calories <= 850) return 5;
      return 1;
    case "maintain_weight":
      if (recipe.calories >= 350 && recipe.calories <= 900) return 8;
      return 4;
    default:
      return 4;
  }
}

export function scoreCustomRecipe(
  recipe: CustomRecipeGeneratedRecipe,
  context: CustomRecipeQualityContext,
): CustomRecipeQualityResult {
  let score = 0;
  const reasons: string[] = [];

  const ingredientCount = recipe.ingredientItems.length;
  if (ingredientCount >= 3 && ingredientCount <= 12) {
    score += 18;
  } else {
    score += 6;
    reasons.push("ingredient_count_out_of_range");
  }

  const instructionCount = recipe.instructions.length;
  if (instructionCount >= 2 && instructionCount <= 8) {
    score += 14;
  } else {
    score += 4;
    reasons.push("instruction_count_out_of_range");
  }

  if (recipe.proteinG >= 25) {
    score += 14;
  } else if (recipe.proteinG >= 15) {
    score += 8;
  } else {
    score += 2;
    reasons.push("low_protein");
  }

  const pantryCoverageRatio =
    recipe.ingredientItems.length > 0
      ? recipe.matchedIngredientNames.length / recipe.ingredientItems.length
      : 0;
  score += Math.round(pantryCoverageRatio * 20);
  if (pantryCoverageRatio < 0.45) {
    reasons.push("low_pantry_coverage");
  }

  score += scoreTimePreference(
    recipe.totalTimeMin,
    context.cookingTimePreference,
  );
  score += scoreGoalFit(recipe, context.goal);

  if (recipe.kind === "pantry") {
    if (recipe.missingIngredientNames.length === 0) {
      score += 12;
    } else {
      reasons.push("pantry_recipe_has_missing_ingredients");
    }
  }

  if (recipe.kind === "almost_cookable") {
    if (recipe.missingIngredientNames.length <= 3) {
      score += Math.max(0, 12 - recipe.missingIngredientNames.length * 3);
    } else {
      reasons.push("too_many_missing_ingredients");
    }
  }

  if (context.pantryItemCount === 0) {
    reasons.push("empty_pantry_context");
  }

  const accepted = score >= 46;
  if (!accepted && reasons.length === 0) {
    reasons.push("score_below_threshold");
  }

  return {
    score,
    accepted,
    reasons,
  };
}