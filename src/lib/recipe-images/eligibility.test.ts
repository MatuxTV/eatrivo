import test from "node:test";
import assert from "node:assert/strict";

import { isRecipeImageEligible } from "./eligibility";

const owner = (overrides: Partial<{ role: string; membership: string; subscriptionExpired: boolean }> = {}) => ({
  role: "user",
  membership: "basic",
  subscriptionExpired: false,
  ...overrides,
});

test("catalog recipes are always eligible", () => {
  assert.equal(isRecipeImageEligible({ source: "catalog", owner: null }), true);
  assert.equal(isRecipeImageEligible({ source: "catalog", owner: owner() }), true);
});

test("custom recipes of free users are not eligible", () => {
  assert.equal(isRecipeImageEligible({ source: "ai_custom", owner: owner() }), false);
});

test("custom recipes without a known owner are not eligible", () => {
  assert.equal(isRecipeImageEligible({ source: "ai_custom", owner: null }), false);
});

test("custom recipes of paid members are eligible", () => {
  for (const membership of ["premium", "pro", "trainer"]) {
    assert.equal(isRecipeImageEligible({ source: "ai_custom", owner: owner({ membership }) }), true);
  }
});

test("an expired paid subscription is not eligible", () => {
  assert.equal(
    isRecipeImageEligible({
      source: "ai_custom",
      owner: owner({ membership: "premium", subscriptionExpired: true }),
    }),
    false,
  );
});

test("admins are eligible regardless of membership", () => {
  assert.equal(
    isRecipeImageEligible({ source: "ai_custom", owner: owner({ role: "admin", membership: "basic" }) }),
    true,
  );
});
