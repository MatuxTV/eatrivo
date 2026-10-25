import test from "node:test";
import assert from "node:assert/strict";

import { getRecipeVisual } from "./recipe-visuals";

test("getRecipeVisual returns the emoji and tint of a known category", () => {
  assert.deepEqual(getRecipeVisual("breakfast"), {
    emoji: "🍳",
    tint: "#FEF3C7",
  });
  assert.deepEqual(getRecipeVisual("lunch-and-dinner"), {
    emoji: "🍛",
    tint: "#FFEDD5",
  });
  assert.deepEqual(getRecipeVisual("pre-workout-fuel"), {
    emoji: "⚡",
    tint: "#DDF7EE",
  });
});

test("getRecipeVisual normalizes case, whitespace and underscores", () => {
  assert.deepEqual(getRecipeVisual("BREAKFAST"), getRecipeVisual("breakfast"));
  assert.deepEqual(getRecipeVisual("  Dessert  "), {
    emoji: "🍰",
    tint: "#FCE7F3",
  });
  assert.deepEqual(getRecipeVisual("lunch_and_dinner"), {
    emoji: "🍛",
    tint: "#FFEDD5",
  });
  assert.deepEqual(
    getRecipeVisual("post_workout_fuel"),
    getRecipeVisual("post-workout-fuel"),
  );
});

test("getRecipeVisual falls back for missing or unknown categories", () => {
  assert.deepEqual(getRecipeVisual(null), { emoji: "🍽️", tint: "#F6F0FF" });
  assert.deepEqual(getRecipeVisual(undefined), {
    emoji: "🍽️",
    tint: "#F6F0FF",
  });
  assert.deepEqual(getRecipeVisual(""), { emoji: "🍽️", tint: "#F6F0FF" });
  assert.deepEqual(getRecipeVisual("not-a-category"), {
    emoji: "🍽️",
    tint: "#F6F0FF",
  });
});
