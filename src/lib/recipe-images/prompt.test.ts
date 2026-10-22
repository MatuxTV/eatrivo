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
  assert.match(prompt, /Clearly visible: eggs, tomatoes, spinach, feta\./);
  assert.match(prompt, /No text, no labels, no logos/);
});

test("buildRecipeImagePrompt caps ingredients and adapts the serving to the category", () => {
  const prompt = buildRecipeImagePrompt({
    nameEn: "Berry smoothie",
    mainIngredients: ["a", "b", "c", "d", "e", "f", "g", "h"],
    categoryKey: "smoothies",
  });

  assert.match(prompt, /in a clear glass/);
  assert.match(prompt, /Clearly visible: a, b, c, d, e, f\./);
});

test("buildRecipeImagePrompt is deterministic", () => {
  const input = { nameEn: "Chicken curry", mainIngredients: ["chicken"], categoryKey: "dinner" };
  assert.equal(buildRecipeImagePrompt(input), buildRecipeImagePrompt(input));
});
