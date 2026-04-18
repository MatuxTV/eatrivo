import test from "node:test";
import assert from "node:assert/strict";

import {
  customRecipeAiOutputSchema,
  customRecipeResultSchema,
  customRecipeStartRequestSchema,
  mapAiCandidateToGeneratedRecipe,
  mapMatchedRecipeToSuggestion,
} from "./contracts";

function buildAiTranslations(name: string, category: string, notes: string) {
  return {
    en: {
      name,
      category_label: category,
      serving_unit_label: null,
      instructions: ["Cook and serve."],
      notes,
    },
    sk: {
      name: `${name} SK`,
      category_label: `${category} SK`,
      serving_unit_label: null,
      instructions: ["Uvar a podávaj."],
      notes: `${notes} SK`,
    },
  };
}

function buildIngredientTranslations(name: string) {
  return {
    en: { display_name: name },
    sk: { display_name: `${name} SK` },
  };
}

test("customRecipeStartRequestSchema defaults to pantry mode", () => {
  const parsed = customRecipeStartRequestSchema.parse({});

  assert.equal(parsed.mode, "pantry");
});

test("customRecipeAiOutputSchema rejects ingredients without explicit unit", () => {
  assert.throws(() =>
    customRecipeAiOutputSchema.parse({
      pantryRecipe: {
        status: "available",
        name: "Oil Pasta",
        category: "Dinner",
        description: "Needs proper unit.",
        dietTags: [],
        restrictionFlags: [],
        servings: 2,
        servingUnit: null,
        prepTimeMin: 10,
        totalTimeMin: 20,
        difficulty: "easy",
        mealPrepFriendly: false,
        tags: ["quick"],
        nutrition: {
          calories: 480,
          proteinG: 18,
          carbohydratesG: 52,
          fatG: 20,
        },
        ingredients: [
          {
            name: "Olive oil",
            amount: "0,5",
            pantryStatus: "pantry",
            pantryMatchName: "Olive oil",
            translations: buildIngredientTranslations("Olive oil"),
          },
        ],
        instructions: [{ title: "", text: "Mix and serve." }],
        translations: buildAiTranslations("Oil Pasta", "Dinner", "Needs proper unit."),
      },
      almostCookableRecipe: {
        status: "unavailable",
        reason: "INSUFFICIENT_PANTRY",
      },
    }),
  );
});

test("customRecipeAiOutputSchema allows semantically questionable units for later audit", () => {
  const parsed = customRecipeAiOutputSchema.parse({
    pantryRecipe: {
      status: "unavailable",
      reason: "INSUFFICIENT_PANTRY",
    },
    almostCookableRecipe: {
      status: "available",
      name: "Pasta al pretlak",
      category: "Dinner",
      description: "Wrong unit test.",
      dietTags: [],
      restrictionFlags: [],
      servings: 2,
      servingUnit: null,
      prepTimeMin: 10,
      totalTimeMin: 20,
      difficulty: "easy",
      mealPrepFriendly: false,
      tags: ["quick"],
      nutrition: {
        calories: 480,
        proteinG: 18,
        carbohydratesG: 52,
        fatG: 20,
      },
      ingredients: [
        {
          name: "Tomato paste",
          amount: "2 ks",
          pantryStatus: "missing",
          pantryMatchName: null,
          translations: buildIngredientTranslations("Tomato paste"),
        },
      ],
      instructions: [{ title: "", text: "Mix and serve." }],
      translations: buildAiTranslations(
        "Pasta al pretlak",
        "Dinner",
        "Wrong unit test.",
      ),
    },
  });

  assert.equal(parsed.almostCookableRecipe.status, "available");
});

test("customRecipeAiOutputSchema accepts a valid payload", () => {
  const parsed = customRecipeAiOutputSchema.parse({
    pantryRecipe: {
      status: "available",
      name: "Pantry Pasta",
      category: "Dinner",
      description: "Fast pantry-friendly pasta.",
      dietTags: [],
      restrictionFlags: [],
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
          translations: buildIngredientTranslations("Pasta"),
        },
      ],
      instructions: [{ title: "", text: "Cook and serve." }],
      translations: buildAiTranslations(
        "Pantry Pasta",
        "Dinner",
        "Fast pantry-friendly pasta.",
      ),
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
        dietTags: [],
        restrictionFlags: [],
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
            translations: buildIngredientTranslations("Tomatoes"),
          },
          {
            name: "Onion",
            amount: "1 pc",
            pantryStatus: "missing",
            pantryMatchName: null,
            translations: buildIngredientTranslations("Onion"),
          },
          {
            name: "Broth",
            amount: "500 ml",
            pantryStatus: "missing",
            pantryMatchName: null,
            translations: buildIngredientTranslations("Broth"),
          },
          {
            name: "Garlic",
            amount: "2 cloves",
            pantryStatus: "missing",
            pantryMatchName: null,
            translations: buildIngredientTranslations("Garlic"),
          },
        ],
        instructions: [{ title: "", text: "Cook and serve." }],
        translations: buildAiTranslations(
          "Almost Soup",
          "Lunch",
          "Needs too many extras.",
        ),
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
      mode: "pantry",
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
      dietTags: ["high-protein"],
      restrictionFlags: ["contains-beef"],
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
          translations: buildIngredientTranslations("Steak"),
        },
        {
          name: "Rice",
          amount: "100 g",
          pantryStatus: "missing",
          pantryMatchName: null,
          translations: buildIngredientTranslations("Rice"),
        },
      ],
      instructions: [{ title: "", text: "Cook and serve." }],
      translations: buildAiTranslations(
        "Steak Bowl",
        "Dinner",
        "Protein bowl from pantry items.",
      ),
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
  assert.equal(recipe.ingredientItems[0]?.pantryTrackingMode, "quantity");
  assert.equal(recipe.ingredientItems[0]?.isAvailabilityStaple, false);
  assert.deepEqual(recipe.matchedIngredientNames, ["Steak (Hovadzi steak)"]);
  assert.equal(recipe.canonicalRecipe?.translations.en.name, "Steak Bowl");
  assert.equal(recipe.canonicalRecipe?.category_key, "dinner");
});

