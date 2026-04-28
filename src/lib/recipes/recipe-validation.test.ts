import assert from "node:assert/strict";
import test from "node:test";

import { validateCanonicalRecipeCollection } from "@/lib/recipes/recipe-validation";

test("validateCanonicalRecipeCollection reuses shared unit rules for canonical recipes", () => {
  const issues = validateCanonicalRecipeCollection({
    recipes: [
      {
        default_locale: "en",
        translations: {
          en: {
            name: "Chicken bowl",
            category_label: "Dinner",
            serving_unit_label: "servings",
            instructions: ["Cook and serve"],
            notes: null,
          },
        },
        ingredients: [
          {
            ingredient_key: "olive-oil",
            ingredient_specific_key: "olive-oil",
            canonical_name: "Olive oil",
            quantity: 2,
            unit: "ks",
            translations: {
              en: {
                display_name: "Olive oil",
              },
            },
          },
        ],
      },
    ],
  });

  assert.equal(issues.length, 1);
  assert.match(issues[0] ?? "", /Olive oil/);
  assert.match(issues[0] ?? "", /should use/);
});