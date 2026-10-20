import test from "node:test";
import assert from "node:assert/strict";

import type { derivePantryInventoryItem } from "./grocery";

// The feature flag is evaluated once, when ./grocery first imports
// @/lib/config/features. This test sets the env var BEFORE the dynamic import,
// so this file must not statically import ./grocery or the features module.

type PantryRow = Parameters<typeof derivePantryInventoryItem>[0];

function buildPantryRow(): PantryRow {
  const row = {
    id: "pantry-1",
    userProfileId: "user-1",
    name: "Chicken breast",
    ingredientName: "Chicken breast",
    ingredientKey: "chicken",
    ingredientSpecificKey: "chicken-breast",
    ingredientId: null,
    trackingMode: "quantity",
    inStock: true,
    quantity: "0",
    unit: "g",
    category: "protein",
    source: "manual",
    shoppingListId: null,
    expiryDate: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  } as unknown as PantryRow;

  return row;
}

test("derivePantryInventoryItem keeps quantity low-stock logic when flag is on", async () => {
  process.env.NEXT_PUBLIC_PANTRY_QUANTITY_TRACKING = "true";
  // grocery.ts -> ./restock creates the database client at import; no query is run in this test.
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  const { derivePantryInventoryItem } = await import("./grocery");

  const item = derivePantryInventoryItem(buildPantryRow(), [], [], null);

  assert.equal(item.trackingMode, "quantity");
  assert.equal(item.lowStock, true);
  assert.equal(item.lowStockReason, "out_of_stock");
});
