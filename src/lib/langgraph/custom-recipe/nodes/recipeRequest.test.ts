import test from "node:test";
import assert from "node:assert/strict";

import { buildPantryPromptContext } from "../pantryPromptContext";

test("buildPantryPromptContext separates tracked pantry items from always-available staples", () => {
  const context = buildPantryPromptContext([
    {
      id: "pantry-1",
      pantryName: "Chicken breast",
      ingredientName: "Chicken breast",
      ingredientKey: "chicken",
      ingredientSpecificKey: "chicken-breast",
      trackingMode: "quantity",
      inStock: true,
      quantity: "500",
      unit: "g",
      category: "protein",
    },
    {
      id: "pantry-2",
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
    {
      id: "pantry-3",
      pantryName: "Black pepper",
      ingredientName: "Black pepper",
      ingredientKey: "pepper",
      ingredientSpecificKey: "black-pepper",
      trackingMode: "availability",
      inStock: true,
      quantity: null,
      unit: null,
      category: "spice",
    },
  ]);

  assert.equal(context.quantityTrackedCount, 1);
  assert.equal(context.availabilityStapleCount, 2);
  assert.deepEqual(context.stapleNames, ["Olive oil", "Black pepper"]);
  assert.match(context.summary, /Tracked pantry items with quantities:/);
  assert.match(context.summary, /Chicken breast \(500 g\)/);
  assert.match(context.summary, /Always-available staples already in stock:/);
  assert.match(context.summary, /Olive oil/);
  assert.doesNotMatch(context.summary, /Olive oil \(quantity unknown\)/);
});