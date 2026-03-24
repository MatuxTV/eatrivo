import test from "node:test";
import assert from "node:assert/strict";

import { buildRecipeIngredientPantryComparison } from "./recipe-quantity-comparison";

test("buildRecipeIngredientPantryComparison localizes comparison labels for Slovak UI", () => {
  const comparison = buildRecipeIngredientPantryComparison(
    2,
    "tbsp",
    [{ quantity: 1, unit: "tbsp" }],
    "sk",
  );

  assert.equal(comparison.requiredLabel, "2 pl");
  assert.equal(comparison.availableLabel, "1 pl");
  assert.equal(comparison.missingLabel, "1 pl");
});

test("buildRecipeIngredientPantryComparison resolves canonical unit aliases in labels", () => {
  const comparison = buildRecipeIngredientPantryComparison(
    2,
    "pc",
    [{ quantity: 1, unit: "ks" }],
    "en",
  );

  assert.equal(comparison.status, "insufficient");
  assert.equal(comparison.requiredLabel, "2 pc");
  assert.equal(comparison.availableLabel, "1 pc");
  assert.equal(comparison.missingLabel, "1 pc");
});