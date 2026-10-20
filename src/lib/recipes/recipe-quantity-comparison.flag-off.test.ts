import test from "node:test";
import assert from "node:assert/strict";

import { buildEffectivePantryComparison } from "./recipe-quantity-comparison";

test("buildEffectivePantryComparison treats a quantity row as an available staple when flag is off", () => {
  const comparison = buildEffectivePantryComparison(
    500,
    "g",
    [{ trackingMode: "quantity", inStock: true, quantity: 50, unit: "g" }],
    "en",
  );

  assert.equal(comparison.status, "available-staple");
  assert.equal(comparison.isEnough, true);
  assert.equal(comparison.requiredLabel, "500 g");
  assert.equal(comparison.availableLabel, null);
  assert.equal(comparison.missingLabel, null);
  assert.equal(comparison.matchingPantryItems, 1);
});

test("buildEffectivePantryComparison reports out-of-stock rows as unavailable when flag is off", () => {
  const comparison = buildEffectivePantryComparison(
    500,
    "g",
    [{ trackingMode: "quantity", inStock: false, quantity: 50, unit: "g" }],
    "en",
  );

  assert.equal(comparison.status, "unavailable");
  assert.equal(comparison.isEnough, null);
});

test("buildEffectivePantryComparison reports no candidates as unavailable when flag is off", () => {
  const comparison = buildEffectivePantryComparison(500, "g", [], "en");

  assert.equal(comparison.status, "unavailable");
});

test("buildEffectivePantryComparison never reports unit-mismatch when flag is off", () => {
  const comparison = buildEffectivePantryComparison(
    1,
    "cup",
    [{ trackingMode: "quantity", inStock: true, quantity: 50, unit: "g" }],
    "en",
  );

  assert.equal(comparison.status, "available-staple");
});

test("buildEffectivePantryComparison ignores missing recipe quantities when flag is off", () => {
  const comparison = buildEffectivePantryComparison(
    null,
    null,
    [{ trackingMode: "quantity", inStock: true, quantity: 1, unit: "pc" }],
    "en",
  );

  assert.equal(comparison.status, "available-staple");
  assert.equal(comparison.requiredLabel, null);
});
