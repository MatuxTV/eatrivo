import test from "node:test";
import assert from "node:assert/strict";

import type { BasicHomeRecipePreview } from "@/app/home/types/data";

import { getPantryMatch, splitMissing } from "./pantry-match";

type MatchedIngredients = NonNullable<
  BasicHomeRecipePreview["matchedIngredients"]
>;

function matched(count: number): MatchedIngredients {
  return Array.from({ length: count }, (_, index) => ({
    recipeIngredientName: `ingredient-${index}`,
    pantryIngredientName: null,
    matchType: "exact" as const,
    displayName: `Ingredient ${index}`,
    amount: null,
  }));
}

test("getPantryMatch returns null when the recipe has no pantry data", () => {
  assert.equal(getPantryMatch({}), null);
  assert.equal(
    getPantryMatch({ matchedIngredients: undefined, missingIngredients: undefined }),
    null,
  );
});

test("getPantryMatch handles a recipe with everything in the pantry", () => {
  assert.deepEqual(
    getPantryMatch({ matchedIngredients: matched(5), missingIngredients: [] }),
    { have: 5, total: 5, missing: [] },
  );
});

test("getPantryMatch handles a single missing ingredient", () => {
  assert.deepEqual(
    getPantryMatch({
      matchedIngredients: matched(3),
      missingIngredients: ["Basil"],
    }),
    { have: 3, total: 4, missing: ["Basil"] },
  );
});

test("getPantryMatch keeps order and drops empty or duplicated names", () => {
  assert.deepEqual(
    getPantryMatch({
      matchedIngredients: matched(2),
      missingIngredients: ["Basil", "  ", "basil", "Olive oil", "OLIVE OIL"],
    }),
    { have: 2, total: 4, missing: ["Basil", "Olive oil"] },
  );
});

test("getPantryMatch works when only the missing list is defined", () => {
  assert.deepEqual(
    getPantryMatch({ missingIngredients: ["Basil", "Olive oil"] }),
    { have: 0, total: 2, missing: ["Basil", "Olive oil"] },
  );
});

test("getPantryMatch counts the narrowed ingredientPreview when matchedIngredients is absent", () => {
  assert.deepEqual(
    getPantryMatch({
      ingredientPreview: ["Eggs", "Spinach", "Tomatoes"],
      missingIngredients: ["Feta"],
    }),
    { have: 3, total: 4, missing: ["Feta"] },
  );
});

test("getPantryMatch prefers matchedIngredients over ingredientPreview", () => {
  assert.deepEqual(
    getPantryMatch({
      matchedIngredients: matched(1),
      ingredientPreview: ["Eggs", "Spinach", "Tomatoes", "Feta"],
      missingIngredients: ["Feta"],
    }),
    { have: 1, total: 2, missing: ["Feta"] },
  );
});

test("getPantryMatch returns null when there is nothing to match", () => {
  assert.equal(getPantryMatch({ missingIngredients: ["  ", ""] }), null);
});

test("splitMissing shows the first items and counts the rest", () => {
  const missing = ["a", "b", "c", "d", "e", "f"];

  assert.deepEqual(splitMissing(missing), { shown: ["a", "b"], rest: 4 });
  assert.deepEqual(splitMissing(missing, 4), {
    shown: ["a", "b", "c", "d"],
    rest: 2,
  });
  assert.deepEqual(splitMissing(["a"]), { shown: ["a"], rest: 0 });
  assert.deepEqual(splitMissing([], 2), { shown: [], rest: 0 });
});
