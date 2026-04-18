import assert from "node:assert/strict";
import test from "node:test";

import type { CustomRecipeGeneratedRecipe } from "./contracts";
import { scoreCustomRecipe } from "./quality";

function buildRecipe(
  overrides: Partial<CustomRecipeGeneratedRecipe> = {},
): CustomRecipeGeneratedRecipe {
  return {
    status: "available",
    kind: "preferences_only",
    name: "Profile Pasta",
    category: "Dinner",
    description: "Built from profile preferences.",
    servings: 2,
    servingUnit: "servings",
    prepTimeMin: 10,
    totalTimeMin: 20,
    difficulty: "easy",
    mealPrepFriendly: true,
    tags: ["high-protein"],
    calories: 540,
    proteinG: 32,
    carbohydratesG: 48,
    fatG: 18,
    ingredientItems: [
      { name: "Pasta", amount: "180 g", category: "grain" },
      { name: "Chicken", amount: "180 g", category: "protein" },
      { name: "Spinach", amount: "80 g", category: "vegetable" },
    ],
    instructions: [
      { title: "Cook", text: "Cook the pasta and chicken." },
      { title: "Finish", text: "Toss together with spinach and serve." },
    ],
    matchedIngredients: [],
    matchedIngredientNames: [],
    missingIngredientNames: [],
    ...overrides,
  };
}

test("scoreCustomRecipe does not penalize preferences-only recipes for pantry coverage", () => {
  const result = scoreCustomRecipe(buildRecipe(), {
    pantryItemCount: 0,
    mode: "preferences_only",
    cookingTimePreference: "quick",
    goal: "gain_muscle",
  });

  assert.equal(result.accepted, true);
  assert.equal(result.reasons.includes("low_pantry_coverage"), false);
  assert.equal(result.reasons.includes("empty_pantry_context"), false);
});