import test from "node:test";
import assert from "node:assert/strict";

import { buildRecipeImagePrompt } from "./prompt";

test("buildRecipeImagePrompt uses the fixed top-down style and lists ingredients", () => {
  const prompt = buildRecipeImagePrompt({
    nameEn: "Spinach shakshuka with feta",
    mainIngredients: ["eggs", " tomatoes ", "", "spinach", "feta"],
    categoryKey: "breakfast",
  });

  assert.match(prompt, /^Top-down overhead photo of Spinach shakshuka with feta/);
  assert.match(prompt, /single plated breakfast serving/);
  assert.match(prompt, /made with eggs, tomatoes, spinach, feta; show only the cooked dish/);
  assert.match(prompt, /No text, no labels, no captions/);
});

test("buildRecipeImagePrompt caps ingredients and adapts the serving to the category", () => {
  const prompt = buildRecipeImagePrompt({
    nameEn: "Berry smoothie",
    mainIngredients: ["a", "b", "c", "d", "e", "f", "g", "h"],
    categoryKey: "smoothies",
  });

  assert.match(prompt, /in a clear glass/);
  assert.match(prompt, /made with a, b, c, d, e, f;/);
});

test("buildRecipeImagePrompt falls back to the finished dish without ingredients", () => {
  const prompt = buildRecipeImagePrompt({ nameEn: "Chicken curry", mainIngredients: [] });

  assert.match(prompt, /Show only the finished, cooked dish\./);
});

test("buildRecipeImagePrompt is deterministic", () => {
  const input = { nameEn: "Chicken curry", mainIngredients: ["chicken"], categoryKey: "dinner" };
  assert.equal(buildRecipeImagePrompt(input), buildRecipeImagePrompt(input));
});