test("mapAiCandidateToGeneratedRecipe flags availability staples from pantry context", () => {
  const recipe = mapAiCandidateToGeneratedRecipe(
    {
      status: "available",
      name: "Pepper Eggs",
      category: "Breakfast",
      description: "Eggs finished with staples.",
      dietTags: ["vegetarian"],
      restrictionFlags: ["contains-eggs"],
      servings: 2,
      servingUnit: null,
      prepTimeMin: 5,
      totalTimeMin: 10,
      difficulty: "easy",
      mealPrepFriendly: false,
      tags: ["quick"],
      nutrition: {
        calories: 320,
        proteinG: 22,
        carbohydratesG: 4,
        fatG: 22,
      },
      ingredients: [
        {
          name: "Olive oil",
          amount: "10 ml",
          pantryStatus: "pantry",
          pantryMatchName: "Olive oil",
          translations: buildIngredientTranslations("Olive oil"),
        },
      ],
      instructions: [{ title: "", text: "Cook and serve." }],
      translations: buildAiTranslations(
        "Pepper Eggs",
        "Breakfast",
        "Eggs finished with staples.",
      ),
    },
    "pantry",
    {
      locale: "en",
      pantryRows: [
        {
          id: "pantry-staple",
          pantryName: "Olive oil",
          ingredientName: "Olive oil",
          ingredientKey: "oil",
          ingredientSpecificKey: "olive-oil",
          trackingMode: "availability",
          inStock: true,
          quantity: null,
          unit: null,
          category: "fat",
        },
      ],
    },
  );

  assert.equal(recipe.ingredientItems[0]?.pantryTrackingMode, "availability");
  assert.equal(recipe.ingredientItems[0]?.isAvailabilityStaple, true);
  assert.equal(recipe.matchedIngredients[0]?.isAvailabilityStaple, true);
});

test("mapMatchedRecipeToSuggestion separates quantity and staple matches", () => {
  const suggestion = mapMatchedRecipeToSuggestion(
    {
      id: "de305d54-75b4-431b-adb2-eb6b9e546014",
      slug: "pantry-pasta",
      externalKey: "pantry-pasta",
      name: "Pantry Pasta",
      category: "Dinner",
      categoryKey: "dinner",
      servings: 2,
      servingUnit: "servings",
      prepTimeMin: 10,
      totalTimeMin: 20,
      calories: 540,
      proteinG: 24,
      carbohydratesG: 64,
      fatG: 18,
      restrictionFlags: [],
      instructions: [{ title: "", text: "Cook and serve." }],
      ingredientItems: [
        { name: "Pasta", amount: "200 g", category: "carb" },
        { name: "Olive oil", amount: "10 ml", category: "fat" },
      ],
      mealPrepFriendly: false,
      totalRequiredIngredients: 2,
      matchedRequiredIngredients: 2,
      missingRequiredIngredients: 0,
      matchRatio: 1,
      matchedIngredients: [
        {
          recipeIngredientName: "Pasta",
          pantryIngredientName: "Pasta",
          matchType: "exact",
          displayName: "Pasta",
          amount: "200 g",
          pantryComparison: {
            status: "enough",
            canCompare: true,
            isEnough: true,
            requiredQuantity: 200,
            requiredUnit: "g",
            requiredLabel: "200 g",
            availableQuantity: 300,
            availableUnit: "g",
            availableLabel: "300 g",
            missingQuantity: 0,
            missingLabel: null,
            matchingPantryItems: 1,
          },
        },
        {
          recipeIngredientName: "Olive oil",
          pantryIngredientName: "Olive oil",
          matchType: "exact",
          displayName: "Olive oil",
          amount: "10 ml",
          pantryComparison: {
            status: "available-staple",
            canCompare: false,
            isEnough: true,
            requiredQuantity: 10,
            requiredUnit: "ml",
            requiredLabel: "10 ml",
            availableQuantity: null,
            availableUnit: null,
            availableLabel: null,
            missingQuantity: 0,
            missingLabel: null,
            matchingPantryItems: 1,
          },
        },
      ],
      matchedIngredientNames: ["Pasta", "Olive oil"],
      missingIngredientNames: [],
    },
    "pantry",
  );

  assert.equal(suggestion.quantityMatchedIngredients, 1);
  assert.equal(suggestion.availabilityMatchedIngredients, 1);
});
