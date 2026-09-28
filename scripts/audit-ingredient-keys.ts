import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { eq } from "drizzle-orm";

import { db } from "../src/index";
import {
  pantryItems,
  pantryRestockItems,
  recipeIngredients,
  recipeIngredientTranslations,
  shoppingListItems,
} from "../src/db/schema";
import { pantryKeySatisfiesRecipeKey } from "../src/lib/ingredients/ingredient-family";

const OUTPUT_PATH = resolve("diagrams/pantry/ingredient-key-audit.json");

const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const LOCALIZED_JUNK_TOKENS = new Set([
  "maslo",
  "sol",
  "olej",
  "ryza",
  "syr",
  "mlieko",
  "chlieb",
  "cukor",
  "muka",
  "vajce",
  "vajcia",
  "kuracie",
  "bravcove",
  "hovadzie",
  "zemiak",
  "zemiaky",
  "paradajka",
  "paradajky",
  "cibula",
  "cesnak",
  "fazula",
  "fazulka",
  "strukovina",
  "olivovy",
  "slnecnicovy",
  "repkovy",
]);

function detectJunkReason(key: string): string | null {
  if (!KEBAB_PATTERN.test(key)) {
    return "not-kebab-case";
  }

  if (/\d/.test(key)) {
    return "contains-digit";
  }

  for (const token of key.split("-")) {
    if (LOCALIZED_JUNK_TOKENS.has(token)) {
      return `contains-localized-token:${token}`;
    }
  }

  return null;
}

interface KeyAggregate {
  specificKey: string;
  familyKeys: Set<string>;
  recipeIds: Set<string>;
  canonicalNames: Set<string>;
  displayNames: Record<string, Set<string>>;
  junkReasons: Set<string>;
}

interface InvalidHierarchy {
  recipeId: string;
  ingredientKey: string;
  ingredientSpecificKey: string;
}

async function main() {
  const rows = await db
    .select({
      recipeId: recipeIngredients.recipeId,
      ingredientKey: recipeIngredients.ingredientKey,
      ingredientSpecificKey: recipeIngredients.ingredientSpecificKey,
      canonicalName: recipeIngredients.canonicalName,
      locale: recipeIngredientTranslations.locale,
      displayName: recipeIngredientTranslations.displayName,
    })
    .from(recipeIngredients)
    .innerJoin(
      recipeIngredientTranslations,
      eq(
        recipeIngredientTranslations.recipeIngredientId,
        recipeIngredients.id,
      ),
    );

  const aggregates = new Map<string, KeyAggregate>();
  const invalidHierarchy: InvalidHierarchy[] = [];
  let rowsWithKey = 0;
  let rowsWithoutKey = 0;

  for (const row of rows) {
    const specificKey = row.ingredientSpecificKey ?? row.ingredientKey;

    if (!specificKey) {
      rowsWithoutKey += 1;
      continue;
    }

    rowsWithKey += 1;

    if (
      row.ingredientKey &&
      row.ingredientSpecificKey &&
      !pantryKeySatisfiesRecipeKey(
        row.ingredientSpecificKey,
        row.ingredientKey,
      )
    ) {
      invalidHierarchy.push({
        recipeId: row.recipeId,
        ingredientKey: row.ingredientKey,
        ingredientSpecificKey: row.ingredientSpecificKey,
      });
    }

    const aggregate = aggregates.get(specificKey) ?? {
      specificKey,
      familyKeys: new Set<string>(),
      recipeIds: new Set<string>(),
      canonicalNames: new Set<string>(),
      displayNames: {},
      junkReasons: new Set<string>(),
    };

    if (row.ingredientKey) {
      aggregate.familyKeys.add(row.ingredientKey);
    }

    aggregate.recipeIds.add(row.recipeId);

    if (row.canonicalName) {
      aggregate.canonicalNames.add(row.canonicalName);
    }

    if (row.displayName) {
      const localeNames =
        aggregate.displayNames[row.locale] ?? new Set<string>();
      localeNames.add(row.displayName);
      aggregate.displayNames[row.locale] = localeNames;
    }

    const junkReason = detectJunkReason(specificKey);
    if (junkReason) {
      aggregate.junkReasons.add(junkReason);
    }

    aggregates.set(specificKey, aggregate);
  }

  const keys = [...aggregates.values()]
    .map((aggregate) => ({
      specificKey: aggregate.specificKey,
      familyKeys: [...aggregate.familyKeys],
      recipeCount: aggregate.recipeIds.size,
      canonicalNames: [...aggregate.canonicalNames],
      displayNames: Object.fromEntries(
        Object.entries(aggregate.displayNames).map(([locale, names]) => [
          locale,
          [...names],
        ]),
      ),
      junkReasons: [...aggregate.junkReasons],
    }))
    .sort((a, b) => {
      if (b.recipeCount !== a.recipeCount) {
        return b.recipeCount - a.recipeCount;
      }
      return a.specificKey.localeCompare(b.specificKey);
    });

  const junkKeys = keys.filter((key) => key.junkReasons.length > 0);
  const divergentCanonicalNames = keys.filter(
    (key) => key.canonicalNames.length > 1,
  );
  const missingLocalizedNames = keys.filter(
    (key) => !key.displayNames.sk || key.displayNames.sk.length === 0,
  );

  const junkKeySet = new Set(junkKeys.map((key) => key.specificKey));

  function countImpact(
    rowsToCheck: {
      ingredientKey: string | null;
      ingredientSpecificKey: string | null;
    }[],
  ): number {
    return rowsToCheck.filter(
      (row) =>
        (row.ingredientSpecificKey &&
          junkKeySet.has(row.ingredientSpecificKey)) ||
        (row.ingredientKey && junkKeySet.has(row.ingredientKey)),
    ).length;
  }

  const [pantryKeyRows, shoppingKeyRows, restockKeyRows] = await Promise.all([
    db
      .select({
        ingredientKey: pantryItems.ingredientKey,
        ingredientSpecificKey: pantryItems.ingredientSpecificKey,
      })
      .from(pantryItems),
    db
      .select({
        ingredientKey: shoppingListItems.ingredientKey,
        ingredientSpecificKey: shoppingListItems.ingredientSpecificKey,
      })
      .from(shoppingListItems),
    db
      .select({
        ingredientKey: pantryRestockItems.ingredientKey,
        ingredientSpecificKey: pantryRestockItems.ingredientSpecificKey,
      })
      .from(pantryRestockItems),
  ]);

  const junkKeyImpacts = {
    pantryItems: countImpact(pantryKeyRows),
    shoppingListItems: countImpact(shoppingKeyRows),
    pantryRestockItems: countImpact(restockKeyRows),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      translationRows: rows.length,
      rowsWithKey,
      rowsWithoutKey,
      distinctSpecificKeys: keys.length,
      junkKeyCount: junkKeys.length,
      divergentCanonicalNameCount: divergentCanonicalNames.length,
      invalidHierarchyCount: invalidHierarchy.length,
      missingSlovakNameCount: missingLocalizedNames.length,
      junkKeyImpacts,
    },
    junkKeys,
    divergentCanonicalNames,
    invalidHierarchy,
    missingLocalizedNames: missingLocalizedNames.map((key) => ({
      specificKey: key.specificKey,
      canonicalNames: key.canonicalNames,
    })),
    keys,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`\nFull report written to ${OUTPUT_PATH}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
