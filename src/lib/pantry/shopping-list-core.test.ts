import test from "node:test";
import assert from "node:assert/strict";

import {
  addQuantities,
  findSameIngredientItem,
  isSameIngredientItem,
  planPantryCheckout,
  type CheckoutListItem,
  type CheckoutPantryItem,
} from "./shopping-list-core";

function listItem(overrides: Partial<CheckoutListItem> & { id: string }): CheckoutListItem {
  return {
    name: "item",
    ingredientId: null,
    ingredientKey: null,
    ingredientSpecificKey: null,
    quantity: null,
    unit: null,
    ...overrides,
  };
}

function pantryItem(overrides: Partial<CheckoutPantryItem> & { id: string }): CheckoutPantryItem {
  return {
    name: "item",
    ingredientId: null,
    ingredientKey: null,
    ingredientSpecificKey: null,
    trackingMode: "quantity",
    inStock: true,
    quantity: null,
    unit: null,
    ...overrides,
  };
}

const oliveOil = { name: "olivový olej", ingredientId: "id:olive-oil", ingredientKey: "oil", ingredientSpecificKey: "olive-oil" };
const vegetableOil = { name: "rastlinný olej", ingredientId: "id:vegetable-oil", ingredientKey: "oil", ingredientSpecificKey: "vegetable-oil" };

// ── isSameIngredientItem / findSameIngredientItem ───────────────────────────

test("isSameIngredientItem does not treat sibling ingredients in one family as the same item", () => {
  assert.equal(isSameIngredientItem(oliveOil, vegetableOil), false);
});

test("isSameIngredientItem compares ingredient ids first", () => {
  assert.equal(
    isSameIngredientItem(oliveOil, { ...oliveOil, name: "Extra panenský olivový olej" }),
    true,
  );
  assert.equal(
    isSameIngredientItem(
      { ...oliveOil, ingredientId: "id:a" },
      { ...oliveOil, ingredientId: "id:b" },
    ),
    false,
  );
});

test("isSameIngredientItem falls back to specific keys when an id is missing", () => {
  assert.equal(isSameIngredientItem({ ...oliveOil, ingredientId: null }, oliveOil), true);
  assert.equal(isSameIngredientItem({ ...oliveOil, ingredientId: null }, vegetableOil), false);
});

test("isSameIngredientItem only uses the family key for legacy rows without specific keys", () => {
  const legacy = { name: "olej", ingredientKey: "oil", ingredientSpecificKey: null };

  assert.equal(isSameIngredientItem(legacy, { ...legacy, name: "Olej" }), true);
  assert.equal(
    isSameIngredientItem({ ...legacy, ingredientId: null }, { ...oliveOil, ingredientId: null }),
    true,
  );
});

test("isSameIngredientItem matches unlinked items by name, case-insensitively", () => {
  const unlinked = { name: " Chlieb ", ingredientKey: null, ingredientSpecificKey: null };

  assert.equal(isSameIngredientItem(unlinked, { ...unlinked, name: "chlieb" }), true);
  assert.equal(isSameIngredientItem(unlinked, { ...unlinked, name: "rožky" }), false);
});

test("findSameIngredientItem finds the matching list item and ignores siblings", () => {
  const items = [
    { id: "1", ...oliveOil },
    { id: "2", name: "mlieko", ingredientId: "id:milk", ingredientKey: "milk", ingredientSpecificKey: "milk" },
  ];

  assert.equal(findSameIngredientItem(items, vegetableOil), undefined);
  assert.equal(findSameIngredientItem(items, { ...oliveOil, ingredientId: null })?.id, "1");
});

// ── addQuantities ───────────────────────────────────────────────────────────

test("addQuantities adds amounts in the same unit", () => {
  assert.deepEqual(
    addQuantities({ quantity: 1, unit: "l" }, { quantity: 0.5, unit: "l" }),
    { quantity: 1.5, unit: "l" },
  );
});

test("addQuantities converts the bought amount into the pantry item's unit", () => {
  assert.deepEqual(
    addQuantities({ quantity: 1, unit: "kg" }, { quantity: 500, unit: "g" }),
    { quantity: 1.5, unit: "kg" },
  );
  assert.deepEqual(
    addQuantities({ quantity: 250, unit: "g" }, { quantity: 1, unit: "kg" }),
    { quantity: 1250, unit: "g" },
  );
});

test("addQuantities refuses to add amounts of different dimensions", () => {
  assert.equal(addQuantities({ quantity: 500, unit: "g" }, { quantity: 1, unit: "l" }), null);
});

test("addQuantities refuses when only one side has a unit", () => {
  assert.equal(addQuantities({ quantity: 2, unit: null }, { quantity: 1, unit: "kg" }), null);
  assert.equal(addQuantities({ quantity: 2, unit: "kg" }, { quantity: 1, unit: null }), null);
});

test("addQuantities adds unitless amounts together", () => {
  assert.deepEqual(
    addQuantities({ quantity: 2, unit: null }, { quantity: 3, unit: null }),
    { quantity: 5, unit: null },
  );
});

test("addQuantities avoids floating point noise", () => {
  assert.deepEqual(
    addQuantities({ quantity: 0.1, unit: "kg" }, { quantity: 0.2, unit: "kg" }),
    { quantity: 0.3, unit: "kg" },
  );
});

// ── planPantryCheckout ──────────────────────────────────────────────────────

