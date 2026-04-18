import assert from "node:assert/strict";
import test from "node:test";

import { repairRecipeUnits } from "./repairRecipeUnits";

test("repairRecipeUnits preserves suggested unit when suggestedAmount is numeric only", async () => {
  const result = await repairRecipeUnits({
    userId: "user-1",
    userProfileId: "profile-1",
    parsedAiOutput: {
      pantryRecipe: {
        status: "available",
        name: "Recipe",
        category: "Main",
        description: "desc",
        servings: 2,
        servingUnit: "porcia",
        prepTimeMin: 10,
        totalTimeMin: 20,
        difficulty: "easy",
        mealPrepFriendly: false,
        tags: ["obed"],
        nutrition: {
          calories: 500,
          proteinG: 30,
          carbohydratesG: 40,
          fatG: 20,
        },
        ingredients: [
          {
            name: "zemiaky",
            amount: "600 g",
            pantryStatus: "pantry",
            pantryMatchName: "zemiaky",
          },
        ],
        instructions: [{ title: "Step", text: "Cook" }],
      },
      almostCookableRecipe: {
        status: "unavailable",
        reason: "AI_UNABLE_TO_COMPOSE",
      },
    },
    unitSemanticAudit: {
      passed: false,
      issues: [
        {
          recipeKind: "pantry",
          ingredientName: "zemiaky",
          currentAmount: "600 g",
          suggestedAmount: "4",
          suggestedUnit: "ks",
          reason: "Prefer countable amount",
        },
      ],
    },
  } as never);

  const rawAiOutput = result.rawAiOutput;
  assert.equal(typeof rawAiOutput, "string");

  const parsed = JSON.parse(rawAiOutput as string) as {
    pantryRecipe: { ingredients: Array<{ amount: string }> };
  };

  assert.equal(parsed.pantryRecipe.ingredients[0]?.amount, "4 ks");
});