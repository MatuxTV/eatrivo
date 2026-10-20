import test from "node:test";
import assert from "node:assert/strict";

import {
  effectiveTrackingMode,
  resolveEffectiveTrackingMode,
  shouldPreserveEffectiveQuantity,
  supportsEffectiveQuantityMutations,
} from "./tracking";

const chickenBreast = {
  name: "Chicken breast",
  trackingMode: "quantity" as const,
  quantity: 500,
  unit: "g",
};

test("effectiveTrackingMode normalizes every stored mode to availability when flag is off", () => {
  assert.equal(effectiveTrackingMode("quantity"), "availability");
  assert.equal(effectiveTrackingMode("availability"), "availability");
  assert.equal(effectiveTrackingMode(null), "availability");
  assert.equal(effectiveTrackingMode(undefined), "availability");
});

test("resolveEffectiveTrackingMode writes availability rows when flag is off", () => {
  assert.equal(resolveEffectiveTrackingMode(chickenBreast), "availability");
});

test("shouldPreserveEffectiveQuantity drops stored amounts when flag is off", () => {
  assert.equal(shouldPreserveEffectiveQuantity(chickenBreast), false);
});

test("supportsEffectiveQuantityMutations disables amount mutations when flag is off", () => {
  assert.equal(supportsEffectiveQuantityMutations(chickenBreast), false);
});
