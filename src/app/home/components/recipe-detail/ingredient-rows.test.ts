import assert from "node:assert/strict";
import test from "node:test";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";
import type { RecipeIngredientPantryComparison } from "@/lib/recipes/recipe-quantity-comparison";
import {
  buildIngredientRows,
  countIngredientRows,
  type IngredientRowLabels,
} from "@/app/home/components/recipe-detail/ingredient-rows";

type RecipeInput = Pick<
  BasicHomeRecipePreview,
  "ingredientItems" | "matchedIngredients" | "missingIngredients"
>;

const LABELS: IngredientRowLabels = {
  stapleAvailable: "have at home",
  haveAmountInline: (amount) => `have ${amount}`,
  fallbackUsing: (ingredient) => `We have: ${ingredient}`,
};

function comparison(
  status: RecipeIngredientPantryComparison["status"],
  overrides: Partial<RecipeIngredientPantryComparison> = {},
): RecipeIngredientPantryComparison {
  return {
    status,
    canCompare: false,
    isEnough: null,
    requiredQuantity: null,
    requiredUnit: null,
    requiredLabel: null,
    availableQuantity: null,
    availableUnit: null,
    availableLabel: null,
    missingQuantity: null,
    missingLabel: null,
    matchingPantryItems: 0,
    ...overrides,
  };
}

test("matched exact ingredient becomes a green row", () => {
  const recipe: RecipeInput = {
    ingredientItems: [{ name: "Ryža", amount: "200 g", category: "pantry" }],
    matchedIngredients: [
      {
        recipeIngredientName: "Ryža",
        pantryIngredientName: "Ryža",
        matchType: "exact",
        displayName: "Ryža",
        amount: "200 g",
      },
    ],
    missingIngredients: [],
  };

  const rows = buildIngredientRows(recipe, LABELS);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.tone, "green");
  assert.equal(rows[0]!.available, true);
  assert.equal(rows[0]!.note, null);
  assert.equal(rows[0]!.amount, "200 g");
});

test("matched fallback with a different pantry name becomes orange with a note", () => {
  const recipe: RecipeInput = {
    ingredientItems: [{ name: "Maslo", amount: "50 g", category: "dairy" }],
    matchedIngredients: [
      {
        recipeIngredientName: "Maslo",
        pantryIngredientName: "Margarín",
        matchType: "fallback",
        displayName: "Margarín",
        amount: "50 g",
      },
    ],
    missingIngredients: [],
  };

  const rows = buildIngredientRows(recipe, LABELS);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.tone, "orange");
  assert.equal(rows[0]!.note, "We have: Margarín");
});

test("insufficient pantry comparison becomes an orange row", () => {
  const recipe: RecipeInput = {
    ingredientItems: [
      {
        name: "Múka",
        amount: "300 g",
        category: "pantry",
        pantryComparison: comparison("insufficient", {
          requiredLabel: "300 g",
          availableLabel: "100 g",
        }),
      },
    ],
    matchedIngredients: [
      {
        recipeIngredientName: "Múka",
        pantryIngredientName: "Múka",
        matchType: "exact",
        displayName: "Múka",
        amount: "300 g",
      },
    ],
    missingIngredients: [],
  };

  const rows = buildIngredientRows(recipe, LABELS);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.tone, "orange");
  assert.equal(rows[0]!.amount, "300 g (have 100 g)");
});

test("missing ingredient becomes a red row with category from ingredientItems", () => {
  const recipe: RecipeInput = {
    ingredientItems: [{ name: "Cibuľa", amount: "1 ks", category: "vegetables" }],
    matchedIngredients: [],
    missingIngredients: ["Cibuľa"],
  };

  const rows = buildIngredientRows(recipe, LABELS);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.tone, "red");
  assert.equal(rows[0]!.available, false);
  assert.equal(rows[0]!.category, "vegetables");
  assert.equal(rows[0]!.amount, "1 ks");
});

test("undefined matchedIngredients lists every ingredientItem as available", () => {
  const recipe: RecipeInput = {
    ingredientItems: [
      { name: "Ryža", amount: "200 g", category: "pantry" },
      { name: "Sóľ", amount: null, category: "pantry" },
    ],
    missingIngredients: [],
  };

  const rows = buildIngredientRows(recipe, LABELS);

  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.available));
  assert.equal(rows[0]!.name, "Ryža");
  assert.equal(rows[1]!.name, "Sóľ");
});

test("quantityTracking false never marks a row as staple", () => {
  const recipe: RecipeInput = {
    ingredientItems: [
      {
        name: "Sóľ",
        amount: null,
        category: "pantry",
        pantryComparison: comparison("available-staple"),
      },
    ],
    matchedIngredients: [
      {
        recipeIngredientName: "Sóľ",
        pantryIngredientName: "Sóľ",
        matchType: "exact",
        displayName: "Sóľ",
        amount: null,
      },
    ],
    missingIngredients: [],
  };

  const rows = buildIngredientRows(recipe, LABELS, { quantityTracking: false });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.isStaple, false);
});

test("countIngredientRows splits have and missing", () => {
  const recipe: RecipeInput = {
    ingredientItems: [
      { name: "Ryža", amount: "200 g", category: "pantry" },
      { name: "Cibuľa", amount: "1 ks", category: "vegetables" },
    ],
    matchedIngredients: [
      {
        recipeIngredientName: "Ryža",
        pantryIngredientName: "Ryža",
        matchType: "exact",
        displayName: "Ryža",
        amount: "200 g",
      },
    ],
    missingIngredients: ["Cibuľa"],
  };

  const rows = buildIngredientRows(recipe, LABELS);
  const counts = countIngredientRows(rows);

  assert.equal(counts.total, 2);
  assert.equal(counts.have, 1);
  assert.equal(counts.missing.length, 1);
  assert.equal(counts.missing[0]!.name, "Cibuľa");
});
