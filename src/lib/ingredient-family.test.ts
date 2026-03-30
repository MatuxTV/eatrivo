import test from "node:test";
import assert from "node:assert/strict";

import { pantryKeySatisfiesRecipeKey } from "./ingredient-family";

test("pantryKeySatisfiesRecipeKey accepts basil variants for generic recipe keys", () => {
  assert.equal(pantryKeySatisfiesRecipeKey("dried-basil", "basil"), true);
});

test("pantryKeySatisfiesRecipeKey accepts pepper variants for generic recipe keys", () => {
  assert.equal(pantryKeySatisfiesRecipeKey("black-pepper", "pepper"), true);
});

test("pantryKeySatisfiesRecipeKey still accepts established generic ingredient families", () => {
  assert.equal(pantryKeySatisfiesRecipeKey("mozzarella-cheese", "cheese"), true);
  assert.equal(pantryKeySatisfiesRecipeKey("olive-oil", "oil"), true);
});