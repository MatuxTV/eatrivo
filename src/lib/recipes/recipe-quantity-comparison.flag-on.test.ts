import test from "node:test";
import assert from "node:assert/strict";

// The feature flag is evaluated once, when ./recipe-quantity-comparison first
// imports @/lib/config/features. Each test sets the env var BEFORE the dynamic
// import, so this file must not statically import the module under test.

function enableQuantityTracking() {
  process.env.NEXT_PUBLIC_PANTRY_QUANTITY_TRACKING = "true";
}

test("buildEffectivePantryComparison keeps the insufficient status when flag is on", async () => {
  enableQuantityTracking();
  const { buildEffectivePantryComparison } = await import(
    "./recipe-quantity-comparison"
  );

  const comparison = buildEffectivePantryComparison(
    500,
    "g",
    [{ trackingMode: "quantity", inStock: true, quantity: 50, unit: "g" }],
    "en",
  );

  assert.equal(comparison.status, "insufficient");
});

test("buildEffectivePantryComparison keeps the enough status when flag is on", async () => {
  enableQuantityTracking();
  const { buildEffectivePantryComparison } = await import(
    "./recipe-quantity-comparison"
  );

  const comparison = buildEffectivePantryComparison(
    500,
    "g",
    [{ trackingMode: "quantity", inStock: true, quantity: 600, unit: "g" }],
    "en",
  );

  assert.equal(comparison.status, "enough");
});
