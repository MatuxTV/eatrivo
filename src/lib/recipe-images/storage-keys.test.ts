import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRecipeImageKey,
  getRecipeImageUrl,
} from "./storage-keys";

test("buildRecipeImageKey builds full and thumb keys", () => {
  assert.equal(
    buildRecipeImageKey("r1", "i1", "full"),
    "recipes/r1/i1.webp",
  );
  assert.equal(
    buildRecipeImageKey("r1", "i1", "thumb"),
    "recipes/r1/i1_512.webp",
  );
});

test("getRecipeImageUrl returns null when the key or base url is missing", () => {
  assert.equal(getRecipeImageUrl(null, "full", "https://cdn.example.com"), null);
  assert.equal(getRecipeImageUrl("recipes/r1/i1.webp", "full", null), null);
  assert.equal(getRecipeImageUrl(undefined, "thumb", ""), null);
});

test("getRecipeImageUrl joins the base url and strips trailing slashes", () => {
  assert.equal(
    getRecipeImageUrl("recipes/r1/i1.webp", "full", "https://cdn.example.com/"),
    "https://cdn.example.com/recipes/r1/i1.webp",
  );
  assert.equal(
    getRecipeImageUrl("recipes/r1/i1.webp", "full", "https://cdn.example.com///"),
    "https://cdn.example.com/recipes/r1/i1.webp",
  );
});

test("getRecipeImageUrl converts full keys to thumb keys and is idempotent", () => {
  assert.equal(
    getRecipeImageUrl("recipes/r1/i1.webp", "thumb", "https://cdn.example.com"),
    "https://cdn.example.com/recipes/r1/i1_512.webp",
  );
  assert.equal(
    getRecipeImageUrl("recipes/r1/i1_512.webp", "thumb", "https://cdn.example.com"),
    "https://cdn.example.com/recipes/r1/i1_512.webp",
  );
});

test("getRecipeImageUrl keeps non-webp legacy keys as-is for both sizes", () => {
  assert.equal(
    getRecipeImageUrl("legacy/photo.jpg", "full", "https://cdn.example.com"),
    "https://cdn.example.com/legacy/photo.jpg",
  );
  assert.equal(
    getRecipeImageUrl("legacy/photo.jpg", "thumb", "https://cdn.example.com"),
    "https://cdn.example.com/legacy/photo.jpg",
  );
});
