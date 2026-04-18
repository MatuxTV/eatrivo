import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOM_RECIPE_MIN_DIVERSITY,
  evaluateCustomRecipeDiversity,
  getLatestGeneratedCustomRecipe,
} from "./diversity";
import type { CustomRecipeGeneratedRecipe, CustomRecipeResult } from "./contracts";

function buildRecipe(overrides: Partial<CustomRecipeGeneratedRecipe>): CustomRecipeGeneratedRecipe {
  return {
    status: "available",
    kind: "pantry",
    name: "Default Recipe",
    category: "Dinner",
    description: "Recipe description",
    servings: 2,
    servingUnit: "serving",
    prepTimeMin: 10,
    totalTimeMin: 20,
    difficulty: "easy",
    mealPrepFriendly: false,
    tags: ["quick"],
    calories: 500,
    proteinG: 30,
    carbohydratesG: 40,
    fatG: 15,
    ingredientItems: [
      { name: "Chicken", amount: "200 g", category: "protein" },
      { name: "Rice", amount: "120 g", category: "grain" },
      { name: "Broccoli", amount: "150 g", category: "vegetable" },
    ],
    instructions: [
      { title: "Cook", text: "Cook the chicken in a pan." },
      { title: "Serve", text: "Serve with rice and broccoli." },
    ],
    matchedIngredients: [],
    matchedIngredientNames: ["Chicken", "Rice", "Broccoli"],
    missingIngredientNames: [],
    ...overrides,
  };
}

test("evaluateCustomRecipeDiversity fails for very similar recipes", () => {
  const previousRecipe = buildRecipe({
    name: "Chicken Rice Bowl",
    tags: ["quick", "protein"],
  });
  const candidateRecipe = buildRecipe({
    name: "Chicken Rice Bowl Remix",
    tags: ["quick", "protein"],
  });

  const result = evaluateCustomRecipeDiversity(previousRecipe, candidateRecipe);

  assert.equal(result.passed, false);
  assert.ok(result.diversityScore < CUSTOM_RECIPE_MIN_DIVERSITY);
});

test("evaluateCustomRecipeDiversity passes for sufficiently different recipes", () => {
  const previousRecipe = buildRecipe({
    name: "Chicken Rice Bowl",
    tags: ["quick", "protein"],
  });
  const candidateRecipe = buildRecipe({
    name: "Tomato Bean Lasagna",
    category: "Baked dinner",
    tags: ["comfort", "baked"],
    ingredientItems: [
      { name: "Lasagna sheets", amount: "200 g", category: "grain" },
      { name: "Tomato sauce", amount: "400 ml", category: "sauce" },
      { name: "White beans", amount: "250 g", category: "protein" },
    ],
    instructions: [
      { title: "Layer", text: "Layer sheets with sauce and beans." },
      { title: "Bake", text: "Bake until bubbling and browned." },
    ],
    matchedIngredientNames: ["Lasagna sheets", "Tomato sauce", "White beans"],
  });

  const result = evaluateCustomRecipeDiversity(previousRecipe, candidateRecipe);

  assert.equal(result.passed, true);
  assert.ok(result.diversityScore >= CUSTOM_RECIPE_MIN_DIVERSITY);
});

test("getLatestGeneratedCustomRecipe prefers pantry recipe before almost cookable", () => {
  const pantryRecipe = buildRecipe({ name: "Pantry Winner", kind: "pantry" });
  const almostCookableRecipe = buildRecipe({
    name: "Almost Winner",
    kind: "almost_cookable",
    missingIngredientNames: ["Lemon"],
  });

  const result: CustomRecipeResult = {
    pantryRecipe,
    almostCookableRecipe,
    fallbackDatabaseSuggestions: [],
    userMessage: { key: "basic.customRecipe.message.pantryRecipeReady" },
    meta: {
      locale: "en",
      mode: "pantry",
      pantryItemCount: 3,
      pantryIngredientKeyCount: 3,
      fallbackUsed: false,
      retryCount: 0,
    },
  };

  assert.equal(getLatestGeneratedCustomRecipe(result)?.name, "Pantry Winner");
});