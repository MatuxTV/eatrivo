import assert from "node:assert/strict";
import test from "node:test";

import { validateRecipeJson } from "./validateRecipeJson";

function buildState(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    userProfileId: "profile-1",
    locale: "sk",
    mode: "preferences_only",
    fallbackSuggestionLimit: 4,
    requestedServings: 2,
    requestedMealType: "dinner",
    requestedMealPrep: false,
    userProfile: null,
    userInfo: null,
    pantryRows: [],
    previousGeneratedRecipe: null,
    previousGeneratedRecipeJobId: null,
    diversityCheck: null,
    unitSemanticAudit: null,
    pantryItemCount: 0,
    pantryIngredientKeyCount: 0,
    rawAiOutput: JSON.stringify({
      pantryRecipe: {
        status: "unavailable",
        reason: "AI_UNABLE_TO_COMPOSE",
      },
      almostCookableRecipe: {
        status: "unavailable",
        reason: "AI_UNABLE_TO_COMPOSE",
      },
    }),
    parsedAiOutput: null,
    fallbackSuggestions: [],
    fallbackSuggestionsFetched: false,
    finalResult: null,
    retryCount: 0,
    requestError: null,
    validationErrorType: null,
    fatalError: null,
    fatalErrorCode: null,
    ...overrides,
  };
}

test("validateRecipeJson retries unavailable preferences-only candidates", async () => {
  const result = await validateRecipeJson(buildState() as never);

  assert.equal(result.parsedAiOutput, null);
  assert.equal(result.rawAiOutput, null);
  assert.equal(
    result.requestError,
    "Preferences-only request returned unavailable candidate",
  );
  assert.equal(result.retryCount, 1);
  assert.equal(result.validationErrorType, "preferences_only_unavailable");
});

test("validateRecipeJson accepts available preferences-only candidates", async () => {
  const result = await validateRecipeJson(
    buildState({
      rawAiOutput: JSON.stringify({
        pantryRecipe: {
          status: "available",
          name: "Kuracie ryzoto",
          category: "Dinner",
          description: "Kremove ryzoto s kuracim masom.",
          dietTags: [],
          restrictionFlags: [],
          servings: 2,
          servingUnit: "porcia",
          prepTimeMin: 15,
          totalTimeMin: 30,
          difficulty: "easy",
          mealPrepFriendly: true,
          tags: ["high-protein"],
          nutrition: {
            calories: 620,
            proteinG: 35,
            carbohydratesG: 55,
            fatG: 18,
          },
          ingredients: [
            {
              name: "Ryza",
              amount: "180 g",
              pantryStatus: "pantry",
              pantryMatchName: "Ryza",
              translations: {
                en: { display_name: "Rice" },
                sk: { display_name: "Ryža" },
              },
            },
            {
              name: "Kuracie prsia",
              amount: "250 g",
              pantryStatus: "pantry",
              pantryMatchName: "Kuracie prsia",
              translations: {
                en: { display_name: "Chicken breast" },
                sk: { display_name: "Kuracie prsia" },
              },
            },
          ],
          instructions: [
            { title: "Priprav", text: "Opraz ryzu s kuracim masom." },
            { title: "Dokonc", text: "Dolej vyvar a dovar do makka." },
          ],
          translations: {
            en: {
              name: "Chicken rice skillet",
              category_label: "Dinner",
              serving_unit_label: "servings",
              instructions: ["Cook the chicken with rice.", "Finish and serve."],
              notes: null,
            },
            sk: {
              name: "Kuracie ryzoto",
              category_label: "Vecera",
              serving_unit_label: "porcie",
              instructions: ["Opec kuracie s ryzou.", "Dokonc a podavaj."],
              notes: null,
            },
          },
        },
        almostCookableRecipe: {
          status: "unavailable",
          reason: "AI_UNABLE_TO_COMPOSE",
        },
      }),
    }) as never,
  );

  assert.equal(result.requestError, null);
  assert.equal(result.validationErrorType, null);
  assert.equal(result.parsedAiOutput?.pantryRecipe.status, "available");
});