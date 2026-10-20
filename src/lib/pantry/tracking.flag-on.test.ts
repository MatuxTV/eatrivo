import test from "node:test";
import assert from "node:assert/strict";

// The feature flag is evaluated once, when ./tracking first imports
// @/lib/config/features. Each test sets the env var BEFORE the dynamic import,
// so this file must not statically import ./tracking or the features module.

const chickenBreast = {
  name: "Chicken breast",
  trackingMode: "quantity" as const,
  quantity: 500,
  unit: "g",
};

function enableQuantityTracking() {
  process.env.NEXT_PUBLIC_PANTRY_QUANTITY_TRACKING = "true";
}

test("effectiveTrackingMode keeps stored modes when flag is on", async () => {
  enableQuantityTracking();
  const { effectiveTrackingMode } = await import("./tracking");

  assert.equal(effectiveTrackingMode("availability"), "availability");
  assert.equal(effectiveTrackingMode("quantity"), "quantity");
  assert.equal(effectiveTrackingMode(null), "quantity");
});

test("resolveEffectiveTrackingMode matches resolvePantryTrackingMode when flag is on", async () => {
  enableQuantityTracking();
  const { resolveEffectiveTrackingMode, resolvePantryTrackingMode } =
    await import("./tracking");

  assert.equal(
    resolveEffectiveTrackingMode(chickenBreast),
    resolvePantryTrackingMode(chickenBreast),
  );
});

test("shouldPreserveEffectiveQuantity keeps explicit amounts when flag is on", async () => {
  enableQuantityTracking();
  const { shouldPreserveEffectiveQuantity } = await import("./tracking");

  assert.equal(shouldPreserveEffectiveQuantity(chickenBreast), true);
});

test("supportsEffectiveQuantityMutations allows amount mutations when flag is on", async () => {
  enableQuantityTracking();
  const { supportsEffectiveQuantityMutations } = await import("./tracking");

  assert.equal(supportsEffectiveQuantityMutations(chickenBreast), true);
});
