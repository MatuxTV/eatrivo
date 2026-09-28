import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNormalizedAliases,
  overlayUserIngredients,
  resolvePantryIngredientIdentity,
  type IngredientAliasIndex,
} from "./ingredient-resolution-core";

function buildGlobalIndex(): IngredientAliasIndex {
  const row = (key: string, alias: string) => ({
    ingredientKey: key,
    locale: "sk",
    ingredientName: key,
    displayName: alias,
  });

  return {
    byAlias: new Map([
      ["maslo", [row("butter", "maslo")]],
      ["butter", [row("butter", "butter")]],
      ["mlieko", [row("milk", "mlieko")]],
    ]),
    validKeys: new Set(["butter", "milk"]),
    preferredNamesByKey: new Map([
      ["butter", "maslo"],
      ["milk", "mlieko"],
    ]),
    recipeCountByKey: new Map([
      ["butter", 5],
      ["milk", 3],
    ]),
  };
}

function snapshot(index: IngredientAliasIndex) {
  return {
    aliases: [...index.byAlias.entries()].map(([alias, rows]) => [alias, rows.length]),
    validKeys: [...index.validKeys],
    names: [...index.preferredNamesByKey.entries()],
  };
}

test("overlayUserIngredients returns the global index untouched when the user has no private rows", () => {
  const globalIndex = buildGlobalIndex();
  const overlay = overlayUserIngredients(globalIndex, {
    locale: "sk",
    privateRows: [],
    privateNameRows: [],
    privateAliasRows: [],
  });

  assert.equal(overlay.index, globalIndex);
  assert.equal(overlay.privateIdByKey.size, 0);
});

test("overlayUserIngredients makes a private ingredient resolvable by its aliases", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [{ id: "private:bread", key: "bread", canonicalName: "Bread" }],
    privateNameRows: [],
    privateAliasRows: [
      { locale: "sk", alias: "chlieb", key: "bread", canonicalName: "Bread" },
      { locale: "sk", alias: "chleba", key: "bread", canonicalName: "Bread" },
    ],
  });

  assert.equal(overlay.privateIdByKey.get("bread"), "private:bread");

  for (const name of ["Chlieb", "chleba"]) {
    const resolved = resolvePantryIngredientIdentity(name, "sk", overlay.index);
    assert.equal(resolved.ingredientSpecificKey, "bread", name);
    assert.equal(resolved.source, "translation-exact", name);
  }
});

test("overlayUserIngredients prefers the user's localized name over the canonical name", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [{ id: "private:bread", key: "bread", canonicalName: "Bread" }],
    privateNameRows: [
      { ingredientId: "private:bread", locale: "en", name: "Bread (en)" },
      { ingredientId: "private:bread", locale: "sk", name: "chlieb" },
    ],
    privateAliasRows: [],
  });

  assert.equal(overlay.index.preferredNamesByKey.get("bread"), "chlieb");
});

test("overlayUserIngredients falls back to the canonical name when no localized name exists", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [{ id: "private:bread", key: "bread", canonicalName: "Bread" }],
    privateNameRows: [{ ingredientId: "private:bread", locale: "en", name: "Bread (en)" }],
    privateAliasRows: [],
  });

  assert.equal(overlay.index.preferredNamesByKey.get("bread"), "Bread");
});

test("overlayUserIngredients lets global keys win over a private key with the same name", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [{ id: "private:butter", key: "butter", canonicalName: "My butter" }],
    privateNameRows: [{ ingredientId: "private:butter", locale: "sk", name: "moje maslo" }],
    privateAliasRows: [],
  });

  assert.equal(overlay.privateIdByKey.has("butter"), false);
  assert.equal(overlay.index.preferredNamesByKey.get("butter"), "maslo");
});

test("overlayUserIngredients resolves a learned alias to the global ingredient it was merged into", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [],
    privateNameRows: [],
    privateAliasRows: [
      { locale: "sk", alias: "maslicko", key: "butter", canonicalName: "Butter" },
    ],
  });

  const resolved = resolvePantryIngredientIdentity("Maslíčko", "sk", overlay.index);

  assert.equal(resolved.ingredientSpecificKey, "butter");
  assert.equal(resolved.ingredientName, "maslo");
  assert.equal(overlay.privateIdByKey.size, 0);
});

