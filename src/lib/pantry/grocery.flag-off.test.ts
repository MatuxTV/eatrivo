import test from "node:test";
import assert from "node:assert/strict";

import type { derivePantryInventoryItem } from "./grocery";

// grocery.ts -> ./restock creates the database client when it is imported. This test never runs a
// query, so a dummy URL is enough; it is set before the dynamic import because `npm test` loads no .env.
async function loadGrocery() {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  return import("./grocery");
}

type PantryRow = Parameters<typeof derivePantryInventoryItem>[0];

function buildPantryRow(overrides: {
  trackingMode: "quantity" | "availability";
  inStock: boolean;
  quantity: string | null;
  unit: string | null;
}): PantryRow {
  const row = {
    id: "pantry-1",
    userProfileId: "user-1",
    name: "Chicken breast",
    ingredientName: "Chicken breast",
    ingredientKey: "chicken",
    ingredientSpecificKey: "chicken-breast",
    ingredientId: null,
    category: "protein",
    source: "manual",
    shoppingListId: null,
    expiryDate: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  } as unknown as PantryRow;

  return row;
}

test("derivePantryInventoryItem ignores stored amounts for a quantity row when flag is off", async () => {
  const { derivePantryInventoryItem } = await loadGrocery();
  const item = derivePantryInventoryItem(
    buildPantryRow({
      trackingMode: "quantity",
      inStock: true,
      quantity: "0",
      unit: "g",
    }),
    [],
    [],
    null,
  );

  assert.equal(item.trackingMode, "availability");
  assert.equal(item.lowStock, false);
  assert.equal(item.lowStockReason, null);
});

test("derivePantryInventoryItem reports an out-of-stock quantity row when flag is off", async () => {
  const { derivePantryInventoryItem } = await loadGrocery();
  const item = derivePantryInventoryItem(
    buildPantryRow({
      trackingMode: "quantity",
      inStock: false,
      quantity: "500",
      unit: "g",
    }),
    [],
    [],
    null,
  );

  assert.equal(item.lowStock, true);
  assert.equal(item.lowStockReason, "out_of_stock");
});

test("derivePantryInventoryItem never stamps availability rows when flag is off", async () => {
  const { derivePantryInventoryItem } = await loadGrocery();
  const item = derivePantryInventoryItem(
    buildPantryRow({
      trackingMode: "availability",
      inStock: true,
      quantity: null,
      unit: null,
    }),
    [],
    [],
    null,
  );

  assert.equal(item.lowStock, false);
  assert.equal(item.isStamped, false);
  assert.equal(item.supportsRestockPackage, false);
});