test("planPantryCheckout tops up an existing pantry item instead of adding a second row", () => {
  const plan = planPantryCheckout(
    [listItem({ id: "l1", name: "Mlieko", ingredientId: "id:milk", quantity: "1", unit: "l" })],
    [pantryItem({ id: "p1", name: "Mlieko", ingredientId: "id:milk", quantity: "0.5", unit: "l" })],
  );

  assert.deepEqual(plan.inserts, []);
  assert.deepEqual(plan.merges, [
    { pantryItemId: "p1", quantity: "1.5", unit: "l", inStock: true, shoppingListItemIds: ["l1"] },
  ]);
});

test("planPantryCheckout converts units when topping up", () => {
  const plan = planPantryCheckout(
    [listItem({ id: "l1", ingredientId: "id:flour", quantity: "500", unit: "g" })],
    [pantryItem({ id: "p1", ingredientId: "id:flour", quantity: "1", unit: "kg" })],
  );

  assert.equal(plan.merges[0]?.quantity, "1.5");
  assert.equal(plan.merges[0]?.unit, "kg");
});

test("planPantryCheckout adds a new row when the units cannot be combined", () => {
  const bought = listItem({ id: "l1", ingredientId: "id:milk", quantity: "1", unit: "l" });
  const plan = planPantryCheckout(
    [bought],
    [pantryItem({ id: "p1", ingredientId: "id:milk", quantity: "200", unit: "g" })],
  );

  assert.deepEqual(plan.merges, []);
  assert.deepEqual(plan.inserts, [bought]);
});

test("planPantryCheckout marks an availability item as in stock without tracking amounts", () => {
  const plan = planPantryCheckout(
    [listItem({ id: "l1", ingredientId: "id:salt", quantity: "1", unit: "kg" })],
    [pantryItem({ id: "p1", ingredientId: "id:salt", trackingMode: "availability", inStock: false })],
  );

  assert.deepEqual(plan.merges, [
    { pantryItemId: "p1", quantity: null, unit: null, inStock: true, shoppingListItemIds: ["l1"] },
  ]);
});

test("planPantryCheckout fills in the amount when the pantry item had none", () => {
  const plan = planPantryCheckout(
    [listItem({ id: "l1", ingredientId: "id:eggs", quantity: "10", unit: "ks" })],
    [pantryItem({ id: "p1", ingredientId: "id:eggs", quantity: null, unit: null })],
  );

  assert.equal(plan.merges[0]?.quantity, "10");
  assert.equal(plan.merges[0]?.unit, "ks");
});

test("planPantryCheckout keeps the pantry amount when the bought item has no amount", () => {
  const plan = planPantryCheckout(
    [listItem({ id: "l1", ingredientId: "id:milk" })],
    [pantryItem({ id: "p1", ingredientId: "id:milk", quantity: "1", unit: "l" })],
  );

  assert.deepEqual(plan.inserts, []);
  assert.equal(plan.merges[0]?.quantity, "1");
});

test("planPantryCheckout accumulates several bought items into one pantry update", () => {
  const plan = planPantryCheckout(
    [
      listItem({ id: "l1", ingredientId: "id:milk", quantity: "1", unit: "l" }),
      listItem({ id: "l2", ingredientId: "id:milk", quantity: "500", unit: "ml" }),
    ],
    [pantryItem({ id: "p1", ingredientId: "id:milk", quantity: "1", unit: "l" })],
  );

  assert.equal(plan.merges.length, 1);
  assert.equal(plan.merges[0]?.quantity, "2.5");
  assert.deepEqual(plan.merges[0]?.shoppingListItemIds, ["l1", "l2"]);
});

test("planPantryCheckout inserts items that have no pantry match", () => {
  const bought = listItem({ id: "l1", ...vegetableOil, quantity: "1", unit: "l" });
  const plan = planPantryCheckout(
    [bought],
    [pantryItem({ id: "p1", ...oliveOil, quantity: "0.5", unit: "l" })],
  );

  assert.deepEqual(plan.merges, []);
  assert.deepEqual(plan.inserts, [bought]);
});

test("planPantryCheckout tops up the matching pantry row whose unit fits", () => {
  const plan = planPantryCheckout(
    [listItem({ id: "l1", ingredientId: "id:milk", quantity: "1", unit: "l" })],
    [
      pantryItem({ id: "p-grams", ingredientId: "id:milk", quantity: "200", unit: "g" }),
      pantryItem({ id: "p-litres", ingredientId: "id:milk", quantity: "1", unit: "l" }),
    ],
  );

  assert.deepEqual(plan.merges.map((merge) => merge.pantryItemId), ["p-litres"]);
});

test("planPantryCheckout matches an unlinked item by name", () => {
  const plan = planPantryCheckout(
    [listItem({ id: "l1", name: "Chlieb", quantity: "1", unit: "ks" })],
    [pantryItem({ id: "p1", name: "chlieb", quantity: "1", unit: "ks" })],
  );

  assert.equal(plan.merges[0]?.quantity, "2");
});

test("planPantryCheckout returns the original list item objects for inserts", () => {
  const bought = { ...listItem({ id: "l1", name: "rožky" }), category: "bakery" };
  const plan = planPantryCheckout([bought], []);

  assert.equal(plan.inserts[0], bought);
  assert.equal(plan.inserts[0]?.category, "bakery");
});

test("addQuantities converts between litres and millilitres", () => {
  assert.deepEqual(
    addQuantities({ quantity: 1, unit: "l" }, { quantity: 500, unit: "ml" }),
    { quantity: 1.5, unit: "l" },
  );
  assert.deepEqual(
    addQuantities({ quantity: 250, unit: "ml" }, { quantity: 1, unit: "liter" }),
    { quantity: 1250, unit: "ml" },
  );
});
