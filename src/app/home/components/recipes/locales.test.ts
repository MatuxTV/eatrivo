import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const LOCALES = ["sk", "en"] as const;

type LocaleName = (typeof LOCALES)[number];

function loadLocale(locale: LocaleName): Record<string, unknown> {
  const filePath = path.join(process.cwd(), "locales", `${locale}.json`);
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function getPath(source: Record<string, unknown>, dotted: string): unknown {
  return dotted
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current !== null && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      source,
    );
}

const RECIPE_CARD_KEYS = [
  "proteinShort",
  "missing",
  "more",
  "haveAll",
  "bookmark",
  "unbookmark",
  "tipBadge",
] as const;

const REMOVED_KEYS = [
  "home.basic.pantryDashboard",
  "home.basic.cookableEmpty",
  "home.basic.almostCookable",
] as const;

for (const locale of LOCALES) {
  const data = loadLocale(locale);

  test(`[${locale}] home.basic.allRecipes.title is a non-empty string`, () => {
    const value = getPath(data, "home.basic.allRecipes.title");
    assert.equal(typeof value, "string");
    assert.ok((value as string).length > 0);
  });

  for (const key of RECIPE_CARD_KEYS) {
    test(`[${locale}] home.basic.recipeCard.${key} is a non-empty string`, () => {
      const value = getPath(data, `home.basic.recipeCard.${key}`);
      assert.equal(typeof value, "string", `expected a string for ${key}`);
      assert.ok((value as string).length > 0, `expected a non-empty string for ${key}`);
    });
  }

  for (const key of REMOVED_KEYS) {
    test(`[${locale}] ${key} is undefined`, () => {
      assert.equal(getPath(data, key), undefined, `expected ${key} to be removed`);
    });
  }

  test(`[${locale}] home.basic.customRecipe.result.almostCookable still exists`, () => {
    const value = getPath(data, "home.basic.customRecipe.result.almostCookable");
    assert.equal(typeof value, "string");
    assert.ok((value as string).length > 0);
  });
}

test("[sk] recipeCard.more has one/few/other plural forms", () => {
  const value = getPath(loadLocale("sk"), "home.basic.recipeCard.more") as string;
  assert.ok(value.includes("one {"), "expected a one plural form");
  assert.ok(value.includes("few {"), "expected a few plural form");
  assert.ok(value.includes("other {"), "expected an other plural form");
});

test("[sk] recipeCard.missing interpolates {items}", () => {
  const value = getPath(loadLocale("sk"), "home.basic.recipeCard.missing") as string;
  assert.ok(value.includes("{items}"), "expected an {items} placeholder");
});
