import test from "node:test";
import assert from "node:assert/strict";

import { buildPantryPromptContext } from "./pantryPromptContext";

function buildRows() {
  return [
    {
      id: "pantry-1",
      pantryName: "Chicken breast",
      ingredientName: "Chicken breast",
      ingredientKey: "chicken",
      ingredientSpecificKey: "chicken-breast",
      trackingMode: "quantity" as const,
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
      trackingMode: "availability" as const,
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
      trackingMode: "availability" as const,
      inStock: true,
      quantity: null,
      unit: null,
      category: "spice",
    },
  ];
}

test("buildPantryPromptContext lists every in-stock row without amounts when flag is off", () => {
  const context = buildPantryPromptContext(buildRows());

  assert.equal(context.quantityTrackedCount, 0);
  assert.equal(context.availabilityStapleCount, 3);
  assert.deepEqual(context.stapleNames, [
    "Chicken breast",
    "Olive oil",
    "Black pepper",
  ]);
  assert.match(context.summary, /Pantry items already in stock/);
  assert.match(context.summary, /- Chicken breast/);
  assert.doesNotMatch(context.summary, /500/);
  assert.doesNotMatch(context.summary, /Tracked pantry items with quantities/);
});

test("buildPantryPromptContext omits out-of-stock rows from the summary when flag is off", () => {
  const context = buildPantryPromptContext([
    ...buildRows(),
    {
      id: "pantry-4",
      pantryName: "Sea salt",
      ingredientName: "Sea salt",
      ingredientKey: "salt",
      ingredientSpecificKey: "sea-salt",
      trackingMode: "availability" as const,
      inStock: false,
      quantity: null,
      unit: null,
      category: "spice",
    },
  ]);

  assert.equal(context.availabilityStapleCount, 3);
  assert.doesNotMatch(context.summary, /Sea salt/);
});
