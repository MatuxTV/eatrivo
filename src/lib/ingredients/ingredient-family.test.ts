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

test("pantryKeySatisfiesRecipeKey accepts newly added families", () => {
  assert.equal(pantryKeySatisfiesRecipeKey("almond-butter", "butter"), true);
  assert.equal(pantryKeySatisfiesRecipeKey("salmon-fillet", "salmon"), true);
  assert.equal(pantryKeySatisfiesRecipeKey("green-asparagus", "asparagus"), true);
});