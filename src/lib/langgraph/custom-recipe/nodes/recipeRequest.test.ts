import test from "node:test";
import assert from "node:assert/strict";

// The feature flag is evaluated once, when ../pantryPromptContext first imports
// @/lib/config/features. This test sets the env var BEFORE the dynamic import,
// so this file must not statically import ../pantryPromptContext or the
// features module.

test("buildPantryPromptContext separates tracked pantry items from always-available staples", async () => {
  process.env.NEXT_PUBLIC_PANTRY_QUANTITY_TRACKING = "true";
  const { buildPantryPromptContext } = await import("../pantryPromptContext");

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
  assert.match(context.summary, /Untracked availability items already in stock:/);
  assert.match(context.summary, /Olive oil/);
  assert.doesNotMatch(context.summary, /Olive oil \(quantity unknown\)/);
});
