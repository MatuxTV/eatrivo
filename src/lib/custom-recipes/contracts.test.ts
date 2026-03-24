import test from "node:test";
import assert from "node:assert/strict";

import {
  customRecipeAiOutputSchema,
  customRecipeResultSchema,
  mapAiCandidateToGeneratedRecipe,
} from "./contracts";

test("customRecipeAiOutputSchema accepts a valid payload", () => {
  const parsed = customRecipeAiOutputSchema.parse({
    pantryRecipe: {
      status: "available",
      name: "Pantry Pasta",
      category: "Dinner",
      description: "Fast pantry-friendly pasta.",
      servings: 2,
      servingUnit: null,
      prepTimeMin: 10,
      totalTimeMin: 20,
      difficulty: "easy",
      mealPrepFriendly: false,
      tags: ["quick"],
      nutrition: {
        calories: 520,
        proteinG: 24,
        carbohydratesG: 62,
        fatG: 18,
      },
      ingredients: [
        {
          name: "Pasta",
          amount: "200 g",
          pantryStatus: "pantry",
          pantryMatchName: "Pasta",
        },
      ],
      instructions: [{ title: "", text: "Cook and serve." }],
    },
    almostCookableRecipe: {
      status: "unavailable",
      reason: "INSUFFICIENT_PANTRY",
    },
  });

  assert.equal(parsed.pantryRecipe.status, "available");
});

test("customRecipeAiOutputSchema rejects too many missing ingredients", () => {
  assert.throws(() =>
    customRecipeAiOutputSchema.parse({
      pantryRecipe: {
        status: "unavailable",
        reason: "INSUFFICIENT_PANTRY",
      },
      almostCookableRecipe: {
        status: "available",
        name: "Almost Soup",
        category: "Lunch",
        description: "Needs too many extras.",
        servings: 2,
        servingUnit: null,
        prepTimeMin: 15,
        totalTimeMin: 30,
        difficulty: "easy",
        mealPrepFriendly: false,
        tags: ["warm"],
        nutrition: {
          calories: 320,
          proteinG: 12,
          carbohydratesG: 40,
          fatG: 8,
        },
        ingredients: [
          {
            name: "Tomatoes",
            amount: "2 pcs",
            pantryStatus: "missing",
            pantryMatchName: null,
          },
          {
            name: "Onion",
            amount: "1 pc",
            pantryStatus: "missing",
            pantryMatchName: null,
          },
          {
            name: "Broth",
            amount: "500 ml",
            pantryStatus: "missing",
            pantryMatchName: null,
          },
          {
            name: "Garlic",
            amount: "2 cloves",
            pantryStatus: "missing",
            pantryMatchName: null,
          },
        ],
        instructions: [{ title: "", text: "Cook and serve." }],
      },
    }),
  );
});

test("customRecipeResultSchema accepts structured final payload", () => {
  const parsed = customRecipeResultSchema.parse({
    pantryRecipe: {
      status: "unavailable",
      reason: "INSUFFICIENT_PANTRY",
      message: {
        key: "basic.customRecipe.recipeUnavailable.noPantryRecipe",
      },
    },
    almostCookableRecipe: {
      status: "available",
      kind: "almost_cookable",
      name: "Veggie Bowl",
      category: "Dinner",
      description: "Balanced bowl.",
      servings: 2,
      servingUnit: null,
      prepTimeMin: 15,
      totalTimeMin: 25,
      difficulty: "easy",
      mealPrepFriendly: true,
      tags: ["healthy"],
      calories: 480,
      proteinG: 22,
      carbohydratesG: 54,
      fatG: 16,
      ingredientItems: [{ name: "Rice", amount: "150 g", category: null }],
      instructions: [{ title: "", text: "Assemble and serve." }],
      matchedIngredients: [
        {
          recipeIngredientName: "Rice",
          pantryIngredientName: "Rice",
          matchType: "exact",
          displayName: "Rice",
          amount: "150 g",
        },
      ],
      matchedIngredientNames: ["Rice"],
      missingIngredientNames: ["Avocado"],
    },
    fallbackDatabaseSuggestions: [],
    userMessage: {
      key: "basic.customRecipe.message.almostCookableReady",
      values: { recipeName: "Veggie Bowl", missingCount: 1 },
    },
    meta: {
      locale: "en",
      pantryItemCount: 4,
      pantryIngredientKeyCount: 3,
      fallbackUsed: false,
      retryCount: 1,
    },
  });

  assert.equal(parsed.meta.locale, "en");
});

test("mapAiCandidateToGeneratedRecipe enriches pantry keys from pantry context", () => {
  const recipe = mapAiCandidateToGeneratedRecipe(
    {
      status: "available",
      name: "Steak Bowl",
      category: "Dinner",
      description: "Protein bowl from pantry items.",
      servings: 1,
      servingUnit: null,
      prepTimeMin: 10,
      totalTimeMin: 20,
      difficulty: "easy",
      mealPrepFriendly: false,
      tags: ["protein"],
      nutrition: {
        calories: 550,
        proteinG: 45,
        carbohydratesG: 22,
        fatG: 24,
      },
      ingredients: [
        {
          name: "Steak",
          amount: "200 g",
          pantryStatus: "pantry",
          pantryMatchName: "Hovadzi steak",
        },
        {
          name: "Rice",
          amount: "100 g",
          pantryStatus: "missing",
          pantryMatchName: null,
        },
      ],
      instructions: [{ title: "", text: "Cook and serve." }],
    },
    "almost_cookable",
    {
      locale: "en",
      pantryRows: [
        {
          id: "pantry-1",
          pantryName: "Hovadzi steak",
          ingredientName: "Beef steak",
          ingredientKey: "beef-steak",
          ingredientSpecificKey: "beef-steak-ribeye",
          trackingMode: "quantity",
          inStock: true,
          quantity: "250",
          unit: "g",
          category: "protein",
        },
      ],
    },
  );

  assert.equal(recipe.ingredientItems[0]?.ingredientKey, "beef-steak");
  assert.equal(
    recipe.ingredientItems[0]?.ingredientSpecificKey,
    "beef-steak-ribeye",
  );
  assert.equal(recipe.ingredientItems[1]?.ingredientKey, "rice");
  assert.equal(recipe.matchedIngredients[0]?.pantryIngredientName, "Hovadzi steak");
  assert.equal(recipe.matchedIngredients[0]?.matchType, "fallback");
  assert.deepEqual(recipe.matchedIngredientNames, ["Steak (Hovadzi steak)"]);
});