test("overlayUserIngredients does not duplicate an alias that already points to the same key", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [],
    privateNameRows: [],
    privateAliasRows: [{ locale: "sk", alias: "maslo", key: "butter", canonicalName: null }],
  });

  assert.equal(overlay.index.byAlias.get("maslo")?.length, 1);
});

test("overlayUserIngredients keeps the most-used global ingredient when a private alias is ambiguous", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [{ id: "private:ghee", key: "ghee", canonicalName: "Ghee" }],
    privateNameRows: [],
    privateAliasRows: [{ locale: "sk", alias: "maslo", key: "ghee", canonicalName: "Ghee" }],
  });

  assert.equal(overlay.index.byAlias.get("maslo")?.length, 2);
  assert.equal(
    resolvePantryIngredientIdentity("maslo", "sk", overlay.index).ingredientSpecificKey,
    "butter",
  );
});

test("overlayUserIngredients never mutates the shared global index", () => {
  const globalIndex = buildGlobalIndex();
  const before = snapshot(globalIndex);

  overlayUserIngredients(globalIndex, {
    locale: "sk",
    privateRows: [{ id: "private:bread", key: "bread", canonicalName: "Bread" }],
    privateNameRows: [{ ingredientId: "private:bread", locale: "sk", name: "chlieb" }],
    privateAliasRows: [
      { locale: "sk", alias: "chlieb", key: "bread", canonicalName: "Bread" },
      { locale: "sk", alias: "maslo", key: "bread", canonicalName: "Bread" },
    ],
  });

  assert.deepEqual(snapshot(globalIndex), before);
});

test("overlayUserIngredients ignores aliases that normalize to an empty string", () => {
  const overlay = overlayUserIngredients(buildGlobalIndex(), {
    locale: "sk",
    privateRows: [],
    privateNameRows: [],
    privateAliasRows: [{ locale: "sk", alias: "   ", key: "butter", canonicalName: null }],
  });

  assert.equal(overlay.index.byAlias.has(""), false);
});

// ── buildNormalizedAliases ──────────────────────────────────────────────────

test("buildNormalizedAliases lowercases, strips diacritics and deduplicates", () => {
  assert.deepEqual(buildNormalizedAliases(["Chlebík", "chlebik", "  CHLEBÍK "]), ["chlebik"]);
});

test("buildNormalizedAliases includes alias forms and drops empty names", () => {
  const aliases = buildNormalizedAliases(["Údený syr", "   "]);

  assert.ok(aliases.includes("udeny syr"));
  assert.ok(aliases.includes("udeny"));
  assert.ok(!aliases.includes(""));
});

test("overlayUserIngredients gives a classified private ingredient its stored family", () => {
  const globalIndex = buildGlobalIndex();
  globalIndex.familyKeyByKey = new Map([
    ["butter", "butter"],
    ["milk", "milk"],
  ]);

  const overlay = overlayUserIngredients(globalIndex, {
    locale: "sk",
    privateRows: [
      { id: "private:ghee", key: "ghee", canonicalName: "Ghee", parentKey: "butter" },
      { id: "private:bread", key: "bread", canonicalName: "Bread", parentKey: null },
    ],
    privateNameRows: [],
    privateAliasRows: [
      { locale: "sk", alias: "prepustene maslo", key: "ghee", canonicalName: "Ghee" },
      { locale: "sk", alias: "chlieb", key: "bread", canonicalName: "Bread" },
    ],
  });

  assert.equal(
    resolvePantryIngredientIdentity("prepustené maslo", "sk", overlay.index).ingredientKey,
    "butter",
  );
  assert.equal(
    resolvePantryIngredientIdentity("chlieb", "sk", overlay.index).ingredientKey,
    "bread",
  );
  assert.equal(globalIndex.familyKeyByKey.has("ghee"), false);
});
