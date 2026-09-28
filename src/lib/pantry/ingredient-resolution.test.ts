import test from "node:test";
import assert from "node:assert/strict";

import {
  resolvePantryIngredientIdentity,
  type IngredientAliasIndex,
} from "./ingredient-resolution-core";

function buildIndex(input: {
  aliases: Record<string, string[]>;
  recipeCountByKey: Record<string, number>;
  preferredNamesByKey?: Record<string, string>;
}): IngredientAliasIndex {
  const byAlias = new Map<
    string,
    { ingredientKey: string; locale: string; ingredientName: string | null; displayName: string }[]
  >();

  for (const [alias, keys] of Object.entries(input.aliases)) {
    byAlias.set(
      alias,
      keys.map((key) => ({
        ingredientKey: key,
        locale: "sk",
        ingredientName: key,
        displayName: key,
      })),
    );
  }

  const validKeys = new Set<string>();
  for (const keys of Object.values(input.aliases)) {
    for (const key of keys) {
      validKeys.add(key);
    }
  }

  return {
    byAlias,
    validKeys,
    preferredNamesByKey: new Map(
      Object.entries(input.preferredNamesByKey ?? {}),
    ),
    recipeCountByKey: new Map(Object.entries(input.recipeCountByKey)),
  };
}

test("resolvePantryIngredientIdentity picks the most-used candidate when ambiguous", () => {
  const index = buildIndex({
    aliases: { maslo: ["butter", "50g-maslo"] },
    recipeCountByKey: { butter: 5, "50g-maslo": 1 },
    preferredNamesByKey: { butter: "Maslo" },
  });

  const resolved = resolvePantryIngredientIdentity("Maslo", "sk", index);

  assert.equal(resolved.ingredientSpecificKey, "butter");
  assert.equal(resolved.ingredientName, "Maslo");
});

test("resolvePantryIngredientIdentity resolves a single candidate exactly", () => {
  const index = buildIndex({
    aliases: { mlieko: ["milk"], milk: ["milk"] },
    recipeCountByKey: { milk: 3 },
    preferredNamesByKey: { milk: "Mlieko" },
  });

  const resolved = resolvePantryIngredientIdentity("Mlieko", "sk", index);

  assert.equal(resolved.ingredientSpecificKey, "milk");
  assert.equal(resolved.source, "translation-exact");
});

test("resolvePantryIngredientIdentity returns null keys for unknown items", () => {
  const index = buildIndex({
    aliases: {},
    recipeCountByKey: {},
  });

  const resolved = resolvePantryIngredientIdentity("Chlieb", "sk", index);

  assert.equal(resolved.ingredientSpecificKey, null);
  assert.equal(resolved.ingredientKey, null);
  assert.equal(resolved.source, "fallback");
});

test("resolvePantryIngredientIdentity picks the most-used candidate when the slug has no exact match", () => {
  const index = buildIndex({
    aliases: { "biely jogurt": ["yogurt", "natural-yogurt"] },
    recipeCountByKey: { yogurt: 6, "natural-yogurt": 2 },
    preferredNamesByKey: { yogurt: "Jogurt" },
  });

  const resolved = resolvePantryIngredientIdentity("Biely jogurt", "sk", index);

  assert.equal(resolved.ingredientSpecificKey, "yogurt");
});

test("resolvePantryIngredientIdentity uses the catalog's stored family over one guessed from the key", () => {
  const index = buildIndex({
    aliases: { "olej zo susenych paradajok": ["sun-dried-tomato-oil"] },
    recipeCountByKey: { "sun-dried-tomato-oil": 1 },
  });
  index.validKeys.add("oil");
  index.familyKeyByKey = new Map([
    ["sun-dried-tomato-oil", "oil"],
    ["oil", "oil"],
  ]);

  const resolved = resolvePantryIngredientIdentity("olej zo sušených paradajok", "sk", index);

  assert.equal(resolved.ingredientSpecificKey, "sun-dried-tomato-oil");
  assert.equal(resolved.ingredientKey, "oil");
});

test("resolvePantryIngredientIdentity keeps a stored family even when the key's wording suggests another", () => {
  const index = buildIndex({
    aliases: { "udeny syr": ["zz-smoked-cheese"] },
    recipeCountByKey: { "zz-smoked-cheese": 1 },
  });
  index.validKeys.add("cheese");
  index.validKeys.add("zz-cheese");
  index.familyKeyByKey = new Map([["zz-smoked-cheese", "zz-cheese"]]);

  assert.equal(
    resolvePantryIngredientIdentity("údený syr", "sk", index).ingredientKey,
    "zz-cheese",
  );
});

test("resolvePantryIngredientIdentity treats a stored root as its own family", () => {
  const index = buildIndex({
    aliases: { mlieko: ["milk"] },
    recipeCountByKey: { milk: 4 },
  });
  index.familyKeyByKey = new Map([["milk", "milk"]]);

  assert.equal(resolvePantryIngredientIdentity("Mlieko", "sk", index).ingredientKey, "milk");
});

test("resolvePantryIngredientIdentity still guesses the family when the catalog has none", () => {
  const index = buildIndex({
    aliases: { "olivovy olej": ["olive-oil"] },
    recipeCountByKey: { "olive-oil": 3 },
  });
  index.validKeys.add("oil");

  assert.equal(
    resolvePantryIngredientIdentity("olivový olej", "sk", index).ingredientKey,
    "oil",
  );
});
